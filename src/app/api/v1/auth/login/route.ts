import { setAuthCookies } from "@/server/http/cookies";
import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { loginUser } from "@/server/modules/auth/auth.service";
import { loginSchema } from "@/shared/schemas";

export const POST = route({ body: loginSchema }, async ({ body }) => {
  const { user, tokens } = await loginUser(body);
  return setAuthCookies(ok({ user }), tokens);
});
