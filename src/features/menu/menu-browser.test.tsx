import { fireEvent, render, screen, within } from "@testing-library/react";
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

describe("MenuBrowser section strip", () => {
  const isStrip = (element: Element) =>
    element.getAttribute("aria-label") === "Menu sections";

  /** jsdom has no layout, so the strip's sizes are supplied by hand. */
  function givenStripLayout(layout: { visible: number; total: number }) {
    vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(
      function (this: Element) {
        return isStrip(this) ? layout.visible : 0;
      },
    );
    vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(
      function (this: Element) {
        return isStrip(this) ? layout.total : 0;
      },
    );
  }

  const strip = () => screen.getByRole("navigation", { name: "Menu sections" });
  const forward = () => screen.queryByTitle("Show more sections");
  const back = () => screen.queryByTitle("Show earlier sections");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows no arrows when every section fits", () => {
    givenStripLayout({ visible: 900, total: 900 });

    render(<MenuBrowser items={[pizza, burger, fries]} />);

    expect(forward()).not.toBeInTheDocument();
    expect(back()).not.toBeInTheDocument();
  });

  it("offers an arrow towards the sections that do not fit", () => {
    givenStripLayout({ visible: 300, total: 900 });

    render(<MenuBrowser items={[pizza, burger, fries]} />);

    expect(forward()).toBeInTheDocument();
    // Nothing is hidden to the left yet.
    expect(back()).not.toBeInTheDocument();
  });

  it("scrolls the strip forward when that arrow is used", async () => {
    const user = userEvent.setup();
    givenStripLayout({ visible: 300, total: 900 });
    const scrollBy = vi.spyOn(Element.prototype, "scrollBy");
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    await user.click(forward()!);

    expect(scrollBy).toHaveBeenCalledTimes(1);
    const [{ left }] = scrollBy.mock.calls[0] as unknown as [ScrollToOptions];
    expect(left).toBeGreaterThan(0);
  });

  it("offers the way back once the strip has been scrolled along", () => {
    givenStripLayout({ visible: 300, total: 900 });
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    // Scrolled all the way to the end: 600 + 300 visible = 900.
    Object.defineProperty(strip(), "scrollLeft", {
      configurable: true,
      value: 600,
    });
    fireEvent.scroll(strip());

    expect(back()).toBeInTheDocument();
    expect(forward()).not.toBeInTheDocument();
  });

  it("scrolls the strip backward when the back arrow is used", async () => {
    const user = userEvent.setup();
    givenStripLayout({ visible: 300, total: 900 });
    const scrollBy = vi.spyOn(Element.prototype, "scrollBy");
    render(<MenuBrowser items={[pizza, burger, fries]} />);
    Object.defineProperty(strip(), "scrollLeft", {
      configurable: true,
      value: 300,
    });
    fireEvent.scroll(strip());

    await user.click(back()!);

    const [{ left }] = scrollBy.mock.calls[0] as unknown as [ScrollToOptions];
    expect(left).toBeLessThan(0);
  });

  it("keeps the arrows out of the list of sections", () => {
    givenStripLayout({ visible: 300, total: 900 });

    render(<MenuBrowser items={[pizza, burger, fries]} />);

    const sectionButtons = within(strip())
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(sectionButtons).toEqual(["All", "Pizza", "Burgers", "Sides"]);
  });

  it("moves the strip so the chosen section's button stays in view", async () => {
    const user = userEvent.setup();
    givenStripLayout({ visible: 300, total: 900 });
    const scrollTo = vi.spyOn(Element.prototype, "scrollTo");
    render(<MenuBrowser items={[pizza, burger, fries]} />);

    await user.click(screen.getByRole("button", { name: "Sides" }));

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
