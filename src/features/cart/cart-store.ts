import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { MAX_QUANTITY_PER_ITEM } from "@/shared/schemas";
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
  add: (item: MenuItemDTO) => void;
  decrease: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export function createCartStore() {
  return createStore<CartState>()(
    persist(
      (set) => ({
        lines: [],

        add: (item) =>
          set(({ lines }) => {
            const existing = lines.find((line) => line.id === item.id);
            if (!existing) {
              const { id, name, price, image, isVeg } = item;
              return {
                lines: [
                  ...lines,
                  { id, name, price, image, isVeg, quantity: 1 },
                ],
              };
            }
            return {
              lines: lines.map((line) =>
                line.id === item.id
                  ? {
                      ...line,
                      quantity: Math.min(
                        line.quantity + 1,
                        MAX_QUANTITY_PER_ITEM,
                      ),
                    }
                  : line,
              ),
            };
          }),

        decrease: (id) =>
          set(({ lines }) => ({
            lines: lines
              .map((line) =>
                line.id === id
                  ? { ...line, quantity: line.quantity - 1 }
                  : line,
              )
              .filter((line) => line.quantity > 0),
          })),

        remove: (id) =>
          set(({ lines }) => ({
            lines: lines.filter((line) => line.id !== id),
          })),

        clear: () => set({ lines: [] }),
      }),
      {
        name: "dabba-cart",
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
