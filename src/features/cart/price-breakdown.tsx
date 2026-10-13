import { formatPrice } from "@/shared/money";
import { type OrderTotals, TAX_PERCENT } from "@/shared/pricing";

/** The bill, itemised. Used for the cart preview and for placed orders alike. */
export function PriceBreakdown({ totals }: { totals: OrderTotals }) {
  return (
    <dl className="flex flex-col gap-2 text-[0.95rem]">
      <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
      <Row
        label="Delivery"
        value={
          totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)
        }
      />
      <Row label={`Taxes (${TAX_PERCENT}%)`} value={formatPrice(totals.tax)} />
      <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3 text-lg font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-muted">
      <dt>{label}</dt>
      <dd className="text-ink tabular-nums">{value}</dd>
    </div>
  );
}
