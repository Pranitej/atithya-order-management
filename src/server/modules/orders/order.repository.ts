import { isValidObjectId } from "mongoose";
import { type OrderDoc, OrderModel } from "@/server/models/order.model";
import type { OrderStatus } from "@/shared/order-status";
import { AUTOMATIC_STEPS } from "./order-simulation";

/**
 * The only module that talks to the orders collection. Everything above it
 * works with plain `OrderDoc` objects and never builds a query.
 */

export type NewOrder = Omit<OrderDoc, "_id">;

export type OrderFilter = {
  id?: string;
  userId?: string;
  status?: OrderStatus;
};

const MAX_LISTED_ORDERS = 50;

function toQuery({ id, ...rest }: OrderFilter) {
  return id === undefined ? rest : { ...rest, _id: id };
}

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
    OrderModel.find(toQuery(filter))
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
export async function transitionOrder(change: {
  id: string;
  from: OrderStatus;
  to: OrderStatus;
  at: Date;
  nextTransitionAt: Date | null;
}): Promise<OrderDoc | null> {
  return OrderModel.findOneAndUpdate(
    { _id: change.id, status: change.from },
    {
      $set: {
        status: change.to,
        updatedAt: change.at,
        nextTransitionAt: change.nextTransitionAt,
      },
      $push: { statusHistory: { status: change.to, at: change.at } },
    },
    { returnDocument: "after" },
  ).lean();
}

/**
 * Applies every simulated step that is overdue at `now`, for the orders
 * matching `filter`.
 *
 * Each step is one atomic update that only matches orders still in the
 * previous status, so however many requests run this at once, a step is
 * applied to an order exactly once. Running the steps in order lets an order
 * that nobody looked at for a while catch up several statuses in one call.
 * Each change is stamped with the time it was due, not the time we got to it.
 */
export async function settleDueOrders(
  now: Date,
  stepMs: number,
  filter: OrderFilter = {},
): Promise<void> {
  for (const [from, to] of AUTOMATIC_STEPS) {
    const isLastStep = to === AUTOMATIC_STEPS.at(-1)![1];

    await OrderModel.updateMany(
      { ...toQuery(filter), status: from, nextTransitionAt: { $lte: now } },
      // A pipeline update, so the new values can be computed from the
      // order's own `nextTransitionAt`.
      [
        {
          $set: {
            status: to,
            updatedAt: "$nextTransitionAt",
            statusHistory: {
              $concatArrays: [
                "$statusHistory",
                [{ status: to, at: "$nextTransitionAt" }],
              ],
            },
            nextTransitionAt: isLastStep
              ? null
              : { $add: ["$nextTransitionAt", stepMs] },
          },
        },
      ],
      { updatePipeline: true },
    );
  }
}
