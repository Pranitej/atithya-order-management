/**
 * An error that is safe to show to the client. Services throw these; the
 * route wrapper turns them into JSON responses. Anything else that is thrown
 * is treated as a bug and reported as a generic 500.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  badRequest: (message: string) => new AppError(400, "BAD_REQUEST", message),

  validation: (details: Record<string, string[]>) =>
    new AppError(400, "VALIDATION_ERROR", "Some fields are invalid", details),

  unauthenticated: () =>
    new AppError(401, "UNAUTHENTICATED", "Sign in to continue"),

  invalidCredentials: () =>
    new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect"),

  forbidden: (message = "You are not allowed to do that") =>
    new AppError(403, "FORBIDDEN", message),

  notFound: (what: string) =>
    new AppError(404, "NOT_FOUND", `${what} not found`),

  conflict: (code: string, message: string) => new AppError(409, code, message),

  rateLimited: (retryAfterSeconds: number) =>
    new AppError(
      429,
      "RATE_LIMITED",
      "Too many requests. Please wait a moment and try again.",
      undefined,
      { "Retry-After": String(retryAfterSeconds) },
    ),
};
