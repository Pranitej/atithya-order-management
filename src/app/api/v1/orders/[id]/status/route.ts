import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { changeOrderStatus } from "@/server/modules/orders/order.service";
import { updateOrderStatusSchema } from "@/shared/schemas";

export const PATCH = route(
  { auth: "admin", body: updateOrderStatusSchema },
  async ({ user, params, body }) => {
    return ok({ order: await changeOrderStatus(user, params.id, body.status) });
  },
);
