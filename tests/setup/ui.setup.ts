import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no layout engine, so it implements neither scrolling nor size
// observation. Components may still use them; these are harmless stand-ins
// that individual tests can spy on.
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollBy ??= () => {};

globalThis.ResizeObserver ??= class {
  constructor(private readonly callback: ResizeObserverCallback) {}

  // A browser reports the size once as soon as observation starts.
  observe() {
    this.callback([], this);
  }

  unobserve() {}

  disconnect() {}
};

afterEach(() => {
  cleanup();
});
