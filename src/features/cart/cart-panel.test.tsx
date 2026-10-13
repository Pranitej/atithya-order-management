import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { fries, pizza } from "../../../tests/helpers/menu-fixtures";
import { CartPanel } from "./cart-panel";
import { cartStore } from "./cart-store";

/** The amount shown next to a label in the price breakdown, e.g. "Subtotal". */
function amountFor(label: string) {
  const term = screen.getByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent;
}

function fillCart(...items: (typeof pizza)[]) {
  for (const item of items) cartStore.getState().add(item);
}

beforeEach(() => {
  localStorage.clear();
  cartStore.setState({ lines: [] });
});

describe("CartPanel when empty", () => {
  it("says the cart is empty and points back to the menu", () => {
    render(<CartPanel />);

    expect(
      screen.getByRole("heading", { name: "Your cart is empty" }),
    ).toBeInTheDocument();
  });

  it("offers no way to check out", () => {
    render(<CartPanel />);

    expect(
      screen.queryByRole("link", { name: /checkout/i }),
    ).not.toBeInTheDocument();
  });
});

describe("CartPanel with items", () => {
  it("lists each dish with its quantity and line total", () => {
    fillCart(pizza, pizza, fries);

    render(<CartPanel />);

    const pizzaRow = screen.getByRole("listitem", { name: "Margherita Pizza" });
    expect(within(pizzaRow).getByText("2")).toBeInTheDocument();
    expect(within(pizzaRow).getByText("₹498")).toBeInTheDocument();

    const friesRow = screen.getByRole("listitem", { name: "Masala Fries" });
    expect(within(friesRow).getByText("₹99")).toBeInTheDocument();
  });

  it("breaks the bill down into subtotal, delivery, taxes and total", () => {
    // 2 x 249 + 99 = 597, which is over the free delivery threshold.
    fillCart(pizza, pizza, fries);

    render(<CartPanel />);

    expect(amountFor("Subtotal")).toBe("₹597");
    expect(amountFor("Delivery")).toBe("Free");
    expect(amountFor("Taxes (5%)")).toBe("₹29.85");
    expect(amountFor("Total")).toBe("₹626.85");
  });

  it("charges delivery on a small order and says how to avoid it", () => {
    fillCart(pizza);

    render(<CartPanel />);

    expect(amountFor("Delivery")).toBe("₹40");
    expect(
      screen.getByText("Add ₹251 more for free delivery"),
    ).toBeInTheDocument();
  });

  it("drops the free delivery hint once the order qualifies", () => {
    fillCart(pizza, pizza, fries);

    render(<CartPanel />);

    expect(
      screen.queryByText(/more for free delivery/),
    ).not.toBeInTheDocument();
  });

  it("updates the bill when a quantity is raised", async () => {
    const user = userEvent.setup();
    fillCart(pizza);
    render(<CartPanel />);

    await user.click(
      screen.getByRole("button", { name: "Add one more Margherita Pizza" }),
    );

    expect(amountFor("Subtotal")).toBe("₹498");
  });

  it("removes a dish when its quantity is taken to zero", async () => {
    const user = userEvent.setup();
    fillCart(pizza, fries);
    render(<CartPanel />);

    await user.click(
      screen.getByRole("button", { name: "Remove Masala Fries" }),
    );

    expect(
      screen.queryByRole("listitem", { name: "Masala Fries" }),
    ).not.toBeInTheDocument();
    expect(amountFor("Subtotal")).toBe("₹249");
  });

  it("shows the empty message after the last dish is removed", async () => {
    const user = userEvent.setup();
    fillCart(pizza);
    render(<CartPanel />);

    await user.click(
      screen.getByRole("button", { name: "Remove Margherita Pizza" }),
    );

    expect(
      screen.getByRole("heading", { name: "Your cart is empty" }),
    ).toBeInTheDocument();
  });

  it("links to checkout", () => {
    fillCart(pizza);

    render(<CartPanel />);

    expect(
      screen.getByRole("link", { name: "Go to checkout" }),
    ).toHaveAttribute("href", "/checkout");
  });
});
