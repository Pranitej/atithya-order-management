"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { VegMark } from "@/components/ui/veg-mark";
import { formatPrice } from "@/shared/money";
import { FREE_DELIVERY_THRESHOLD, calculateTotals } from "@/shared/pricing";
import { MAX_QUANTITY_PER_ITEM } from "@/shared/schemas";
import { type CartLine, useCart } from "./cart-store";
import { PriceBreakdown } from "./price-breakdown";

type CartPanelProps = {
  /** Called when the person follows a link out of the cart, so its container can close. */
  onNavigate?: () => void;
};

export function CartPanel({ onNavigate }: CartPanelProps) {
  const lines = useCart((cart) => cart.lines);

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-start gap-2 px-5 py-10">
        <h3 className="font-display text-2xl">Your cart is empty</h3>
        <p className="text-muted">
          Add a dish from the menu and it will show up here.
        </p>
      </div>
    );
  }

  const totals = calculateTotals(
    lines.map((line) => ({ unitPrice: line.price, quantity: line.quantity })),
  );
  const awayFromFreeDelivery = FREE_DELIVERY_THRESHOLD - totals.subtotal;

  return (
    <>
      <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
        {lines.map((line) => (
          <CartRow key={line.id} line={line} />
        ))}
      </ul>

      <div className="border-t border-line bg-mist px-5 pt-4 pb-5">
        {awayFromFreeDelivery > 0 && (
          <p className="mb-3 rounded-lg bg-gold-100 px-3 py-2 text-sm font-medium">
            Add {formatPrice(awayFromFreeDelivery)} more for free delivery
          </p>
        )}
        <PriceBreakdown totals={totals} />
        <Link
          href="/checkout"
          onClick={onNavigate}
          className={buttonStyles({
            size: "lg",
            block: true,
            className: "mt-4",
          })}
        >
          Go to checkout
        </Link>
      </div>
    </>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const increase = useCart((cart) => cart.increase);
  const decrease = useCart((cart) => cart.decrease);

  return (
    <li aria-label={line.name} className="flex items-center gap-3.5 py-4">
      <Image
        src={line.image}
        alt=""
        width={128}
        height={128}
        sizes="64px"
        className="size-16 shrink-0 rounded-xl bg-leaf-50 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 leading-snug font-semibold">
          <VegMark isVeg={line.isVeg} />
          <span className="truncate">{line.name}</span>
        </p>
        <p className="mt-0.5 text-sm text-muted tabular-nums">
          {formatPrice(line.price)} each
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <QuantityStepper
          size="sm"
          itemName={line.name}
          quantity={line.quantity}
          max={MAX_QUANTITY_PER_ITEM}
          onIncrease={() => increase(line.id)}
          onDecrease={() => decrease(line.id)}
        />
        <p className="font-semibold tabular-nums">
          {formatPrice(line.price * line.quantity)}
        </p>
      </div>
    </li>
  );
}
