import { type Model, Schema, type Types, model, models } from "mongoose";
import { ORDER_STATUSES, type OrderStatus } from "@/shared/order-status";

export type OrderLine = {
  menuItemId: Types.ObjectId;
  /** Name and price are copied from the menu at purchase time, so later menu edits never rewrite history. */
  name: string;
  unitPrice: number;
  quantity: number;
};

export type StatusChange = {
  status: OrderStatus;
  at: Date;
};

export type OrderDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: OrderLine[];
  customer: { name: string; address: string; phone: string };
  /** All amounts in paise. */
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  statusHistory: StatusChange[];
  createdAt: Date;
  updatedAt: Date;
};

const orderSchema = new Schema<OrderDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      _id: false,
      menuItemId: {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        required: true,
      },
      name: { type: String, required: true },
      unitPrice: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  customer: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
  },
  subtotal: { type: Number, required: true, min: 0 },
  deliveryFee: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ORDER_STATUSES, required: true },
  statusHistory: [
    {
      _id: false,
      status: { type: String, enum: ORDER_STATUSES, required: true },
      at: { type: Date, required: true },
    },
  ],
  // Set explicitly rather than by Mongoose, so that a status change and its
  // history entry always carry exactly the same timestamp.
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

// "My orders, newest first" and the admin board's newest-first listing.
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const OrderModel: Model<OrderDoc> =
  (models.Order as Model<OrderDoc> | undefined) ??
  model<OrderDoc>("Order", orderSchema);
