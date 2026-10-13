import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  type CatalogItem,
  MENU_CATALOG,
  findCatalogProblems,
} from "./menu.catalog";

function dish(overrides: Partial<CatalogItem>): CatalogItem {
  return {
    slug: "masala-dosa",
    name: "Masala Dosa",
    description: "A crisp rice crepe filled with spiced potato.",
    price: 14900,
    image: "/menu/masala-dosa.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 1,
    ...overrides,
  };
}

const samosa = dish({
  slug: "punjabi-samosa",
  name: "Punjabi Samosa",
  image: "/menu/punjabi-samosa.jpg",
});

describe("findCatalogProblems", () => {
  it("finds nothing wrong with dishes that are all different", () => {
    expect(findCatalogProblems([dish({}), samosa])).toEqual([]);
  });

  it("reports two dishes that share a slug", () => {
    const problems = findCatalogProblems([
      dish({}),
      dish({ name: "Plain Dosa", image: "/menu/plain-dosa.jpg" }),
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("masala-dosa");
  });

  it("reports the same dish name listed twice", () => {
    const problems = findCatalogProblems([
      dish({}),
      dish({ slug: "masala-dosa-2", image: "/menu/masala-dosa-2.jpg" }),
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Masala Dosa");
  });

  it("treats names that differ only in capitals or spacing as the same dish", () => {
    const problems = findCatalogProblems([
      dish({}),
      dish({
        slug: "masala-dosa-2",
        name: "  masala   DOSA ",
        image: "/menu/masala-dosa-2.jpg",
      }),
    ]);

    expect(problems).toHaveLength(1);
  });

  it("reports two dishes that use the same photo", () => {
    const problems = findCatalogProblems([
      dish({}),
      { ...samosa, image: "/menu/masala-dosa.jpg" },
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("/menu/masala-dosa.jpg");
  });

  it("reports every problem at once, not just the first", () => {
    const problems = findCatalogProblems([dish({}), dish({}), samosa, samosa]);

    // Each pair clashes on slug, name and photo.
    expect(problems).toHaveLength(6);
  });

  it("reports a dish listed three times once, not twice", () => {
    const problems = findCatalogProblems([
      dish({}),
      dish({ name: "Plain Dosa", image: "/menu/a.jpg" }),
      dish({ name: "Rava Dosa", image: "/menu/b.jpg" }),
    ]);

    expect(problems).toHaveLength(1);
  });
});

describe("the real menu catalogue", () => {
  it("has no duplicated dish, name or photo", () => {
    expect(findCatalogProblems(MENU_CATALOG)).toEqual([]);
  });

  it("has a photo on disk for every dish", () => {
    const missing = MENU_CATALOG.filter(
      (item) => !existsSync(path.join(process.cwd(), "public", item.image)),
    ).map((item) => item.image);

    expect(missing).toEqual([]);
  });

  it("never uses the same picture under two file names", () => {
    const dishesByPicture = new Map<string, string[]>();
    for (const item of MENU_CATALOG) {
      const file = path.join(process.cwd(), "public", item.image);
      const fingerprint = createHash("sha1")
        .update(readFileSync(file))
        .digest("hex");
      dishesByPicture.set(fingerprint, [
        ...(dishesByPicture.get(fingerprint) ?? []),
        item.name,
      ]);
    }

    const shared = [...dishesByPicture.values()].filter(
      (names) => names.length > 1,
    );
    expect(shared).toEqual([]);
  });

  it("prices every dish as a positive whole number of paise", () => {
    const badlyPriced = MENU_CATALOG.filter(
      (item) => !Number.isInteger(item.price) || item.price <= 0,
    ).map((item) => item.name);

    expect(badlyPriced).toEqual([]);
  });
});
