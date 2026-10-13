import { describe, expect, it } from "vitest";
import { calculateTotals } from "./pricing";

// All amounts are in paise (1 rupee = 100 paise).
describe("calculateTotals", () => {
  it("multiplies each line by its quantity and adds 5% tax", () => {
    const totals = calculateTotals([
      { unitPrice: 24900, quantity: 2 },
      { unitPrice: 9900, quantity: 1 },
    ]);

    expect(totals).toEqual({
      subtotal: 59700,
      deliveryFee: 0,
      tax: 2985,
      total: 62685,
    });
  });

  it("charges a 40 rupee delivery fee on orders under 500 rupees", () => {
    const totals = calculateTotals([{ unitPrice: 14900, quantity: 1 }]);

    expect(totals).toEqual({
      subtotal: 14900,
      deliveryFee: 4000,
      tax: 745,
      total: 19645,
    });
  });

  it("delivers free once the subtotal reaches exactly 500 rupees", () => {
    const totals = calculateTotals([{ unitPrice: 25000, quantity: 2 }]);

    expect(totals.deliveryFee).toBe(0);
    expect(totals.total).toBe(52500);
  });

  it("still charges delivery one paise below the free threshold", () => {
    const totals = calculateTotals([{ unitPrice: 49999, quantity: 1 }]);

    expect(totals.deliveryFee).toBe(4000);
  });

  it("rounds tax to the nearest paise", () => {
    // 5% of 9990 is 499.5, which rounds up to 500.
    const totals = calculateTotals([{ unitPrice: 9990, quantity: 1 }]);

    expect(totals.tax).toBe(500);
  });

  it("charges nothing at all for an empty cart", () => {
    expect(calculateTotals([])).toEqual({
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      total: 0,
    });
  });
});
