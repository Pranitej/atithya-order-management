import { type Model, Schema, type Types, model, models } from "mongoose";
import { MENU_CATEGORIES, type MenuCategory } from "@/shared/types";

export type MenuItemDoc = {
  _id: Types.ObjectId;
  name: string;
  /** Stable identifier used by the seed script to update items in place. */
  slug: string;
  description: string;
  /** Price in paise. */
  price: number;
  image: string;
  category: MenuCategory;
  isVeg: boolean;
  isAvailable: boolean;
  /** Position within its category on the menu. */
  sortOrder: number;
};

const menuItemSchema = new Schema<MenuItemDoc>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, required: true },
  category: { type: String, enum: MENU_CATEGORIES, required: true },
  isVeg: { type: Boolean, required: true, default: false },
  isAvailable: { type: Boolean, required: true, default: true },
  sortOrder: { type: Number, required: true, default: 0 },
});

export const MenuItemModel: Model<MenuItemDoc> =
  (models.MenuItem as Model<MenuItemDoc> | undefined) ??
  model<MenuItemDoc>("MenuItem", menuItemSchema);
