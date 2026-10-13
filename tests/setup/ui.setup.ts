import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no layout engine, so it does not implement scrolling. Components
// may still ask for it; here that is simply a no-op.
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
});
