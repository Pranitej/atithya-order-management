import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { MAX_ITEMS_PER_ORDER, MAX_QUANTITY_PER_ITEM } from "@/shared/schemas";
import type { MenuItemDTO } from "@/shared/types";

export type CartLine = {
  id: string;
  name: string;
  /** Price in paise as shown when added. The server re-prices at checkout. */
  price: number;
  image: string;
  isVeg: boolean;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  /** Puts a dish in the cart, or adds one more if it is already there. */
  add: (item: MenuItemDTO) => void;
  increase: (id: string) => void;
  decrease: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

/** Changes one line's quantity, capped at the maximum; a line at zero is dropped. */
function withQuantityChanged(
  lines: CartLine[],
  id: string,
  change: number,
): CartLine[] {
  return lines
    .map((line) =>
      line.id === id
        ? {
            ...line,
            quantity: Math.min(line.quantity + change, MAX_QUANTITY_PER_ITEM),
          }
        : line,
    )
    .filter((line) => line.quantity > 0);
}

export function createCartStore() {
  return createStore<CartState>()(
    persist(
      (set) => ({
        lines: [],

        add: (item) =>
          set((state) => {
            const { lines } = state;
            if (lines.some((line) => line.id === item.id)) {
              return { lines: withQuantityChanged(lines, item.id, 1) };
            }
            if (isCartFull(lines)) return state;
            const { id, name, price, image, isVeg } = item;
            return {
              lines: [...lines, { id, name, price, image, isVeg, quantity: 1 }],
            };
          }),

        increase: (id) =>
          set(({ lines }) => ({ lines: withQuantityChanged(lines, id, 1) })),

        decrease: (id) =>
          set(({ lines }) => ({ lines: withQuantityChanged(lines, id, -1) })),

        remove: (id) =>
          set(({ lines }) => ({
            lines: lines.filter((line) => line.id !== id),
          })),

        clear: () => set({ lines: [] }),
      }),
      {
        name: "atithya-cart",
        storage: createJSONStorage(() => localStorage),
        partialize: ({ lines }) => ({ lines }),
        // The server renders an empty cart. Reading localStorage only after
        // the page has mounted (see CartHydration) keeps the first client
        // render identical to the server's.
        skipHydration: true,
      },
    ),
  );
}

export const cartStore = createCartStore();

export function useCart<T>(selector: (state: CartState) => T): T {
  return useStore(cartStore, selector);
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function quantityOf(lines: readonly CartLine[], id: string): number {
  return lines.find((line) => line.id === id)?.quantity ?? 0;
}

/** An order can hold only so many different dishes, and the API refuses more. */
export function isCartFull(lines: readonly CartLine[]): boolean {
  return lines.length >= MAX_ITEMS_PER_ORDER;
}
