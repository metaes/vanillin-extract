import { parse } from "./dom-extract";
import * as chai from "chai";
import { Node } from "./dom-extract";
chai.use(require("chai-subset-in-order"));

const tests = {
  "self closing": [
    `<a href="test" />`,
    [
      {
        nodeName: "a",
        attributes: { _attributes: [{ name: "href", value: "test" }] }
      }
    ]
  ],
  "with text content": [
    `<span id="aspan">Hello world</span>`,
    [
      {
        nodeName: "span",
        textContent: "Hello world",
        attributes: { _attributes: [{ name: "id", value: "aspan" }] }
      }
    ]
  ],
  "multiple nodes in sequence": [
    `<hr /><hr />`,
    [
      {
        nodeName: "hr"
      },
      {
        nodeName: "hr"
      }
    ]
  ],
  "nodes in a tree": [
    `<a><b /></a>`,
    [
      {
        nodeName: "a",
        childNodes: [{ nodeName: "b" }]
      }
    ]
  ],
  "multiline element open part": [
    `<a 
  >test</a>`,
    [{ nodeName: "a", textContent: "test" }]
  ],
  "multiline element close part": [
    `<a>test</a
    >`,
    [{ nodeName: "a", textContent: "test" }]
  ],
  "text node": [
    `<a>text1<b />text2</a>`,
    [
      {
        nodeName: "a",
        childNodes: [
          { nodeType: Node.TEXT_NODE, textContent: "text1" },
          { nodeType: Node.ELEMENT_NODE, nodeName: "b" },
          { nodeType: Node.TEXT_NODE, textContent: "text2" }
        ]
      }
    ]
  ],
  "text node with included whitespace": [
    `<a> text1 <b /> text2</a>`,
    [
      {
        nodeName: "a",
        childNodes: [
          { nodeType: Node.TEXT_NODE, textContent: " text1 " },
          { nodeType: Node.ELEMENT_NODE, nodeName: "b" },
          { nodeType: Node.TEXT_NODE, textContent: " text2" }
        ]
      }
    ]
  ],
  "script element": [`<script>1<2<3>4</script>`, [{ nodeName: "script", textContent: "1<2<3>4" }]],
  "multiple free text content elements": [
    `<script><anything></script><style><anything2></style>`,
    [
      { nodeName: "script", textContent: "<anything>" },
      { nodeName: "style", textContent: "<anything2>" }
    ]
  ],
  comment: [
    `<!--(test!)--><hr /><!--(test2!)-->test`,
    [
      { nodeType: Node.COMMENT_NODE, textContent: "(test!)" },
      { nodeType: Node.ELEMENT_NODE, nodeName: "hr" },
      { nodeType: Node.COMMENT_NODE, textContent: "(test2!)" },
      { nodeType: Node.TEXT_NODE, textContent: "test" }
    ]
  ],
  "comments and text elements": [
    `<div><!--comment-->text<!--comment2--></div>`,
    [
      {
        nodeName: "div",
        childNodes: [
          { nodeType: Node.COMMENT_NODE, textContent: "comment" },
          { nodeType: Node.TEXT_NODE, textContent: "text" },
          { nodeType: Node.COMMENT_NODE, textContent: "comment2" }
        ]
      }
    ]
  ],
  "html self closing tag": [`<br><link>`, [{ nodeName: "br" }, { nodeName: "link" }]]
};

describe("Parse", function () {
  Object.entries(tests).forEach(([name, [input, output]]) => {
    it(name, function () {
      let parsed;
      try {
        parsed = parse(input as string);
        chai.expect(parsed).to.containSubsetInOrder(output);
      } catch (e) {
        console.log("For input: ", input);
        throw e;
      }
    });
  });
});
