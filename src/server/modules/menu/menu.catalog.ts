import type { MenuCategory } from "@/shared/types";

export type CatalogItem = {
  slug: string;
  name: string;
  description: string;
  /** Price in paise. */
  price: number;
  image: string;
  category: MenuCategory;
  isVeg: boolean;
  sortOrder: number;
};

/**
 * The kitchen's menu. `npm run seed` writes this into the database, matching
 * on `slug`, so it can be run again after an edit without creating duplicates.
 * Photos are stored in /public/menu (source: Unsplash, free to use).
 */
export const MENU_CATALOG: CatalogItem[] = [
  {
    slug: "margherita-pizza",
    name: "Margherita Pizza",
    description:
      "Slow-fermented dough, San Marzano tomato, fresh mozzarella and torn basil.",
    price: 24900,
    image: "/menu/margherita-pizza.jpg",
    category: "pizza",
    isVeg: true,
    sortOrder: 1,
  },
  {
    slug: "chicken-tikka-pizza",
    name: "Chicken Tikka Pizza",
    description:
      "Tandoor-charred chicken tikka, red onion and coriander on a makhani base.",
    price: 34900,
    image: "/menu/chicken-tikka-pizza.jpg",
    category: "pizza",
    isVeg: false,
    sortOrder: 2,
  },
  {
    slug: "pepperoni-pizza",
    name: "Pepperoni Pizza",
    description:
      "Double pepperoni that crisps at the edges, over tomato and mozzarella.",
    price: 37900,
    image: "/menu/pepperoni-pizza.jpg",
    category: "pizza",
    isVeg: false,
    sortOrder: 3,
  },
  {
    slug: "double-smash-burger",
    name: "Double Smash Burger",
    description:
      "Two smashed patties, melted cheddar, pickles and house sauce in a butter-toasted bun.",
    price: 28900,
    image: "/menu/double-smash-burger.jpg",
    category: "burgers",
    isVeg: false,
    sortOrder: 1,
  },
  {
    slug: "crispy-chicken-burger",
    name: "Crispy Chicken Burger",
    description:
      "Buttermilk-fried chicken thigh, crunchy slaw and chilli mayo.",
    price: 25900,
    image: "/menu/crispy-chicken-burger.jpg",
    category: "burgers",
    isVeg: false,
    sortOrder: 2,
  },
  {
    slug: "classic-cheeseburger",
    name: "Classic Cheeseburger",
    description:
      "A single patty with cheese, lettuce, tomato and onion on a sesame bun.",
    price: 22900,
    image: "/menu/classic-cheeseburger.jpg",
    category: "burgers",
    isVeg: false,
    sortOrder: 3,
  },
  {
    slug: "chicken-biryani",
    name: "Hyderabadi Chicken Biryani",
    description:
      "Long-grain basmati and chicken cooked dum-style with saffron, mint and fried onion.",
    price: 31900,
    image: "/menu/chicken-biryani.jpg",
    category: "mains",
    isVeg: false,
    sortOrder: 1,
  },
  {
    slug: "butter-chicken-naan",
    name: "Butter Chicken with Naan",
    description:
      "Chicken in a smooth tomato and butter gravy, with two garlic naan.",
    price: 34900,
    image: "/menu/butter-chicken-naan.jpg",
    category: "mains",
    isVeg: false,
    sortOrder: 2,
  },
  {
    slug: "paneer-butter-masala",
    name: "Paneer Butter Masala",
    description:
      "Soft paneer in a mildly spiced tomato and cashew gravy, served with jeera rice.",
    price: 28900,
    image: "/menu/paneer-butter-masala.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 3,
  },
  {
    slug: "masala-fries",
    name: "Masala Fries",
    description: "Skin-on fries tossed in chaat masala, with garlic dip.",
    price: 9900,
    image: "/menu/masala-fries.jpg",
    category: "sides",
    isVeg: true,
    sortOrder: 1,
  },
  {
    slug: "hot-chicken-wings",
    name: "Hot Chicken Wings",
    description:
      "Six wings glazed in a sticky chilli sauce, with a cooling ranch dip.",
    price: 22900,
    image: "/menu/hot-chicken-wings.jpg",
    category: "sides",
    isVeg: false,
    sortOrder: 2,
  },
  {
    slug: "chocolate-brownie",
    name: "Chocolate Brownie",
    description: "Dense and fudgy, baked with dark chocolate and walnuts.",
    price: 14900,
    image: "/menu/chocolate-brownie.jpg",
    category: "desserts",
    isVeg: true,
    sortOrder: 1,
  },
  {
    slug: "glazed-doughnuts",
    name: "Glazed Doughnuts",
    description: "Three fresh doughnuts with chocolate glaze and sprinkles.",
    price: 12900,
    image: "/menu/glazed-doughnuts.jpg",
    category: "desserts",
    isVeg: true,
    sortOrder: 2,
  },
  {
    slug: "iced-coffee",
    name: "Iced Coffee",
    description: "Cold-brewed coffee over ice with a splash of milk.",
    price: 13900,
    image: "/menu/iced-coffee.jpg",
    category: "drinks",
    isVeg: true,
    sortOrder: 1,
  },
  {
    slug: "fresh-lime-soda",
    name: "Fresh Lime Soda",
    description: "Squeezed lime, soda and mint. Sweet, salted or both.",
    price: 7900,
    image: "/menu/fresh-lime-soda.jpg",
    category: "drinks",
    isVeg: true,
    sortOrder: 2,
  },
  {
    slug: "oreo-milkshake",
    name: "Oreo Milkshake",
    description: "Thick vanilla shake blended with Oreo and chocolate sauce.",
    price: 16900,
    image: "/menu/oreo-milkshake.jpg",
    category: "drinks",
    isVeg: true,
    sortOrder: 3,
  },
];
