import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it.each(["/checkout", "/orders/64b7f0c2a1d3e4f5a6b7c8e0", "/orders?x=1"])(
    "keeps the in-app path %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.example",
    "//evil.example/login",
    "/\\evil.example",
    "javascript:alert(1)",
    "checkout",
    "",
  ])("refuses %s and falls back to the home page", (path) => {
    expect(safeNextPath(path)).toBe("/");
  });

  it("falls back to the home page when nothing was asked for", () => {
    expect(safeNextPath(null)).toBe("/");
  });
});
