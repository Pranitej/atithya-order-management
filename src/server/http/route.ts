import type { NextRequest } from "next/server";
import type { z } from "zod";
import { connectToDatabase } from "@/server/db/connect";
import {
  type AccessClaims,
  verifyAccessToken,
} from "@/server/modules/auth/tokens";
import { ACCESS_COOKIE } from "./cookies";
import { errors } from "./errors";
import { type RateLimitRule, enforceRateLimit } from "./rate-limit";
import { errorResponse } from "./respond";

type RouteParams = Record<string, string>;

type RouteOptions<TBody> = {
  /** Omit for a public endpoint. "admin" also requires the admin role. */
  auth?: "user" | "admin";
  /** When given, the JSON body is parsed with this schema before the handler runs. */
  body?: z.ZodType<TBody>;
  /** Per-client request allowance, checked before anything expensive runs. */
  rateLimit?: RateLimitRule;
};

type HandlerContext<TBody, TUser> = {
  request: NextRequest;
  params: RouteParams;
  body: TBody;
  user: TUser;
};

type NextRouteHandler = (
  request: NextRequest,
  context: { params: Promise<RouteParams> },
) => Promise<Response>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Wraps a route handler with everything every endpoint needs, in one place:
 * CSRF origin check, database connection, rate limiting, authentication,
 * body validation and consistent error responses. Handlers are left with only their own logic.
 */
export function route<TBody = undefined>(
  options: RouteOptions<TBody> & { auth: "user" | "admin" },
  handler: (context: HandlerContext<TBody, AccessClaims>) => Promise<Response>,
): NextRouteHandler;
export function route<TBody = undefined>(
  options: RouteOptions<TBody> & { auth?: undefined },
  handler: (context: HandlerContext<TBody, null>) => Promise<Response>,
): NextRouteHandler;
export function route<TBody>(
  options: RouteOptions<TBody>,
  // The overloads above give callers the precise type for `user`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (context: HandlerContext<TBody, any>) => Promise<Response>,
): NextRouteHandler {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      await connectToDatabase();
      if (options.rateLimit) await enforceRateLimit(request, options.rateLimit);

      const user = options.auth
        ? await authenticate(request, options.auth)
        : null;
      const body = options.body
        ? await parseBody(request, options.body)
        : (undefined as TBody);
      const params = await context.params;

      return await handler({ request, params, body, user });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * CSRF defence. Browsers attach an Origin header to cross-site POSTs and a
 * page cannot forge it, so a state-changing request whose Origin is another
 * site is refused. Requests without an Origin (curl, server-to-server) carry
 * no ambient cookies from a victim's browser and are let through.
 */
function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (SAFE_METHODS.has(request.method) || !origin) return;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw errors.forbidden("Cross-site requests are not allowed");
  }

  if (originHost !== host) {
    throw errors.forbidden("Cross-site requests are not allowed");
  }
}

async function authenticate(
  request: NextRequest,
  level: "user" | "admin",
): Promise<AccessClaims> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const claims = token ? await verifyAccessToken(token) : null;

  if (!claims) throw errors.unauthenticated();
  if (level === "admin" && claims.role !== "admin") throw errors.forbidden();

  return claims;
}

async function parseBody<TBody>(
  request: NextRequest,
  schema: z.ZodType<TBody>,
): Promise<TBody> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw errors.badRequest("Request body must be valid JSON");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
      (details[field] ??= []).push(issue.message);
    }
    throw errors.validation(details);
  }

  return result.data;
}
