import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  deliveryDetailsSchema,
  loginSchema,
  registerSchema,
  updateOrderStatusSchema,
} from "./schemas";

const ITEM_A = "64b7f0c2a1d3e4f5a6b7c8d9";
const ITEM_B = "64b7f0c2a1d3e4f5a6b7c8da";

const validCustomer = {
  name: "Asha Rao",
  address: "12 MG Road, Indiranagar, Bengaluru 560038",
  phone: "+91 98765 43210",
};

/** Paths of every issue, e.g. ["customer.phone"], so tests don't depend on message wording. */
function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("deliveryDetailsSchema", () => {
  it("accepts complete details", () => {
    expect(deliveryDetailsSchema.safeParse(validCustomer).success).toBe(true);
  });

  it("trims surrounding whitespace from the name and address", () => {
    const parsed = deliveryDetailsSchema.parse({
      ...validCustomer,
      name: "  Asha Rao  ",
      address: "  12 MG Road, Indiranagar, Bengaluru  ",
    });

    expect(parsed.name).toBe("Asha Rao");
    expect(parsed.address).toBe("12 MG Road, Indiranagar, Bengaluru");
  });

  it("strips spaces, dashes and brackets from the phone number", () => {
    const parsed = deliveryDetailsSchema.parse({
      ...validCustomer,
      phone: "+91 (98765) 432-10",
    });

    expect(parsed.phone).toBe("+919876543210");
  });

  it("rejects a name that is only whitespace", () => {
    const result = deliveryDetailsSchema.safeParse({ ...validCustomer, name: "   " });

    expect(issuePaths(result)).toEqual(["name"]);
  });

  it("rejects an address too short to deliver to", () => {
    const result = deliveryDetailsSchema.safeParse({ ...validCustomer, address: "Flat 2" });

    expect(issuePaths(result)).toEqual(["address"]);
  });

  it.each(["12345", "phone-number", "+91 98765 4321x", "1234567890123456"])(
    "rejects the phone number %s",
    (phone) => {
      const result = deliveryDetailsSchema.safeParse({ ...validCustomer, phone });

      expect(issuePaths(result)).toEqual(["phone"]);
    },
  );

  it("reports every missing field at once", () => {
    const result = deliveryDetailsSchema.safeParse({});

    expect(issuePaths(result).sort()).toEqual(["address", "name", "phone"]);
  });
});

describe("createOrderSchema", () => {
  const validOrder = {
    items: [
      { menuItemId: ITEM_A, quantity: 2 },
      { menuItemId: ITEM_B, quantity: 1 },
    ],
    customer: validCustomer,
  };

  it("accepts a valid order", () => {
    expect(createOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("rejects an order with no items", () => {
    const result = createOrderSchema.safeParse({ ...validOrder, items: [] });

    expect(issuePaths(result)).toEqual(["items"]);
  });

  it.each([0, -1, 1.5, 21])("rejects a quantity of %s", (quantity) => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      items: [{ menuItemId: ITEM_A, quantity }],
    });

    expect(issuePaths(result)).toEqual(["items.0.quantity"]);
  });

  it("rejects a quantity sent as a string", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      items: [{ menuItemId: ITEM_A, quantity: "2" }],
    });

    expect(issuePaths(result)).toEqual(["items.0.quantity"]);
  });

  it("rejects a menu item id that is not a database id", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      items: [{ menuItemId: "pizza", quantity: 1 }],
    });

    expect(issuePaths(result)).toEqual(["items.0.menuItemId"]);
  });

  it("rejects the same menu item listed twice", () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      items: [
        { menuItemId: ITEM_A, quantity: 1 },
        { menuItemId: ITEM_A, quantity: 3 },
      ],
    });

    expect(issuePaths(result)).toEqual(["items.1.menuItemId"]);
  });

  it("rejects an order without delivery details", () => {
    const result = createOrderSchema.safeParse({ items: validOrder.items });

    expect(issuePaths(result)).toEqual(["customer"]);
  });

  it("drops fields the client is not allowed to set", () => {
    const parsed = createOrderSchema.parse({ ...validOrder, total: 1, status: "delivered" });

    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("status");
  });
});

describe("updateOrderStatusSchema", () => {
  it("accepts a known status", () => {
    expect(updateOrderStatusSchema.parse({ status: "preparing" })).toEqual({
      status: "preparing",
    });
  });

  it("rejects an unknown status", () => {
    const result = updateOrderStatusSchema.safeParse({ status: "teleported" });

    expect(issuePaths(result)).toEqual(["status"]);
  });
});

describe("registerSchema", () => {
  const validRegistration = {
    name: "Asha Rao",
    email: "asha@example.com",
    password: "correct-horse-9",
  };

  it("lowercases and trims the email so logins are case-insensitive", () => {
    const parsed = registerSchema.parse({
      ...validRegistration,
      email: "  Asha@Example.COM ",
    });

    expect(parsed.email).toBe("asha@example.com");
  });

  it("rejects a malformed email", () => {
    const result = registerSchema.safeParse({ ...validRegistration, email: "asha@" });

    expect(issuePaths(result)).toEqual(["email"]);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validRegistration, password: "short12" });

    expect(issuePaths(result)).toEqual(["password"]);
  });

  it("rejects a password longer than bcrypt can hash (72 bytes)", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "a".repeat(73),
    });

    expect(issuePaths(result)).toEqual(["password"]);
  });
});

describe("loginSchema", () => {
  it("lowercases the email", () => {
    const parsed = loginSchema.parse({ email: "Asha@Example.com", password: "whatever" });

    expect(parsed.email).toBe("asha@example.com");
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "asha@example.com", password: "" });

    expect(issuePaths(result)).toEqual(["password"]);
  });
});
