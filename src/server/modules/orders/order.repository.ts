import { isValidObjectId } from "mongoose";
import { type OrderDoc, OrderModel } from "@/server/models/order.model";
import type { OrderStatus } from "@/shared/order-status";

/**
 * The only module that talks to the orders collection. Everything above it
 * works with plain `OrderDoc` objects and never builds a query.
 */

export type NewOrder = Omit<OrderDoc, "_id">;

export type OrderFilter = {
  userId?: string;
  status?: OrderStatus;
};

const MAX_LISTED_ORDERS = 50;

export async function insertOrder(order: NewOrder): Promise<OrderDoc> {
  const created = await OrderModel.create(order);
  return created.toObject();
}

export async function findOrderById(id: string): Promise<OrderDoc | null> {
  if (!isValidObjectId(id)) return null;
  return OrderModel.findById(id).lean();
}

export async function findOrders(filter: OrderFilter): Promise<OrderDoc[]> {
  return (
    OrderModel.find(filter)
      // _id breaks ties between orders created in the same millisecond.
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_LISTED_ORDERS)
      .lean()
  );
}

/**
 * Moves an order from one status to another, but only if it is still in the
 * status the caller saw. If something else changed it first, nothing is
 * written and null is returned, so two concurrent updates cannot both apply.
 */
export async function transitionOrder(
  id: string,
  from: OrderStatus,
  to: OrderStatus,
  at: Date,
): Promise<OrderDoc | null> {
  return OrderModel.findOneAndUpdate(
    { _id: id, status: from },
    {
      $set: { status: to, updatedAt: at },
      $push: { statusHistory: { status: to, at } },
    },
    { returnDocument: "after" },
  ).lean();
}
