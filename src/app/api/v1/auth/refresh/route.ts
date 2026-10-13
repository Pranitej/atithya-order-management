import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/server/http/cookies";
import { errorResponse, ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { refreshSession } from "@/server/modules/auth/auth.service";

export const POST = route({}, async ({ request }) => {
  try {
    const { user, tokens } = await refreshSession(
      request.cookies.get(REFRESH_COOKIE)?.value,
    );
    return setAuthCookies(ok({ user }), tokens);
  } catch (error) {
    // A refresh token that no longer works is of no use to the browser.
    return clearAuthCookies(errorResponse(error));
  }
});
