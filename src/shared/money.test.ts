import { describe, expect, it } from "vitest";
import { formatPrice } from "./money";

describe("formatPrice", () => {
  it("shows whole rupee amounts without decimals", () => {
    expect(formatPrice(24900)).toBe("₹249");
  });

  it("shows paise when the amount is not a whole rupee", () => {
    expect(formatPrice(19645)).toBe("₹196.45");
  });

  it("keeps a trailing zero in the paise", () => {
    expect(formatPrice(250050)).toBe("₹2,500.50");
  });

  it("uses Indian digit grouping for large amounts", () => {
    expect(formatPrice(12345600)).toBe("₹1,23,456");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("₹0");
  });
});
