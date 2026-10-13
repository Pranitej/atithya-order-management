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

/** Capitals and spacing do not make two names different dishes. */
function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Lists every way a catalogue repeats itself: a slug, a name or a photo used
 * by more than one dish. An empty list means every dish is distinct. The seed
 * script refuses to run while this finds anything, and a test applies it to
 * the real catalogue, so a duplicate cannot reach the menu.
 */
export function findCatalogProblems(catalog: readonly CatalogItem[]): string[] {
  const problems: string[] = [];

  const reportRepeats = (
    label: string,
    keyOf: (item: CatalogItem) => string,
    shownAs: (item: CatalogItem) => string = keyOf,
  ) => {
    const uses = new Map<string, { shown: string; count: number }>();
    for (const item of catalog) {
      const key = keyOf(item);
      const entry = uses.get(key) ?? { shown: shownAs(item), count: 0 };
      entry.count += 1;
      uses.set(key, entry);
    }
    for (const { shown, count } of uses.values()) {
      if (count > 1) {
        problems.push(`${label} "${shown}" is used by ${count} dishes`);
      }
    }
  };

  reportRepeats("Slug", (item) => item.slug);
  reportRepeats(
    "Name",
    (item) => normaliseName(item.name),
    (item) => item.name.trim(),
  );
  reportRepeats("Photo", (item) => item.image);

  return problems;
}

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
    slug: "four-cheese-pizza",
    name: "Four Cheese Pizza",
    description:
      "Mozzarella, cheddar, parmesan and a little blue cheese on a garlic base.",
    price: 32900,
    image: "/menu/four-cheese-pizza.jpg",
    category: "pizza",
    isVeg: true,
    sortOrder: 4,
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
    slug: "garden-veggie-burger",
    name: "Garden Veggie Burger",
    description:
      "A crisp vegetable and quinoa patty with avocado, tomato and rocket.",
    price: 21900,
    image: "/menu/garden-veggie-burger.jpg",
    category: "burgers",
    isVeg: true,
    sortOrder: 4,
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
    slug: "tandoori-chicken",
    name: "Tandoori Chicken",
    description:
      "Half a chicken marinated overnight in yoghurt and spices, roasted until charred.",
    price: 33900,
    image: "/menu/tandoori-chicken.jpg",
    category: "mains",
    isVeg: false,
    sortOrder: 4,
  },
  {
    slug: "masala-dosa",
    name: "Masala Dosa",
    description:
      "A crisp rice crepe filled with spiced potato, served with sambar and chutneys.",
    price: 14900,
    image: "/menu/masala-dosa.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 5,
  },
  {
    slug: "idli-vada-sambar",
    name: "Idli Vada Sambar",
    description:
      "Steamed idlis and a crisp medu vada with sambar and coconut chutney.",
    price: 12900,
    image: "/menu/idli-vada-sambar.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 6,
  },
  {
    slug: "veg-hakka-noodles",
    name: "Veg Hakka Noodles",
    description:
      "Wok-tossed noodles with cabbage, carrot and spring onion in soy and chilli.",
    price: 18900,
    image: "/menu/veg-hakka-noodles.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 7,
  },
  {
    slug: "veg-fried-rice",
    name: "Veg Fried Rice",
    description:
      "Rice stir-fried over high heat with beans, carrot and spring onion.",
    price: 17900,
    image: "/menu/veg-fried-rice.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 8,
  },
  {
    slug: "penne-arrabbiata",
    name: "Penne Arrabbiata",
    description: "Penne in a tomato sauce with garlic, chilli and basil.",
    price: 24900,
    image: "/menu/penne-arrabbiata.jpg",
    category: "mains",
    isVeg: true,
    sortOrder: 9,
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
    slug: "punjabi-samosa",
    name: "Punjabi Samosa",
    description:
      "Two flaky samosas filled with spiced potato and peas, with mint chutney.",
    price: 5900,
    image: "/menu/punjabi-samosa.jpg",
    category: "sides",
    isVeg: true,
    sortOrder: 3,
  },
  {
    slug: "paneer-tikka",
    name: "Paneer Tikka",
    description:
      "Paneer, peppers and onion marinated in spiced yoghurt and grilled on skewers.",
    price: 24900,
    image: "/menu/paneer-tikka.jpg",
    category: "sides",
    isVeg: true,
    sortOrder: 4,
  },
  {
    slug: "steamed-veg-momos",
    name: "Steamed Veg Momos",
    description:
      "Eight dumplings filled with cabbage and carrot, with a fiery tomato dip.",
    price: 13900,
    image: "/menu/steamed-veg-momos.jpg",
    category: "sides",
    isVeg: true,
    sortOrder: 5,
  },
  {
    slug: "grilled-cheese-sandwich",
    name: "Grilled Cheese Sandwich",
    description:
      "Three cheeses melted between thick slices of bread, grilled in butter.",
    price: 14900,
    image: "/menu/grilled-cheese-sandwich.jpg",
    category: "sides",
    isVeg: true,
    sortOrder: 6,
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
    slug: "blueberry-cheesecake",
    name: "Blueberry Cheesecake",
    description:
      "Baked cheesecake on a biscuit base, topped with blueberry compote.",
    price: 18900,
    image: "/menu/blueberry-cheesecake.jpg",
    category: "desserts",
    isVeg: true,
    sortOrder: 3,
  },
  {
    slug: "belgian-waffles",
    name: "Belgian Waffles",
    description: "Two crisp waffles with blueberries and maple syrup.",
    price: 17900,
    image: "/menu/belgian-waffles.jpg",
    category: "desserts",
    isVeg: true,
    sortOrder: 4,
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
  {
    slug: "fresh-orange-juice",
    name: "Fresh Orange Juice",
    description: "Oranges squeezed to order, with nothing added.",
    price: 9900,
    image: "/menu/fresh-orange-juice.jpg",
    category: "drinks",
    isVeg: true,
    sortOrder: 4,
  },
  {
    slug: "strawberry-milkshake",
    name: "Strawberry Milkshake",
    description: "Fresh strawberries blended with milk and vanilla ice cream.",
    price: 15900,
    image: "/menu/strawberry-milkshake.jpg",
    category: "drinks",
    isVeg: true,
    sortOrder: 5,
  },
];
