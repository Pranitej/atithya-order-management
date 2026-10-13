import type { OrderStatus } from "@/shared/order-status";
import type { OrderDTO } from "@/shared/types";

export const ORDER_ID = "64b7f0c2a1d3e4f5a6b7c8e0";

const PLACED_AT = "2026-03-01T12:00:00.000Z";

/** When each status was reached, 20 seconds apart, matching the simulation. */
const REACHED_AT: Record<OrderStatus, string> = {
  received: PLACED_AT,
  preparing: "2026-03-01T12:00:20.000Z",
  out_for_delivery: "2026-03-01T12:00:40.000Z",
  delivered: "2026-03-01T12:01:00.000Z",
  cancelled: "2026-03-01T12:00:10.000Z",
};

const FLOW: OrderStatus[] = [
  "received",
  "preparing",
  "out_for_delivery",
  "delivered",
];

/** One Margherita Pizza for Asha, in the given status, with a matching history. */
export function orderInStatus(status: OrderStatus): OrderDTO {
  const reached =
    status === "cancelled"
      ? (["received", "cancelled"] as OrderStatus[])
      : FLOW.slice(0, FLOW.indexOf(status) + 1);

  const finished = status === "delivered" || status === "cancelled";

  return {
    id: ORDER_ID,
    userId: "64b7f0c2a1d3e4f5a6b7c8e1",
    items: [
      {
        menuItemId: "64b7f0c2a1d3e4f5a6b7c8d1",
        name: "Margherita Pizza",
        unitPrice: 24900,
        quantity: 1,
        lineTotal: 24900,
      },
    ],
    customer: {
      name: "Asha Rao",
      address: "12 MG Road, Indiranagar, Bengaluru 560038",
      phone: "+919876543210",
    },
    subtotal: 24900,
    deliveryFee: 4000,
    tax: 1245,
    total: 30145,
    status,
    statusHistory: reached.map((step) => ({
      status: step,
      at: REACHED_AT[step],
    })),
    estimatedDeliveryAt: finished ? null : REACHED_AT.delivered,
    createdAt: PLACED_AT,
    updatedAt: REACHED_AT[status],
  };
}
