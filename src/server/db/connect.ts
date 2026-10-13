import mongoose from "mongoose";
import { getEnv } from "@/server/config/env";

/**
 * On serverless a module can be loaded many times, but each function instance
 * should hold one connection pool. Caching the promise on `globalThis` means
 * concurrent requests share a single in-flight connect, and hot reloads in
 * development do not leak pools.
 */
type ConnectionCache = { promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as typeof globalThis & {
  __mongooseConnection?: ConnectionCache;
};

const cache = (globalForMongoose.__mongooseConnection ??= { promise: null });

export function connectToDatabase(): Promise<typeof mongoose> {
  cache.promise ??= mongoose
    .connect(getEnv().MONGODB_URI, {
      // Fail fast instead of queueing queries while disconnected.
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    })
    .catch((error: unknown) => {
      // Let the next request retry rather than caching a failed attempt.
      cache.promise = null;
      throw error;
    });

  return cache.promise;
}
