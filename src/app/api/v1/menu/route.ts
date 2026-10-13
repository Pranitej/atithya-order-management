import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { listMenu } from "@/server/modules/menu/menu.service";

export const GET = route({}, async () => {
  return ok({ items: await listMenu() });
});
