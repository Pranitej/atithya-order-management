import { beforeEach, describe, expect, it } from "vitest";
import type { MenuItemDTO } from "@/shared/types";
import {
  cartCount,
  cartSubtotal,
  createCartStore,
  quantityOf,
} from "./cart-store";

const pizza: MenuItemDTO = {
  id: "pizza",
  name: "Margherita Pizza",
  description: "Tomato, mozzarella, basil.",
  price: 24900,
  image: "/menu/margherita.jpg",
  category: "pizza",
  isVeg: true,
};

const fries: MenuItemDTO = {
  id: "fries",
  name: "Masala Fries",
  description: "Crisp fries tossed in chaat masala.",
  price: 9900,
  image: "/menu/fries.jpg",
  category: "sides",
  isVeg: true,
};

let store: ReturnType<typeof createCartStore>;
const cart = () => store.getState();

beforeEach(() => {
  localStorage.clear();
  store = createCartStore();
});

describe("cart", () => {
  it("starts empty", () => {
    expect(cart().lines).toEqual([]);
  });

  it("adds an item with a quantity of one", () => {
    cart().add(pizza);

    expect(cart().lines).toEqual([
      {
        id: "pizza",
        name: "Margherita Pizza",
        price: 24900,
        image: "/menu/margherita.jpg",
        isVeg: true,
        quantity: 1,
      },
    ]);
  });

  it("raises the quantity when the same item is added again", () => {
    cart().add(pizza);
    cart().add(pizza);

    expect(cart().lines).toHaveLength(1);
    expect(quantityOf(cart().lines, "pizza")).toBe(2);
  });

  it("keeps items in the order they were added", () => {
    cart().add(pizza);
    cart().add(fries);
    cart().add(pizza);

    expect(cart().lines.map((line) => line.id)).toEqual(["pizza", "fries"]);
  });

  it("lowers the quantity by one", () => {
    cart().add(pizza);
    cart().add(pizza);

    cart().decrease("pizza");

    expect(quantityOf(cart().lines, "pizza")).toBe(1);
  });

  it("removes the item when its quantity reaches zero", () => {
    cart().add(pizza);

    cart().decrease("pizza");

    expect(cart().lines).toEqual([]);
  });

  it("never lets one item go above 20", () => {
    for (let count = 0; count < 25; count++) cart().add(pizza);

    expect(quantityOf(cart().lines, "pizza")).toBe(20);
  });

  it("removes an item whatever its quantity", () => {
    cart().add(pizza);
    cart().add(pizza);
    cart().add(fries);

    cart().remove("pizza");

    expect(cart().lines.map((line) => line.id)).toEqual(["fries"]);
  });

  it("empties completely when cleared", () => {
    cart().add(pizza);
    cart().add(fries);

    cart().clear();

    expect(cart().lines).toEqual([]);
  });

  it("ignores changes to an item that is not in the cart", () => {
    cart().add(pizza);

    cart().decrease("fries");
    cart().remove("fries");

    expect(cart().lines).toHaveLength(1);
  });
});

describe("cart totals", () => {
  it("counts every unit, not every line", () => {
    cart().add(pizza);
    cart().add(pizza);
    cart().add(fries);

    expect(cartCount(cart().lines)).toBe(3);
  });

  it("adds up price times quantity", () => {
    cart().add(pizza);
    cart().add(pizza);
    cart().add(fries);

    // 2 x 24900 + 1 x 9900
    expect(cartSubtotal(cart().lines)).toBe(59700);
  });

  it("reports zero for an item that is not in the cart", () => {
    expect(quantityOf(cart().lines, "pizza")).toBe(0);
  });
});

describe("cart persistence", () => {
  it("is still there after the page is reloaded", async () => {
    cart().add(pizza);
    cart().add(pizza);

    // A reload creates a brand new store that reads what the old one saved.
    const afterReload = createCartStore();
    await afterReload.persist.rehydrate();

    expect(quantityOf(afterReload.getState().lines, "pizza")).toBe(2);
  });

  it("stays empty after a reload if it was cleared", async () => {
    cart().add(pizza);
    cart().clear();

    const afterReload = createCartStore();
    await afterReload.persist.rehydrate();

    expect(afterReload.getState().lines).toEqual([]);
  });
});
