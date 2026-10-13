import type { NextRequest } from "next/server";
import { RateLimitModel } from "@/server/models/rate-limit.model";
import { errors } from "./errors";

export type RateLimitRule = {
  /** Separates counters, so sign-in attempts do not use up the order allowance. */
  name: string;
  limit: number;
  windowSeconds: number;
};

/** Slows down password guessing and mass sign-ups from one address. */
export const AUTH_RATE_LIMIT: RateLimitRule = {
  name: "auth",
  limit: 10,
  windowSeconds: 60,
};

/** Stops one client from flooding the kitchen with orders. */
export const ORDER_RATE_LIMIT: RateLimitRule = {
  name: "orders",
  limit: 10,
  windowSeconds: 60,
};

/**
 * Fixed-window rate limit kept in MongoDB. Serverless instances share no
 * memory, so the count has to live somewhere all of them can see. The
 * increment is a single atomic upsert, which is safe under concurrency.
 */
export async function enforceRateLimit(
  request: NextRequest,
  rule: RateLimitRule,
): Promise<void> {
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  const counter = await RateLimitModel.findOneAndUpdate(
    { key: `${rule.name}:${clientAddress(request)}:${windowStart}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd) } },
    { upsert: true, returnDocument: "after" },
  ).lean();

  if (counter.count > rule.limit) {
    throw errors.rateLimited(Math.ceil((windowEnd - now) / 1000));
  }
}

/**
 * The hosting platform's proxy sets x-forwarded-for; the first entry is the
 * original client. Without a proxy (local development) every request shares
 * one bucket.
 */
function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
