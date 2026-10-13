import { MenuItemModel } from "@/server/models/menu-item.model";
import {
  type CatalogItem,
  MENU_CATALOG,
  findCatalogProblems,
} from "./menu.catalog";

export type SeedMenuResult = {
  /** Dishes on the menu after seeding. */
  available: number;
  /** Dishes taken off the menu by this run. */
  retired: number;
};

/**
 * Makes the menu in the database match the catalogue. It can be run any
 * number of times and never leaves two copies of a dish:
 *
 * - A catalogue that repeats a slug, name or photo is refused outright,
 *   before anything is written.
 * - Each dish is matched on its slug and updated in place, so it keeps its
 *   id and the orders that refer to it. A unique index on `slug` backs this
 *   up at the database level.
 * - A dish that has left the catalogue is taken off the menu but not
 *   deleted, because past orders still point at it.
 */
export async function seedMenu(
  catalog: readonly CatalogItem[] = MENU_CATALOG,
): Promise<SeedMenuResult> {
  const problems = findCatalogProblems(catalog);
  if (problems.length > 0) {
    throw new Error(
      `The menu catalogue lists a dish more than once:\n${problems
        .map((problem) => `  - ${problem}`)
        .join("\n")}`,
    );
  }

  if (catalog.length > 0) {
    await MenuItemModel.bulkWrite(
      catalog.map((item) => ({
        updateOne: {
          filter: { slug: item.slug },
          update: { $set: { ...item, isAvailable: true } },
          upsert: true,
        },
      })),
    );
  }

  const retired = await MenuItemModel.updateMany(
    { slug: { $nin: catalog.map((item) => item.slug) }, isAvailable: true },
    { $set: { isAvailable: false } },
  );

  return { available: catalog.length, retired: retired.modifiedCount };
}
