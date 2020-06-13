import { parse } from "./dom-extract";
import * as chai from "chai";

chai.use(require("chai-subset"));

describe("Selectors", function () {
  it("supports querySelector using nodename", function () {
    const element = parse(`<ul><li></li></ul>`);
    chai.assert.equal(element[0].querySelector("li").nodeName, "li");
  });

  it("supports querySelectorAll using nodename", function () {
    const element = parse(`<ul><li></li><li></li></ul>`);
    chai.assert.equal(element[0].querySelectorAll("li").length, 2);
  });

  it("supports getElementById", function () {
    const element = parse(`<ul><li id="test"></li><li><a href="" id="link"></a></li></ul>`);

    chai.assert.equal(element[0].getElementById("test")?.nodeName, "li");
    chai.assert.equal(element[0].getElementById("link")?.nodeName, "a");
  });
});

describe("toSource()", function () {
  it("prints self closing tags", function () {
    const elements = parse(`<meta />`);
    chai.assert.equal(elements[0].toSource(), "<meta />");
  });

  it("prints normal tags", function () {
    const elements = parse(`<div />`);
    chai.assert.equal(elements[0].toSource(), "<div></div>");
  });
});
