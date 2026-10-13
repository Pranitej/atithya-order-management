import { api } from "@/lib/api-client";
import type { OrderStatus } from "@/shared/order-status";
import type { CreateOrderInput } from "@/shared/schemas";
import type { OrderDTO } from "@/shared/types";

/** Cache keys for order data, so every screen reads and updates the same entries. */
export const orderKeys = {
  /** Every order list, whatever its filter. */
  lists: ["orders", "list"] as const,
  list: (status?: OrderStatus) => ["orders", "list", status ?? "any"] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

type OrderReply = { order: OrderDTO };

export async function getOrder(id: string): Promise<OrderDTO> {
  return (await api.get<OrderReply>(`/orders/${id}`)).order;
}

export async function getOrders(status?: OrderStatus): Promise<OrderDTO[]> {
  const query = status ? `?status=${status}` : "";
  return (await api.get<{ orders: OrderDTO[] }>(`/orders${query}`)).orders;
}

export async function placeOrder(input: CreateOrderInput): Promise<OrderDTO> {
  return (await api.post<OrderReply>("/orders", input)).order;
}

export async function cancelOrder(id: string): Promise<OrderDTO> {
  return (await api.delete<OrderReply>(`/orders/${id}`)).order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<OrderDTO> {
  return (await api.patch<OrderReply>(`/orders/${id}/status`, { status }))
    .order;
}
