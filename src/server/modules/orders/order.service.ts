import { Types } from "mongoose";
import { errors } from "@/server/http/errors";
import { MenuItemModel } from "@/server/models/menu-item.model";
import type { OrderDoc } from "@/server/models/order.model";
import {
  type OrderStatus,
  STATUS_LABELS,
  canCustomerCancel,
  canTransition,
} from "@/shared/order-status";
import { calculateTotals } from "@/shared/pricing";
import type { CreateOrderInput } from "@/shared/schemas";
import type { OrderDTO, UserRole } from "@/shared/types";
import {
  findOrderById,
  findOrders,
  insertOrder,
  transitionOrder,
} from "./order.repository";

/** Who is asking. Comes from the verified access token, never from the request body. */
export type Actor = {
  userId: string;
  role: UserRole;
};

export function toOrderDTO(order: OrderDoc): OrderDTO {
  return {
    id: order._id.toString(),
    userId: order.userId.toString(),
    items: order.items.map((line) => ({
      menuItemId: line.menuItemId.toString(),
      name: line.name,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.unitPrice * line.quantity,
    })),
    customer: {
      name: order.customer.name,
      address: order.customer.address,
      phone: order.customer.phone,
    },
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    tax: order.tax,
    total: order.total,
    status: order.status,
    statusHistory: order.statusHistory.map((change) => ({
      status: change.status,
      at: change.at.toISOString(),
    })),
    estimatedDeliveryAt: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function placeOrder(
  actor: Actor,
  input: CreateOrderInput,
): Promise<OrderDTO> {
  const menuItems = await MenuItemModel.find({
    _id: { $in: input.items.map((item) => item.menuItemId) },
    isAvailable: true,
  }).lean();
  const menuById = new Map(
    menuItems.map((item) => [item._id.toString(), item]),
  );

  const unavailable: Record<string, string[]> = {};
  input.items.forEach((item, index) => {
    if (!menuById.has(item.menuItemId)) {
      unavailable[`items.${index}.menuItemId`] = [
        "This item is no longer available",
      ];
    }
  });
  if (Object.keys(unavailable).length > 0) throw errors.validation(unavailable);

  // Names and prices come from the database. Whatever the browser believed
  // an item cost is never read.
  const lines = input.items.map((item) => {
    const menuItem = menuById.get(item.menuItemId)!;
    return {
      menuItemId: menuItem._id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity: item.quantity,
    };
  });

  const now = new Date();
  const order = await insertOrder({
    userId: new Types.ObjectId(actor.userId),
    items: lines,
    customer: input.customer,
    ...calculateTotals(lines),
    status: "received",
    statusHistory: [{ status: "received", at: now }],
    createdAt: now,
    updatedAt: now,
  });

  return toOrderDTO(order);
}

export async function getOrder(
  actor: Actor,
  orderId: string,
): Promise<OrderDTO> {
  return toOrderDTO(await loadVisibleOrder(actor, orderId));
}

export async function listOrders(
  actor: Actor,
  filter: { status?: OrderStatus },
): Promise<OrderDTO[]> {
  const scope = actor.role === "admin" ? {} : { userId: actor.userId };
  const orders = await findOrders({ ...scope, ...filter });
  return orders.map(toOrderDTO);
}

/** Staff action. The route only lets admins reach this. */
export async function changeOrderStatus(
  actor: Actor,
  orderId: string,
  to: OrderStatus,
): Promise<OrderDTO> {
  const order = await loadVisibleOrder(actor, orderId);

  if (!canTransition(order.status, to)) {
    throw errors.conflict(
      "INVALID_STATUS_TRANSITION",
      `An order that is "${STATUS_LABELS[order.status]}" cannot be moved to "${STATUS_LABELS[to]}"`,
    );
  }

  return applyTransition(order, to);
}

export async function cancelOrder(
  actor: Actor,
  orderId: string,
): Promise<OrderDTO> {
  const order = await loadVisibleOrder(actor, orderId);

  const allowed =
    actor.role === "admin"
      ? canTransition(order.status, "cancelled")
      : canCustomerCancel(order.status);

  if (!allowed) {
    throw errors.conflict(
      "ORDER_NOT_CANCELLABLE",
      `This order is already "${STATUS_LABELS[order.status]}" and can no longer be cancelled`,
    );
  }

  return applyTransition(order, "cancelled");
}

/**
 * Customers may only see their own orders. Someone else's order is reported
 * as "not found" rather than "forbidden", so ids cannot be probed.
 */
async function loadVisibleOrder(
  actor: Actor,
  orderId: string,
): Promise<OrderDoc> {
  const order = await findOrderById(orderId);
  const visible =
    order !== null &&
    (actor.role === "admin" || order.userId.toString() === actor.userId);

  if (!visible) throw errors.notFound("Order");
  return order;
}

async function applyTransition(
  order: OrderDoc,
  to: OrderStatus,
): Promise<OrderDTO> {
  const updated = await transitionOrder(
    order._id.toString(),
    order.status,
    to,
    new Date(),
  );

  // Someone else changed the order between our read and our write.
  if (!updated) {
    throw errors.conflict(
      "INVALID_STATUS_TRANSITION",
      "This order was just updated by someone else. Refresh and try again.",
    );
  }

  return toOrderDTO(updated);
}
