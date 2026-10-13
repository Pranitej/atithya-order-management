import { z } from "zod";
import { ORDER_STATUSES } from "./order-status";

/**
 * Validation shared by the browser forms and the API. The API never trusts
 * that the form ran: every request body is parsed with these again.
 */

export const MAX_QUANTITY_PER_ITEM = 20;
export const MAX_ITEMS_PER_ORDER = 30;

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\+?\d{10,15}$/, "Enter a valid phone number (10 to 15 digits)"),
  );

export const deliveryDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80, "Name is too long"),
  address: z
    .string()
    .trim()
    .min(10, "Enter your full delivery address")
    .max(300, "Address is too long"),
  phone,
});

export const orderItemSchema = z.object({
  menuItemId: objectId,
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(
      MAX_QUANTITY_PER_ITEM,
      `You can order at most ${MAX_QUANTITY_PER_ITEM} of one item`,
    ),
});

export const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "Your cart is empty")
    .max(MAX_ITEMS_PER_ORDER, "Too many different items in one order")
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.menuItemId)) {
          ctx.addIssue({
            code: "custom",
            message: "This item is listed more than once",
            path: [index, "menuItemId"],
          });
        }
        seen.add(item.menuItemId);
      });
    }),
  customer: deliveryDetailsSchema,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  email,
  // bcrypt only hashes the first 72 bytes, so longer passwords are refused
  // rather than silently truncated.
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Use at most 72 characters"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(72),
});

export type DeliveryDetails = z.infer<typeof deliveryDetailsSchema>;
export type DeliveryDetailsInput = z.input<typeof deliveryDetailsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
