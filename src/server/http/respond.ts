import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiSuccess } from "@/shared/types";
import { AppError } from "./errors";

/** Every successful response has the shape `{ data }`. */
export function ok<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status: 201 });
}

/** Every failed response has the shape `{ error: { code, message, details? } }`. */
export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status, headers: error.headers },
    );
  }

  // Unexpected: log the real cause for us, tell the client nothing about it.
  console.error("Unhandled error in route handler", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side" } },
    { status: 500 },
  );
}
