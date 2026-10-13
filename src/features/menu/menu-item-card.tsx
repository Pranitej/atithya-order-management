"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { VegMark } from "@/components/ui/veg-mark";
import { quantityOf, useCart } from "@/features/cart/cart-store";
import { formatPrice } from "@/shared/money";
import { MAX_QUANTITY_PER_ITEM } from "@/shared/schemas";
import type { MenuItemDTO } from "@/shared/types";

/**
 * One dish on the menu, laid out like a line on a printed menu: words on the
 * left, photo on the right, with the add control sitting on the photo's edge.
 */
export function MenuItemCard({ item }: { item: MenuItemDTO }) {
  const quantity = useCart((cart) => quantityOf(cart.lines, item.id));
  const add = useCart((cart) => cart.add);
  const decrease = useCart((cart) => cart.decrease);

  return (
    <article className="flex gap-5 border-b border-line py-6">
      <div className="min-w-0 flex-1">
        <VegMark isVeg={item.isVeg} />
        <h3 className="mt-1.5 text-lg leading-snug font-semibold">
          {item.name}
        </h3>
        <p className="mt-0.5 font-semibold tabular-nums">
          {formatPrice(item.price)}
        </p>
        <p className="mt-2 max-w-[46ch] text-[0.95rem] leading-relaxed text-muted">
          {item.description}
        </p>
      </div>

      <div className="relative mb-4 shrink-0">
        <Image
          src={item.image}
          alt={item.name}
          width={288}
          height={288}
          sizes="144px"
          className="size-32 rounded-2xl bg-leaf-50 object-cover sm:size-36"
        />
        <div className="absolute inset-x-0 -bottom-4 flex justify-center">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => add(item)}
              aria-label={`Add ${item.name} to cart`}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-leaf-900/15 bg-paper pr-4 pl-3 font-semibold text-leaf-900 shadow-[0_6px_16px_-8px_rgb(10_42_32/0.5)] transition-colors hover:bg-leaf-50 active:bg-leaf-100"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add
            </button>
          ) : (
            <QuantityStepper
              itemName={item.name}
              quantity={quantity}
              max={MAX_QUANTITY_PER_ITEM}
              onIncrease={() => add(item)}
              onDecrease={() => decrease(item.id)}
              className="shadow-[0_6px_16px_-8px_rgb(10_42_32/0.6)]"
            />
          )}
        </div>
      </div>
    </article>
  );
}
