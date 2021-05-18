import { fetchNode } from "./fetch-extract";
import { Window } from "./dom-extract";

export class WindowNode extends Window {
  fetch = fetchNode as typeof fetch;
}
