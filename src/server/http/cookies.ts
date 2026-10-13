import type { NextResponse } from "next/server";
import { getEnv } from "@/server/config/env";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/server/modules/auth/tokens";

export const ACCESS_COOKIE = "fo_access";
export const REFRESH_COOKIE = "fo_refresh";

/** The refresh token is only sent to the auth endpoints, never with ordinary API calls. */
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function baseOptions() {
  return {
    // httpOnly keeps the tokens out of reach of any script running in the page.
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

export function setAuthCookies<T extends NextResponse>(
  response: T,
  tokens: { accessToken: string; refreshToken: string },
): T {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
  return response;
}

export function clearAuthCookies<T extends NextResponse>(response: T): T {
  response.cookies.set(ACCESS_COOKIE, "", {
    ...baseOptions(),
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    ...baseOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}
