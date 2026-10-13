import { errors } from "@/server/http/errors";
import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { getUserById } from "@/server/modules/auth/auth.service";

export const GET = route({ auth: "user" }, async ({ user }) => {
  const account = await getUserById(user.userId);
  // A valid token for an account that has since been deleted.
  if (!account) throw errors.unauthenticated();
  return ok({ user: account });
});
