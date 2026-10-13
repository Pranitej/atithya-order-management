/**
 * Money is stored and calculated as an integer number of paise so that
 * totals never suffer floating point drift. Formatting is the only place
 * that converts to rupees.
 */
const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(paise: number): string {
  const formatter = paise % 100 === 0 ? wholeRupees : withPaise;
  return formatter.format(paise / 100);
}
