import { ORDER_RATE_LIMIT } from "@/server/http/rate-limit";
import { created, ok } from "@/server/http/respond";
import { parseQuery, route } from "@/server/http/route";
import { listOrders, placeOrder } from "@/server/modules/orders/order.service";
import { createOrderSchema, listOrdersQuerySchema } from "@/shared/schemas";

export const POST = route(
  { auth: "user", body: createOrderSchema, rateLimit: ORDER_RATE_LIMIT },
  async ({ user, body }) => {
    return created({ order: await placeOrder(user, body) });
  },
);

export const GET = route({ auth: "user" }, async ({ user, request }) => {
  const query = parseQuery(request, listOrdersQuerySchema);
  return ok({ orders: await listOrders(user, query) });
});
