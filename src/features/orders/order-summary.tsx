import { PriceBreakdown } from "@/features/cart/price-breakdown";
import { formatPrice } from "@/shared/money";
import type { OrderDTO } from "@/shared/types";

/** What was ordered, what it cost and where it is going. */
export function OrderSummary({ order }: { order: OrderDTO }) {
  return (
    <div className="rounded-2xl border border-line bg-mist p-6">
      <h2 className="font-display text-2xl leading-tight">Your order</h2>

      <ul className="mt-4 flex flex-col gap-3">
        {order.items.map((line) => (
          <li
            key={line.menuItemId}
            className="flex items-baseline justify-between gap-4"
          >
            <span>
              <span className="text-muted tabular-nums">{line.quantity} ×</span>{" "}
              {line.name}
            </span>
            <span className="tabular-nums">{formatPrice(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        <PriceBreakdown totals={order} />
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-muted">Delivering to</h3>
        <p className="mt-1 font-semibold">{order.customer.name}</p>
        <p className="text-muted">{order.customer.address}</p>
        <p className="text-muted tabular-nums">{order.customer.phone}</p>
      </div>
    </div>
  );
}
