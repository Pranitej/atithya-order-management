/** All amounts are integers in paise. */
export const DELIVERY_FEE = 4000;
export const FREE_DELIVERY_THRESHOLD = 50000;
export const TAX_PERCENT = 5;

export type PricedLine = {
  unitPrice: number;
  quantity: number;
};

export type OrderTotals = {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
};

/**
 * The single source of truth for what an order costs. The browser uses it to
 * preview the bill; the server uses it, with prices read from the database,
 * to decide what is actually charged.
 */
export function calculateTotals(lines: readonly PricedLine[]): OrderTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  if (subtotal === 0) {
    return { subtotal: 0, deliveryFee: 0, tax: 0, total: 0 };
  }

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const tax = Math.round((subtotal * TAX_PERCENT) / 100);

  return { subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax };
}
