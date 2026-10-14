import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { cartStore, quantityOf } from "@/features/cart/cart-store";
import { burger, pizza } from "../../../tests/helpers/menu-fixtures";
import { MenuItemCard } from "./menu-item-card";

const quantityInCart = (id: string) =>
  quantityOf(cartStore.getState().lines, id);

beforeEach(() => {
  localStorage.clear();
  cartStore.setState({ lines: [] });
});

describe("MenuItemCard", () => {
  it("shows the dish's name, description and price", () => {
    render(<MenuItemCard item={pizza} />);

    expect(
      screen.getByRole("heading", { name: "Margherita Pizza" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("San Marzano tomato, fresh mozzarella and basil."),
    ).toBeInTheDocument();
    expect(screen.getByText("₹249")).toBeInTheDocument();
  });

  it("shows a photo of the dish described by its name", () => {
    render(<MenuItemCard item={pizza} />);

    expect(
      screen.getByRole("img", { name: "Margherita Pizza" }),
    ).toBeInTheDocument();
  });

  it("marks a vegetarian dish as vegetarian", () => {
    render(<MenuItemCard item={pizza} />);

    expect(screen.getByRole("img", { name: "Vegetarian" })).toBeInTheDocument();
  });

  it("marks a meat dish as non-vegetarian", () => {
    render(<MenuItemCard item={burger} />);

    expect(
      screen.getByRole("img", { name: "Non-vegetarian" }),
    ).toBeInTheDocument();
  });

  it("adds the dish to the cart", async () => {
    const user = userEvent.setup();
    render(<MenuItemCard item={pizza} />);

    await user.click(
      screen.getByRole("button", { name: "Add Margherita Pizza to cart" }),
    );

    expect(quantityInCart(pizza.id)).toBe(1);
  });

  it("swaps the add button for a quantity control once the dish is in the cart", async () => {
    const user = userEvent.setup();
    render(<MenuItemCard item={pizza} />);

    await user.click(
      screen.getByRole("button", { name: "Add Margherita Pizza to cart" }),
    );

    const quantity = screen.getByRole("group", {
      name: "Quantity of Margherita Pizza",
    });
    expect(within(quantity).getByText("1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Margherita Pizza to cart" }),
    ).not.toBeInTheDocument();
  });

  it("raises the quantity with the plus button", async () => {
    const user = userEvent.setup();
    render(<MenuItemCard item={pizza} />);
    await user.click(
      screen.getByRole("button", { name: "Add Margherita Pizza to cart" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Add one more Margherita Pizza" }),
    );

    expect(quantityInCart(pizza.id)).toBe(2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("goes back to the add button when the last one is removed", async () => {
    const user = userEvent.setup();
    render(<MenuItemCard item={pizza} />);
    await user.click(
      screen.getByRole("button", { name: "Add Margherita Pizza to cart" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Remove Margherita Pizza" }),
    );

    expect(quantityInCart(pizza.id)).toBe(0);
    expect(
      screen.getByRole("button", { name: "Add Margherita Pizza to cart" }),
    ).toBeInTheDocument();
  });

  it("shows the quantity already in the cart when the page loads", () => {
    cartStore.getState().add(pizza);
    cartStore.getState().add(pizza);

    render(<MenuItemCard item={pizza} />);

    const quantity = screen.getByRole("group", {
      name: "Quantity of Margherita Pizza",
    });
    expect(within(quantity).getByText("2")).toBeInTheDocument();
  });

  it("stops the quantity at 20", () => {
    for (let count = 0; count < 20; count++) cartStore.getState().add(pizza);

    render(<MenuItemCard item={pizza} />);

    expect(
      screen.getByRole("button", { name: "Add one more Margherita Pizza" }),
    ).toBeDisabled();
  });

  it("says the cart is full instead of offering a 31st dish", () => {
    for (let n = 0; n < 30; n++) {
      cartStore.getState().add({ ...burger, id: `dish-${n}` });
    }

    render(<MenuItemCard item={pizza} />);

    expect(screen.getByRole("button", { name: "Cart full" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Add Margherita Pizza to cart" }),
    ).not.toBeInTheDocument();
  });
});
