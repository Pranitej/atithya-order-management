import type { ApiErrorBody } from "@/shared/types";

const BASE_URL = "/api/v1";

/** A failed API call, carrying the server's error code so callers can react to it. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** Endpoints where a 401 is the answer itself, not a sign of an expired session. */
const NEVER_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

async function send(
  method: Method,
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      // The session lives in httpOnly cookies, which the browser attaches.
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the server. Check your connection and try again.",
    );
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const { error } = (await response.json()) as ApiErrorBody;
    return new ApiError(
      response.status,
      error.code,
      error.message,
      error.details,
    );
  } catch {
    return new ApiError(
      response.status,
      "UNEXPECTED_RESPONSE",
      "The server sent an unexpected response. Please try again.",
    );
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Trades the refresh token for a new access token. If several requests find
 * the session expired at once they all wait on the same refresh, because the
 * server only accepts each refresh token a single time.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= send("POST", "/auth/refresh")
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  let response = await send(method, path, body);

  if (response.status === 401 && !NEVER_REFRESH.includes(path)) {
    const error = await toApiError(response);
    const refreshed =
      error.code === "UNAUTHENTICATED" && (await refreshSession());
    if (!refreshed) throw error;

    // The access token expired mid-session: repeat the request once.
    response = await send(method, path, body);
  }

  if (!response.ok) throw await toApiError(response);

  const { data } = (await response.json()) as { data: T };
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
