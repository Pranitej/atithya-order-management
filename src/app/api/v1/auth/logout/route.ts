import { REFRESH_COOKIE, clearAuthCookies } from "@/server/http/cookies";
import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { endSession } from "@/server/modules/auth/auth.service";

export const POST = route({}, async ({ request }) => {
  await endSession(request.cookies.get(REFRESH_COOKIE)?.value);
  return clearAuthCookies(ok({ signedOut: true }));
});
