import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import { burger, fries, pizza } from "../../../tests/helpers/menu-fixtures";
import { MenuBrowser } from "./menu-browser";

const dishNames = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

beforeEach(() => {
  localStorage.clear();
  cartStore.setState({ lines: [] });
});

describe("MenuBrowser", () => {
  it("shows every dish, grouped under its section", () => {
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    const burgers = screen.getByRole("region", { name: "Burgers" });
    expect(
      within(burgers).getByRole("heading", { name: "Smash Burger" }),
    ).toBeInTheDocument();
    expect(dishNames()).toEqual([
      "Margherita Pizza",
      "Smash Burger",
      "Masala Fries",
    ]);
  });

  it("offers a filter only for sections that have dishes", () => {
    render(<MenuBrowser items={[pizza, fries]} />);

    const filters = within(
      screen.getByRole("navigation", { name: "Menu sections" }),
    )
      .getAllByRole("button")
      .map((button) => button.textContent);

    expect(filters).toEqual(["All", "Pizza", "Sides"]);
  });

  it("shows only the chosen section", async () => {
    const user = userEvent.setup();
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    await user.click(screen.getByRole("button", { name: "Burgers" }));

    expect(dishNames()).toEqual(["Smash Burger"]);
  });

  it("marks which filter is active", async () => {
    const user = userEvent.setup();
    render(<MenuBrowser items={[pizza, burger]} />);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Burgers" }));

    expect(screen.getByRole("button", { name: "Burgers" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows everything again when All is chosen", async () => {
    const user = userEvent.setup();
    render(<MenuBrowser items={[pizza, burger]} />);
    await user.click(screen.getByRole("button", { name: "Burgers" }));

    await user.click(screen.getByRole("button", { name: "All" }));

    expect(dishNames()).toEqual(["Margherita Pizza", "Smash Burger"]);
  });

  it("explains when there is nothing on the menu", () => {
    render(<MenuBrowser items={[]} />);

    expect(
      screen.getByRole("heading", { name: "The kitchen is closed right now" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Menu sections" }),
    ).not.toBeInTheDocument();
  });
});
