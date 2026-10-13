export const ORDER_STATUSES = [
  "received",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The happy path an order walks through, in order. */
export const STATUS_FLOW = [
  "received",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const satisfies readonly OrderStatus[];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Order Received",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Statuses from which an order can still be cancelled (it has not left the kitchen). */
const CANCELLABLE: readonly OrderStatus[] = ["received", "preparing"];

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  if (index === -1) return null;
  return STATUS_FLOW[index + 1] ?? null;
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

/** An order may move exactly one step forward, or be cancelled while still in the kitchen. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "cancelled") return CANCELLABLE.includes(from);
  return nextStatus(from) === to;
}

/** Customers can only cancel before the kitchen has started; staff use `canTransition`. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === "received";
}
