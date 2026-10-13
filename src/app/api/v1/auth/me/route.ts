import { REFRESH_COOKIE } from "@/server/http/cookies";
import { errors } from "@/server/http/errors";
import { ok } from "@/server/http/respond";
import { route } from "@/server/http/route";
import { getUserById } from "@/server/modules/auth/auth.service";

/**
 * Who is signed in. A visitor gets "user: null" rather than an error: being
 * signed out is a normal state, and it keeps failed requests out of the
 * browser console on every page load.
 */
export const GET = route({ auth: "optional" }, async ({ user, request }) => {
  if (user) {
    return ok({ user: await getUserById(user.userId) });
  }

  // No usable access token, but a refresh token is present: the session can
  // probably be renewed, so say "unauthenticated" and let the client refresh.
  if (request.cookies.has(REFRESH_COOKIE)) throw errors.unauthenticated();

  return ok({ user: null });
});
