import { getEnv } from "@/server/config/env";
import type { OrderDoc } from "@/server/models/order.model";
import {
  type OrderStatus,
  STATUS_FLOW,
  isTerminal,
} from "@/shared/order-status";

/**
 * The simulated kitchen. There is no background worker: serverless functions
 * only run while handling a request. Instead each order records when its next
 * step is due (`nextTransitionAt`), and overdue steps are applied whenever
 * the order is next read. The result is the same as a timer would give, with
 * nothing to keep running and nothing lost on a restart.
 */

/** How long an order stays in each status. */
export function stepMs(): number {
  return getEnv().ORDER_STEP_SECONDS * 1000;
}

/** The statuses the simulation moves through by itself, as [from, to] pairs. */
export const AUTOMATIC_STEPS: readonly (readonly [OrderStatus, OrderStatus])[] =
  STATUS_FLOW.slice(0, -1).map(
    (from, index) => [from, STATUS_FLOW[index + 1]] as const,
  );

export function isDue(
  order: Pick<OrderDoc, "nextTransitionAt">,
  now: Date,
): boolean {
  return order.nextTransitionAt !== null && order.nextTransitionAt <= now;
}

/** When the following step is due for an order that has just entered `status`. */
export function nextTransitionAfter(
  status: OrderStatus,
  at: Date,
): Date | null {
  return isTerminal(status) ? null : new Date(at.getTime() + stepMs());
}

/** When the order will reach "delivered" if every remaining step runs on time. */
export function estimateDelivery(
  order: Pick<OrderDoc, "status" | "nextTransitionAt">,
): Date | null {
  if (order.nextTransitionAt === null) return null;

  const position = STATUS_FLOW.indexOf(
    order.status as (typeof STATUS_FLOW)[number],
  );
  // Steps still to come after the one that `nextTransitionAt` already covers.
  const stepsAfterNext = STATUS_FLOW.length - 1 - (position + 1);

  return new Date(order.nextTransitionAt.getTime() + stepsAfterNext * stepMs());
}
