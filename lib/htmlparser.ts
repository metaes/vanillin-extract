import {
  SELF_CLOSE_PART,
  selfClosingTags,
  freeTextContentNodes,
  CLOSE_TAG_START,
  IDENTIFIER_REGEX,
  COMMENT_END,
  COMMENT_START,
  Node,
  HTMLElement,
  Window
} from "./dom-extract";

class HTMLParseError extends Error {
  static MAX_LOCATION_LENGTH = 20;

  static overflowText(input: string) {
    return input.length > this.MAX_LOCATION_LENGTH ? input.slice(0, this.MAX_LOCATION_LENGTH) + "..." : input;
  }
  constructor(message: string, location?: string) {
    super(message + (location ? ` (Near "${HTMLParseError.overflowText(location)}")` : ""));
  }
}

function prebuiltElement(htmlElement: HTMLElement, attributes: Attr[], nodes?: Node[]) {
  for (let i = 0; i < attributes.length; i++) {
    htmlElement.setAttribute(attributes[i].name, attributes[i].value);
  }
  if (nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const element = nodes[i];
      htmlElement.appendChild(element);
    }
  }
  return htmlElement;
}

export function parse(input: string, window: Window) {
  const { document } = window;

  function parseElement(input: string) {
    if (input[0] === "<") {
      const [nodeName, afterIdent] = parseIdentifier(input.slice(1));
      let restTrimmed = afterIdent.trimLeft();
      const attributes: any[] = [];

      while (restTrimmed.length) {
        if (restTrimmed[0] === ">") {
          break;
        }
        if (restTrimmed.startsWith(SELF_CLOSE_PART)) {
          return <const>[
            prebuiltElement(document.createElement(nodeName), attributes),
            restTrimmed.slice(SELF_CLOSE_PART.length)
          ];
        }
        const [attribute, afterAttribute] = parseAttribute(restTrimmed);
        restTrimmed = afterAttribute.trimLeft();
        attributes.push(attribute);
      }

      restTrimmed = restTrimmed.slice(1); // skip `>` char

      const lowerCaseNodeName = nodeName.toLowerCase();
      if (selfClosingTags.includes(lowerCaseNodeName)) {
        return <const>[prebuiltElement(document.createElement(nodeName), attributes), restTrimmed];
      }

      if (freeTextContentNodes.includes(lowerCaseNodeName)) {
        let r = eatUntilTagClose(restTrimmed, lowerCaseNodeName);
        if (r) {
          const [start, length] = r;

          return <const>[
            prebuiltElement(document.createElement(nodeName), attributes, [
              document.createTextNode(restTrimmed.substring(0, start))
            ]),
            restTrimmed.slice(start + length)
          ];
        }
      }

      const [childNodes, afterTextContent] = parseAdjacentNodesList(restTrimmed);
      restTrimmed = afterTextContent;

      let closeTagLength;
      while (restTrimmed.length > 0) {
        closeTagLength = getTagCloseLength(restTrimmed, nodeName);
        if (closeTagLength >= 0) {
          return <const>[
            prebuiltElement(document.createElement(nodeName), attributes, childNodes),
            restTrimmed.slice(closeTagLength)
          ];
        }
        const [child, afterChild] = parseElement(restTrimmed);
        childNodes.push(child);

        restTrimmed = afterChild.trimLeft();
        const [textNode, afterTextContent] = parseTextContent(restTrimmed);
        restTrimmed = afterTextContent;
        if (textNode) {
          childNodes.push(textNode);
        }
      }
    } else {
      throw new HTMLParseError("Expected '<'", input);
    }
  }

  function eatUntilTagClose(input, nodeName) {
    let i = 0,
      closeTagLength;
    do {
      closeTagLength = getTagCloseLength(input.slice(i), nodeName);
      if (input[i] === "<" && closeTagLength >= 0) {
        return <const>[
          // close tag start
          i,
          closeTagLength
        ];
      }
    } while (i++ < input.length);
  }

  function getTagCloseLength(input: string, nodeName: string) {
    const part = CLOSE_TAG_START + nodeName;
    if (!input.startsWith(part)) {
      return -1;
    }
    let i = part.length - 1;
    while (i++ < input.length) {
      if (input[i] === ">") {
        return i + 1;
      }
    }
    return -1;
  }

  function parseTextContent(input: string) {
    let i = 0;
    while (input[i] !== "<" && i < input.length) {
      i++;
    }
    const textContent = input.slice(0, i);
    return <const>[document.createTextNode(textContent), input.slice(i)];
  }

  function parseAttribute(input: string) {
    const [attrName, afterName] = parseIdentifier(input.trimLeft());
    if (afterName.trimLeft()[0] === "=") {
      const [attrValue, afterValue] = parseAttributeValue(afterName.slice(1));
      const attr = document.createAttribute(attrName);
      attr.value = attrValue;
      return <const>[attr, afterValue];
    } else {
      const attr = document.createAttribute(attrName);
      return <const>[attr, afterName];
    }
  }

  function parseAttributeValue(input: string) {
    let trimmed = input.trimLeft();
    if (trimmed[0] === '"') {
      let i = 1;
      while (trimmed[i] !== '"' && i < trimmed.length) {
        i++;
      }
      return [trimmed.slice(1, i), trimmed.substring(i + 1)];
    } else {
      throw new HTMLParseError(`Expected "`, input);
    }
  }

  function parseIdentifier(input: string) {
    let match;
    if ((match = input.match(IDENTIFIER_REGEX))) {
      return <const>[match[0] as string, input.slice(match[0].length)];
    } else {
      throw new HTMLParseError("Expected Identifier", input);
    }
  }

  function parseComment(input: string) {
    const commentEndStart = input.indexOf(COMMENT_END);
    if (commentEndStart === -1) {
      throw new HTMLParseError("Couldn't find comment end", input);
    } else {
      return <const>[
        document.createComment(input.slice(COMMENT_START.length, commentEndStart)),
        input.slice(commentEndStart + COMMENT_END.length)
      ];
    }
  }

  function parseAdjacentNodesList(input: string) {
    const nodes: Node[] = [];
    let remainingInput = input;

    while (remainingInput) {
      let inputTrimmed = remainingInput.trimLeft();
      if (inputTrimmed.startsWith(COMMENT_START)) {
        let [comment, after] = parseComment(inputTrimmed);
        nodes.push(comment);
        remainingInput = after;
      } else if (inputTrimmed.startsWith("<")) {
        if (inputTrimmed.startsWith(CLOSE_TAG_START)) {
          return <const>[nodes, inputTrimmed];
        } else {
          let [element, after] = parseElement(inputTrimmed);
          nodes.push(element);
          remainingInput = after;
        }
      } else {
        const [text, after] = parseTextContent(remainingInput);
        nodes.push(text);
        remainingInput = after;
      }
    }
    return <const>[nodes, remainingInput];
  }
  return parseAdjacentNodesList(input)[0];
}
