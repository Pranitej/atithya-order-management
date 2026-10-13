import { describe, expect, it } from "vitest";
import { GET as getMenu } from "@/app/api/v1/menu/route";
import { createMenuItem } from "../helpers/factories";
import { createTestClient } from "../helpers/http";

const MENU = "/api/v1/menu";

describe("GET /menu", () => {
  it("returns each item with what the menu needs to display it", async () => {
    const id = await createMenuItem({
      name: "Smash Burger",
      description: "Double patty, cheddar, pickles.",
      price: 28900,
      image: "/menu/smash-burger.jpg",
      category: "burgers",
      isVeg: false,
    });

    const response = await createTestClient().get(getMenu, MENU);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([
      {
        id,
        name: "Smash Burger",
        description: "Double patty, cheddar, pickles.",
        price: 28900,
        image: "/menu/smash-burger.jpg",
        category: "burgers",
        isVeg: false,
      },
    ]);
  });

  it("is available without signing in", async () => {
    await createMenuItem();

    const response = await createTestClient().get(getMenu, MENU);

    expect(response.status).toBe(200);
  });

  it("leaves out items that are currently unavailable", async () => {
    await createMenuItem({ name: "In Stock" });
    await createMenuItem({ name: "Sold Out", isAvailable: false });

    const response = await createTestClient().get(getMenu, MENU);

    const names = response.body.data.items.map(
      (item: { name: string }) => item.name,
    );
    expect(names).toEqual(["In Stock"]);
  });

  it("orders items by menu section, then by position within the section", async () => {
    await createMenuItem({ name: "Cola", category: "drinks", sortOrder: 0 });
    await createMenuItem({
      name: "Farmhouse",
      category: "pizza",
      sortOrder: 2,
    });
    await createMenuItem({
      name: "Smash Burger",
      category: "burgers",
      sortOrder: 0,
    });
    await createMenuItem({
      name: "Margherita",
      category: "pizza",
      sortOrder: 1,
    });

    const response = await createTestClient().get(getMenu, MENU);

    const names = response.body.data.items.map(
      (item: { name: string }) => item.name,
    );
    expect(names).toEqual(["Margherita", "Farmhouse", "Smash Burger", "Cola"]);
  });

  it("lists the sections in the order the menu shows them", async () => {
    // Created out of order on purpose.
    const sections = [
      ["drinks", "Cola"],
      ["salads", "Greek Salad"],
      ["pasta", "Penne"],
      ["sides", "Fries"],
      ["south-indian", "Dosa"],
      ["desserts", "Brownie"],
      ["wraps", "Chicken Wrap"],
      ["pizza", "Margherita"],
      ["chinese", "Hakka Noodles"],
      ["indian", "Biryani"],
      ["burgers", "Smash Burger"],
    ] as const;
    for (const [category, name] of sections) {
      await createMenuItem({ name, category });
    }

    const response = await createTestClient().get(getMenu, MENU);

    const names = response.body.data.items.map(
      (item: { name: string }) => item.name,
    );
    expect(names).toEqual([
      "Margherita",
      "Smash Burger",
      "Biryani",
      "Dosa",
      "Hakka Noodles",
      "Penne",
      "Chicken Wrap",
      "Greek Salad",
      "Fries",
      "Brownie",
      "Cola",
    ]);
  });

  it("returns an empty list when the menu has no items", async () => {
    const response = await createTestClient().get(getMenu, MENU);

    expect(response.body.data.items).toEqual([]);
  });
});
