import { expect } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { MenuItemModel } from "@/server/models/menu-item.model";
import { UserModel } from "@/server/models/user.model";
import type { MenuCategory, UserDTO } from "@/shared/types";
import { type TestClient, createTestClient } from "./http";

let sequence = 0;

type MenuItemOverrides = Partial<{
  name: string;
  description: string;
  price: number;
  image: string;
  category: MenuCategory;
  isVeg: boolean;
  isAvailable: boolean;
  sortOrder: number;
}>;

/** Inserts a menu item and returns its id. Defaults to a Rs 249 pizza. */
export async function createMenuItem(overrides: MenuItemOverrides = {}) {
  sequence += 1;
  const item = await MenuItemModel.create({
    name: "Margherita Pizza",
    slug: `item-${sequence}`,
    description: "San Marzano tomato, fresh mozzarella and basil.",
    price: 24900,
    image: "/menu/margherita.jpg",
    category: "pizza",
    isVeg: true,
    isAvailable: true,
    sortOrder: 0,
    ...overrides,
  });
  return item._id.toString();
}

/** Registers a fresh customer through the API and returns their signed-in client. */
export async function signUpCustomer(
  name = "Asha Rao",
): Promise<{ client: TestClient; user: UserDTO }> {
  sequence += 1;
  const client = createTestClient();
  const response = await client.post(register, "/api/v1/auth/register", {
    body: {
      name,
      email: `customer-${sequence}@example.com`,
      password: "correct-horse-9",
    },
    // Each test user comes from its own address, so the sign-up rate limit
    // never interferes with tests that are about something else.
    headers: { "x-forwarded-for": `10.0.0.${sequence}` },
  });
  expect(response.status).toBe(201);
  return { client, user: response.body.data.user };
}

/** Like signUpCustomer, but promoted to admin (there is no API to do that). */
export async function signUpAdmin(): Promise<{
  client: TestClient;
  user: UserDTO;
}> {
  const { client, user } = await signUpCustomer("Kitchen Admin");
  await UserModel.updateOne({ _id: user.id }, { role: "admin" });

  // Sign in again so the access token carries the new role.
  const response = await client.post(login, "/api/v1/auth/login", {
    body: { email: user.email, password: "correct-horse-9" },
    headers: { "x-forwarded-for": `10.1.0.${sequence}` },
  });
  expect(response.status).toBe(200);
  return { client, user: response.body.data.user };
}

export const validCustomer = {
  name: "Asha Rao",
  address: "12 MG Road, Indiranagar, Bengaluru 560038",
  phone: "+91 98765 43210",
};
