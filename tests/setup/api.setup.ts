import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, inject, vi } from "vitest";

// A private database per test file, inside the shared in-memory server.
process.env.MONGODB_URI = `${inject("mongoUri")}test-${randomUUID()}`;

beforeAll(async () => {
  const { connectToDatabase } = await import("@/server/db/connect");
  await connectToDatabase();
  // Unique indexes must exist before tests rely on them rejecting duplicates.
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
});

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
