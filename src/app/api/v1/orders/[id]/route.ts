import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { cancelOrder, getOrder } from "@/server/modules/orders/order.service";

export const GET = route({ auth: "user" }, async ({ user, params }) => {
  return ok({ order: await getOrder(user, params.id) });
});

/**
 * Orders are never erased, so that customers and staff keep a full history.
 * DELETE cancels the order, which is the only way one can be withdrawn.
 */
export const DELETE = route({ auth: "user" }, async ({ user, params }) => {
  return ok({ order: await cancelOrder(user, params.id) });
});
