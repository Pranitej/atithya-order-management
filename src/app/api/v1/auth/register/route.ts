import { setAuthCookies } from "@/server/http/cookies";
import { created } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { registerUser } from "@/server/modules/auth/auth.service";
import { registerSchema } from "@/shared/schemas";

export const POST = route({ body: registerSchema }, async ({ body }) => {
  const { user, tokens } = await registerUser(body);
  return setAuthCookies(created({ user }), tokens);
});
