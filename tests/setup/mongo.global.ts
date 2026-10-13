import { MongoMemoryServer } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

/**
 * Starts one throwaway MongoDB for the whole API test run. Each test file
 * then uses its own database inside it (see api.setup.ts), so files can run
 * in parallel without seeing each other's data.
 */
export default async function setup(project: TestProject) {
  const mongo = await MongoMemoryServer.create();
  project.provide("mongoUri", mongo.getUri());

  return async () => {
    await mongo.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
