import type { OrderStatus } from "./order-status";

/**
 * The shapes that cross the network. The API returns these and the browser
 * consumes them, so both sides are checked against one definition.
 * Dates are ISO strings and money is an integer number of paise.
 */

export type UserRole = "customer" | "admin";

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export const MENU_CATEGORIES = [
  "pizza",
  "burgers",
  "mains",
  "sides",
  "desserts",
  "drinks",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  pizza: "Pizza",
  burgers: "Burgers",
  mains: "Mains",
  sides: "Sides",
  desserts: "Desserts",
  drinks: "Drinks",
};

export type MenuItemDTO = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: MenuCategory;
  isVeg: boolean;
};

export type OrderLineDTO = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type StatusChangeDTO = {
  status: OrderStatus;
  at: string;
};

export type OrderDTO = {
  id: string;
  userId: string;
  items: OrderLineDTO[];
  customer: { name: string; address: string; phone: string };
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  statusHistory: StatusChangeDTO[];
  /** When the order is expected to arrive; null once it is delivered or cancelled. */
  estimatedDeliveryAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSuccess<T> = { data: T };

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    /** Field path to messages, present on validation errors. */
    details?: Record<string, string[]>;
  };
};
