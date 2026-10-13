"use client";

import { ShoppingBag } from "lucide-react";
import { create } from "zustand";
import { Sheet } from "@/components/ui/sheet";
import { formatPrice } from "@/shared/money";
import { CartPanel } from "./cart-panel";
import { cartCount, cartSubtotal, useCart } from "./cart-store";

/** Whether the cart panel is open. Shared so any button can open it. */
const useCartSheet = create<{
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
}));

/** The header's cart button, with the number of items in it. */
export function CartButton() {
  const count = useCart((cart) => cartCount(cart.lines));
  const setOpen = useCartSheet((sheet) => sheet.setOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={
        count === 0 ? "Open cart" : `Open cart, ${count} items inside`
      }
      className="relative inline-flex h-11 items-center gap-2 rounded-xl bg-leaf-900 px-4 font-semibold text-white transition-colors hover:bg-leaf-800"
    >
      <ShoppingBag className="size-[1.15rem]" aria-hidden="true" />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="grid min-w-6 place-items-center rounded-full bg-gold-500 px-1.5 text-sm leading-6 text-ink tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * On phones the header button is far from the thumb, so once there is
 * something in the cart a bar appears along the bottom of the menu.
 */
export function CartBar() {
  const count = useCart((cart) => cartCount(cart.lines));
  const subtotal = useCart((cart) => cartSubtotal(cart.lines));
  const setOpen = useCartSheet((sheet) => sheet.setOpen);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 w-full items-center justify-between rounded-2xl bg-leaf-900 px-5 font-semibold text-white shadow-[0_12px_30px_-12px_rgb(10_42_32/0.7)]"
      >
        <span className="tabular-nums">
          {count} {count === 1 ? "item" : "items"}
          <span className="ml-3 font-normal text-leaf-200">
            {formatPrice(subtotal)}
          </span>
        </span>
        <span>View cart</span>
      </button>
    </div>
  );
}

export function CartSheet() {
  const isOpen = useCartSheet((sheet) => sheet.isOpen);
  const setOpen = useCartSheet((sheet) => sheet.setOpen);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setOpen}
      title="Your cart"
      description="Change quantities here, then go to checkout."
    >
      <CartPanel onNavigate={() => setOpen(false)} />
    </Sheet>
  );
}
