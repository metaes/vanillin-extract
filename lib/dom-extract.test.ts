import * as chai from "chai";
import { Node, parse } from "./dom-extract";
import { Window } from "./dom-extract";

chai.use(require("chai-subset-in-order"));

const { assert } = chai;

describe("append/prepend", function () {
  it("supports .prepend() method", function () {
    const div = parse(`<div><span>a text</span></div>`)[0];
    assert.isTrue(div.childNodes[0].nodeName === "span");

    // test prepending text nodes
    div?.prepend("hello", "hello2");
    assert.isTrue(div.childNodes[0].nodeType === Node.TEXT_NODE);
    assert.deepEqual(
      div.childNodes.map((node) => node.textContent),
      ["hello", "hello2", "a text"]
    );

    // test adding element nodes
    const document = div.ownerDocument;
    const p = document?.createElement("p");
    div.prepend(p!);
    assert.isTrue(div.childNodes[0].nodeName === "p");
  });
});

describe("Selectors", function () {
  it("supports querySelector using nodename", function () {
    const element = parse(`<ul><li></li></ul>`);
    assert.equal(element[0].querySelector("li")?.nodeName, "li");
  });

  it("supports querySelectorAll using nodename", function () {
    const element = parse(`<ul><li></li><li></li></ul>`);
    assert.equal(element[0].querySelectorAll("li").length, 2);
  });

  it("supports getElementById", function () {
    const element = parse(`<ul><li id="test"></li><li><a href="" id="link"></a></li></ul>`);

    assert.equal(element[0].getElementById("test")?.nodeName, "li");
    assert.equal(element[0].getElementById("link")?.nodeName, "a");
  });
});

describe("toSource()", function () {
  it("prints self closing tags", function () {
    const elements = parse(`<meta />`);
    assert.equal(elements[0].toSource(), "<meta />");
  });

  it("prints normal tags", function () {
    const elements = parse(`<div />`);
    assert.equal(elements[0].toSource(), "<div></div>");
  });
});

describe("innerHTML", function () {
  it("returns innerHTML for HTMLElement", function () {
    const [ul] = parse(`<ul><li></li></ul>`);
    assert.equal(ul.innerHTML, "<li></li>");
  });

  it("cleans children when setting empty string", function () {
    const [ul] = parse(`<ul><li></li></ul>`);

    assert.equal(ul.childNodes.length, 1);
    ul.innerHTML = "";
    assert.equal(ul.childNodes.length, 0);
  });

  it("sets and gets innerHTML with using correct HTML", function () {
    const { body } = new Window().document;

    body.innerHTML = "<meta><link><strong>test <span>test</span></strong>";
    assert.lengthOf(body.childNodes, 3);
    assert.equal(body.innerHTML, `<meta /><link /><strong>test <span>test</span></strong>`);
  });

  it("(currently) do not allow to set incomplete HTML", function () {
    const { body } = new Window().document;

    assert.throws(function () {
      body.innerHTML = "<div";
    });
  });
});
