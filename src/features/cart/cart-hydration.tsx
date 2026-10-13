"use client";

import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { cartStore } from "./cart-store";

/**
 * Loads the saved cart from localStorage once the page has mounted. Doing it
 * here, instead of when the store is created, means the server and the
 * browser both render an empty cart first, so React finds no mismatch.
 */
export function CartHydration() {
  useEffect(() => {
    void cartStore.persist.rehydrate();
  }, []);

  return null;
}

/** True once the saved cart has been read. Always false on the server. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => cartStore.persist.onFinishHydration(onChange),
    () => cartStore.persist.hasHydrated(),
    () => false,
  );
}

/**
 * Holds back content that would be wrong before the saved cart is known,
 * such as "your cart is empty" on the checkout page.
 */
export function CartGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  return useCartHydrated() ? children : fallback;
}
