import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import {
  burger,
  dosa,
  fries,
  pizza,
} from "../../../tests/helpers/menu-fixtures";
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

  it("gives a cuisine such as South Indian a section and a filter of its own", () => {
    render(<MenuBrowser items={[pizza, dosa]} />);

    const southIndian = screen.getByRole("region", { name: "South Indian" });
    expect(
      within(southIndian).getByRole("heading", { name: "Masala Dosa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "South Indian" }),
    ).toBeInTheDocument();
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

describe("MenuBrowser on a long menu", () => {
  const scrollIntoView = vi.fn();
  const original = Element.prototype.scrollIntoView;

  beforeEach(() => {
    scrollIntoView.mockClear();
    // jsdom does not implement scrolling, so the browser call is recorded.
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = original;
  });

  it("brings the start of the menu into view when a section is chosen", async () => {
    const user = userEvent.setup();
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    await user.click(screen.getByRole("button", { name: "Burgers" }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("does not move the page when the menu first appears", () => {
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
