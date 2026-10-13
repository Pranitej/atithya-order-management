import type { MenuItemDTO } from "@/shared/types";

/** Menu items shared by component tests. Prices are in paise. */

export const pizza: MenuItemDTO = {
  id: "64b7f0c2a1d3e4f5a6b7c8d1",
  name: "Margherita Pizza",
  description: "San Marzano tomato, fresh mozzarella and basil.",
  price: 24900,
  image: "/menu/margherita.jpg",
  category: "pizza",
  isVeg: true,
};

export const burger: MenuItemDTO = {
  id: "64b7f0c2a1d3e4f5a6b7c8d2",
  name: "Smash Burger",
  description: "Double patty, cheddar, pickles.",
  price: 28900,
  image: "/menu/smash-burger.jpg",
  category: "burgers",
  isVeg: false,
};

export const fries: MenuItemDTO = {
  id: "64b7f0c2a1d3e4f5a6b7c8d3",
  name: "Masala Fries",
  description: "Crisp fries tossed in chaat masala.",
  price: 9900,
  image: "/menu/fries.jpg",
  category: "sides",
  isVeg: true,
};

export const dosa: MenuItemDTO = {
  id: "64b7f0c2a1d3e4f5a6b7c8d4",
  name: "Masala Dosa",
  description: "A crisp rice crepe filled with spiced potato.",
  price: 14900,
  image: "/menu/masala-dosa.jpg",
  category: "south-indian",
  isVeg: true,
};
