import { describe, expect, it } from "vitest";
import { MenuItemModel } from "@/server/models/menu-item.model";
import type { CatalogItem } from "@/server/modules/menu/menu.catalog";
import { seedMenu } from "@/server/modules/menu/menu.seed";
import { listMenu } from "@/server/modules/menu/menu.service";

const dosa: CatalogItem = {
  slug: "masala-dosa",
  name: "Masala Dosa",
  description: "A crisp rice crepe filled with spiced potato.",
  price: 14900,
  image: "/menu/masala-dosa.jpg",
  category: "south-indian",
  isVeg: true,
  sortOrder: 1,
};

const samosa: CatalogItem = {
  slug: "punjabi-samosa",
  name: "Punjabi Samosa",
  description: "Two flaky samosas with mint chutney.",
  price: 5900,
  image: "/menu/punjabi-samosa.jpg",
  category: "sides",
  isVeg: true,
  sortOrder: 1,
};

const namesOnMenu = async () => (await listMenu()).map((item) => item.name);

const idOf = async (slug: string) =>
  (await MenuItemModel.findOne({ slug }).lean())?._id.toString();

describe("seedMenu", () => {
  it("puts every dish in the catalogue on the menu", async () => {
    await seedMenu([dosa, samosa]);

    expect(await namesOnMenu()).toEqual(["Masala Dosa", "Punjabi Samosa"]);
  });

  it("adds nothing when it is run a second time", async () => {
    await seedMenu([dosa, samosa]);

    await seedMenu([dosa, samosa]);

    expect(await MenuItemModel.countDocuments()).toBe(2);
    expect(await namesOnMenu()).toEqual(["Masala Dosa", "Punjabi Samosa"]);
  });

  it("stays at one copy of each dish however many times it runs", async () => {
    for (let run = 0; run < 5; run++) await seedMenu([dosa, samosa]);

    expect(await MenuItemModel.countDocuments({ slug: "masala-dosa" })).toBe(1);
    expect(await MenuItemModel.countDocuments()).toBe(2);
  });

  it("updates a dish in place, so orders that refer to it still do", async () => {
    await seedMenu([dosa]);
    const idBefore = await idOf("masala-dosa");

    await seedMenu([{ ...dosa, price: 16900, name: "Ghee Masala Dosa" }]);

    expect(await idOf("masala-dosa")).toBe(idBefore);
    const [item] = await listMenu();
    expect(item).toMatchObject({ name: "Ghee Masala Dosa", price: 16900 });
  });

  it("takes a dish off the menu when it leaves the catalogue, without deleting it", async () => {
    await seedMenu([dosa, samosa]);

    await seedMenu([dosa]);

    expect(await namesOnMenu()).toEqual(["Masala Dosa"]);
    // Still stored, because past orders point at it.
    expect(await MenuItemModel.countDocuments({ slug: "punjabi-samosa" })).toBe(
      1,
    );
  });

  it("puts a dish back on the menu when it returns to the catalogue", async () => {
    await seedMenu([dosa, samosa]);
    await seedMenu([dosa]);

    await seedMenu([dosa, samosa]);

    expect(await namesOnMenu()).toEqual(["Masala Dosa", "Punjabi Samosa"]);
    expect(await MenuItemModel.countDocuments()).toBe(2);
  });

  it("reports how many dishes are on the menu and how many it took off", async () => {
    await seedMenu([dosa, samosa]);

    const result = await seedMenu([dosa]);

    expect(result).toEqual({ available: 1, retired: 1 });
  });

  it("refuses a catalogue that lists the same dish twice", async () => {
    await expect(
      seedMenu([dosa, { ...samosa, slug: "masala-dosa" }]),
    ).rejects.toThrow(/masala-dosa/);
  });

  it("changes nothing in the database when it refuses a catalogue", async () => {
    await seedMenu([dosa]);

    await seedMenu([
      samosa,
      { ...samosa, slug: "samosa-again", image: "/menu/other.jpg" },
    ]).catch(() => undefined);

    expect(await namesOnMenu()).toEqual(["Masala Dosa"]);
    expect(await MenuItemModel.countDocuments()).toBe(1);
  });
});
