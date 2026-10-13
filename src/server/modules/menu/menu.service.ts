import { connectToDatabase } from "@/server/db/connect";
import {
  type MenuItemDoc,
  MenuItemModel,
} from "@/server/models/menu-item.model";
import { MENU_CATEGORIES, type MenuItemDTO } from "@/shared/types";

export function toMenuItemDTO(item: MenuItemDoc): MenuItemDTO {
  return {
    id: item._id.toString(),
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    category: item.category,
    isVeg: item.isVeg,
  };
}

/** Available items in the order the menu shows them: by section, then position. */
export async function listMenu(): Promise<MenuItemDTO[]> {
  // The menu page calls this directly from a server component, outside the
  // API route wrapper, so it makes sure of the connection itself.
  await connectToDatabase();

  const items = await MenuItemModel.find({ isAvailable: true }).lean();

  const section = (item: MenuItemDoc) => MENU_CATEGORIES.indexOf(item.category);

  return items
    .sort(
      (a, b) =>
        section(a) - section(b) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name),
    )
    .map(toMenuItemDTO);
}
