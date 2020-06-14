import { parse as parseHTML } from "./htmlparser";

export const IDENTIFIER_REGEX = /^[A-Z\_\-a-z0-9]+/g;
export const SELF_CLOSE_PART = "/>";
export const COMMENT_START = `<!--`;
export const COMMENT_END = `-->`;
export const CLOSE_TAG_START = `</`;

export const freeTextContentNodes = ["script", "style", "code", "template"];
export const selfClosingTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
];

class DOMException extends Error {}

export class NamedNodeMap {
  constructor(private _attributes: Attr[]) {}

  getNamedItem(qualifiedName: string): Attr | undefined {
    return this._attributes.find((attr) => attr.name === qualifiedName);
  }

  removeNamedItem(qualifiedName: string) {
    for (let i = 0; i < this._attributes.length; i++) {
      const attribute = this._attributes[i];
      if (attribute.name === qualifiedName) {
        this._attributes.splice(i, 1);
        return attribute;
      }
    }
  }

  get length() {
    return this._attributes.length;
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this._attributes.length; i++) {
      yield this._attributes[i];
    }
  }

  clone() {
    return new NamedNodeMap(this._attributes.map((attr) => attr.clone()));
  }

  toSource() {
    return this._attributes.map((attr) => attr.toSource()).join(" ");
  }

  setNamedItem(attr: Attr) {
    for (let i = 0; i < this._attributes.length; i++) {
      const element = this._attributes[i];
      if (element.name === attr.name) {
        element.value = attr.value;
        return;
      }
    }
    this._attributes.push(attr);
  }
}

class EventTarget {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    console.log(`Warning: 'addEventListener' called but ignored.`);
  }

  dispatchEvent(event: Event): boolean {
    console.log(`Warning: 'dispatchEvent' called but ignored.`);
    return false;
  }

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void {
    console.log(`Warning: 'removeEventListener' called but ignored.`);
  }
}

class StopIteration extends Error {
  constructor() {
    super("Stop iteration error. Shouldn't leak out to user space.");
  }
}

export abstract class Node extends EventTarget {
  static ELEMENT_NODE = 1;
  static ATTRIBUTE_NODE = 2;
  static TEXT_NODE = 3;
  static DOCUMENT_FRAGMENT_NODE = 11;
  static COMMENT_NODE = 8;

  parentNode?: Node | null;

  get ownerDocument() {
    return this._ownerDocument;
  }

  get baseURI() {
    return this.ownerDocument!.baseURI;
  }

  get childNodes() {
    return this._childNodes;
  }

  constructor(
    private _ownerDocument: HTMLDocument,
    public nodeType: number,
    protected _attributes: NamedNodeMap = new NamedNodeMap([]),
    protected _childNodes: Node[] = []
  ) {
    super();

    for (let i = 0; i < _childNodes.length; i++) {
      const child = _childNodes[i];
      child.parentNode = this;
    }
  }

  appendChild(element: Node) {
    if (element instanceof DocumentFragment) {
      for (let i = 0; i < element.childNodes.length; i++) {
        this.appendChild(element.childNodes[i]);
      }
    } else {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.childNodes.push(element);
      element.parentNode = this;
    }
  }

  removeChild(element: Node) {
    const index = this.childNodes.indexOf(element);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      return;
    }
    throw new DOMException(
      `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`
    );
  }

  hasAttribute(attributeName: string) {
    return !!this._attributes.getNamedItem(attributeName);
  }

  getAttribute(attributeName: string) {
    const attribute = this._attributes.getNamedItem(attributeName);
    if (attribute) {
      return attribute.value;
    }
  }

  setAttribute(name: string, value?: string) {
    const attr = this.ownerDocument.createAttribute(name);
    attr.value = value;
    this._attributes.setNamedItem(attr);
  }

  removeAttribute(attributeName: string) {
    this._attributes.removeNamedItem(attributeName);
  }

  set innerHTML(value: string) {
    for (let i = 0; i < this._childNodes.length; i++) {
      this._childNodes[i].parentNode = null;
    }

    this._childNodes.length = 0;
    if (value !== "") {
      try {
        const results = parseHTML(value, { document: this.ownerDocument });
        for (let i = 0; i < results.length; i++) {
          this.appendChild(results[i]);
        }
      } catch (e) {
        throw new DOMException(
          `Assigning incorrect HTML string is not supported yet. Original error message: "${e.message}"`
        );
      }
    }
  }

  get innerHTML() {
    return this.childNodes.map((child) => child.toSource()).join("");
  }

  abstract get textContent(): string;
  abstract set textContent(value: string);

  get attributes() {
    return this._attributes;
  }

  insertBefore(insertedElement, refChild) {
    const index = this.childNodes.indexOf(refChild);
    if (index >= 0) {
      if (insertedElement.parentNode) {
        insertedElement.parentNode.removeChild(insertedElement);
      }
      this._childNodes.splice(index, 0, insertedElement);
      insertedElement.parentNode = this.parentNode;
    } else {
      new DOMException(
        `Failed to execute 'insertBefore' on ${this.constructor.name}: The node before which the new node is to be inserted is not a child of this node.`
      );
    }
  }

  insertAdjacentElement(position: InsertPosition, insertedElement: Node) {
    switch (position) {
      case "afterend":
        const index = this.parentNode!.childNodes.indexOf(this);
        if (insertedElement.parentNode) {
          insertedElement.parentNode.removeChild(insertedElement);
        }
        this.parentNode!.childNodes.splice(index + 1, 0, insertedElement);
        insertedElement.parentNode = this.parentNode;
        break;
      default:
        throw new DOMException(`${position} insertion is not implemented.`);
    }
  }

  querySelector(query: string) {
    let result: HTMLElement | undefined;
    this._query(query, function (element, matchedQuery) {
      if (matchedQuery) {
        result = element;
        return true;
      }
      return false;
    });
    return result;
  }

  querySelectorAll(query: string) {
    const results: HTMLElement[] = [];
    this._query(query, function (element, matchedQuery) {
      if (matchedQuery) {
        results.push(element);
      }
      return false;
    });

    return results;
  }

  getElementById(id: string) {
    let result: HTMLElement | undefined;
    this._catchingStopIteration(() =>
      this._walkHTMLElements(function (element) {
        if (element.getAttribute("id") === id) {
          result = element;
          return true;
        }
        return false;
      })
    );
    return result;
  }

  private _query(query: string, visitor: (element: HTMLElement, matchedQuery: boolean) => boolean) {
    let match;
    query = query.trim();
    if ((match = query.match(IDENTIFIER_REGEX)) && match[0] === query) {
      const nodeType = query;
      this._catchingStopIteration(() =>
        this._walkHTMLElements((element) => visitor(element, element.nodeName === nodeType))
      );
    } else {
      throw new DOMException(
        `Failed to execute 'querySelector' on '${this.constructor.name}': '${query}' is not a valid selector.`
      );
    }
  }

  private _catchingStopIteration(walk: () => void) {
    try {
      walk();
    } catch (e) {
      if (!(e instanceof StopIteration)) {
        throw e;
      }
    }
  }

  private _walkHTMLElements(visitor: (element: HTMLElement) => boolean) {
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];
      if (child instanceof HTMLElement) {
        if (visitor(child)) {
          throw new StopIteration();
        }
      }
      child._walkHTMLElements(visitor);
    }
  }

  abstract cloneNode(deep: boolean);
  abstract toSource(): string;
}

export class Attr extends Node {
  constructor(ownerDocument: HTMLDocument, public name: string, public value?: string) {
    super(ownerDocument, Node.ATTRIBUTE_NODE);
  }

  toString() {
    return this.value;
  }

  clone() {
    return new Attr(this.ownerDocument, this.name, this.value);
  }

  cloneNode() {
    return this.clone();
  }

  toSource() {
    return typeof this.value === "undefined" || this.value === null ? this.name : `${this.name}="${this.value}"`;
  }
}

function getChildren(node: Node) {
  return node.childNodes.filter((e) => e.nodeType === Node.ELEMENT_NODE);
}

export class HTMLElement extends Node {
  private _styleMap = {} as CSSStyleDeclaration;

  constructor(
    ownerDocument: HTMLDocument,
    public nodeName: string,
    attributes: NamedNodeMap = new NamedNodeMap([]),
    children: Node[] = []
  ) {
    super(ownerDocument, Node.ELEMENT_NODE, attributes, children);
  }

  get children() {
    return getChildren(this);
  }

  toSource() {
    const attributes = this._attributes.length ? " " + this._attributes.toSource() : "";
    const children = this.childNodes.map((child) => child.toSource()).join("");

    return !children && selfClosingTags.includes(this.nodeName)
      ? `<${this.nodeName}${attributes} />`
      : `<${this.nodeName}${attributes}>${children}</${this.nodeName}>`;
  }

  get textContent() {
    return this.childNodes.reduce((sum, current) => sum + current.textContent, "");
  }

  set textContent(value: string) {
    // TODO: remove children first
    this._childNodes = [this.ownerDocument.createTextNode(value)];
  }

  get style(): CSSStyleDeclaration {
    return this._styleMap;
  }

  cloneNode(deep: boolean) {
    let children = deep ? this.childNodes.map((child) => child.cloneNode(deep)) : Array.from(this.childNodes);
    return new HTMLElement(this.ownerDocument, this.nodeName, this._attributes.clone(), children);
  }
}

export class HTMLTemplateElement extends Node {
  get textContent(): string {
    throw new Error("Method not implemented.");
  }
  set textContent(_value: string) {
    throw new Error("Method not implemented.");
  }
  cloneNode(_deep: boolean) {
    throw new Error("Method not implemented.");
  }
  toSource(): string {
    throw new Error("Method not implemented.");
  }
}

export class Comment extends Node {
  constructor(ownerDocument: HTMLDocument, private _textContent: string = "") {
    super(ownerDocument, Node.COMMENT_NODE);
  }

  toSource() {
    return `<!--${this._textContent}-->`;
  }

  get textContent() {
    return this._textContent;
  }

  cloneNode(_deep: boolean) {
    return new Comment(this.ownerDocument, this.textContent);
  }
}

export class Text extends Node {
  constructor(ownerDocument: HTMLDocument, private _textContent: string = "") {
    super(ownerDocument, Node.TEXT_NODE);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value: string) {
    this._textContent = value;
  }

  toSource() {
    return this._textContent;
  }

  cloneNode(_deep: boolean) {
    return new Text(this.ownerDocument, this.textContent);
  }
}

export class DocumentFragment extends Node {
  get children() {
    return getChildren(this);
  }

  constructor(ownerDocument: HTMLDocument) {
    super(ownerDocument, Node.DOCUMENT_FRAGMENT_NODE);
  }

  toSource() {
    return this.childNodes.map((child) => child.toSource()).join("");
  }

  cloneNode(deep: boolean) {
    const fragment = new DocumentFragment(this.ownerDocument);
    fragment.children = this.childNodes.map((child) => child.cloneNode(deep));
    return fragment;
  }

  get textContent() {
    return this.childNodes.reduce((sum, current) => sum + current.textContent, "");
  }
}

export class DOMParser {
  parseFromString(string) {
    return {
      head: { childNodes: [] },
      body: { childNodes: parse(string) }
    };
  }
}

export class HTMLDocument extends Node {
  private _head: HTMLElement;
  private _body: HTMLElement;

  get ownerDocument() {
    return null;
  }

  get head() {
    return this._head;
  }

  get body() {
    return this._body;
  }

  constructor(private _baseURI: string = "") {
    super(null, Node.ELEMENT_NODE);

    this._head = this.createElement("head");
    this._body = this.createElement("body");
  }

  get baseURI() {
    return this._baseURI;
  }

  createComment(contents: string) {
    return new Comment(this, contents);
  }
  createElement(nodeType: string) {
    return new HTMLElement(this, nodeType);
  }
  createDocumentFragment() {
    return new DocumentFragment(this);
  }
  createTextNode(content: string) {
    return new Text(this, content);
  }
  createAttribute(name: string) {
    return new Attr(this, name);
  }
}

class NodeList {}
class HTMLCollection {}

export class Window {
  document: HTMLDocument;
  fetch: typeof fetch;
  DOMParser = DOMParser;
  DocumentFragment = DocumentFragment;
  Node = Node;
  HTMLElement = HTMLElement;
  HTMLTemplateElement = HTMLTemplateElement;
  NodeList = NodeList;
  HTMLCollection = HTMLCollection;
  Attr = Attr;
  Text = Text;
  HTMLDocument = HTMLDocument;

  constructor(baseURI: string = "") {
    this.document = new HTMLDocument(baseURI);
  }
}

export function parse(input: string) {
  return parseHTML(input, new Window());
}
