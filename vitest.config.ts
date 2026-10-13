import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    projects: [
      {
        // Pure logic: no database, no DOM.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/shared/**/*.test.ts", "src/server/**/*.test.ts"],
        },
      },
      {
        // Services and API route handlers against an in-memory MongoDB.
        extends: true,
        test: {
          name: "api",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          globalSetup: ["tests/setup/mongo.global.ts"],
          setupFiles: ["tests/setup/api.setup.ts"],
        },
      },
      {
        // React components, hooks and browser-side helpers.
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/{features,components,lib}/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/ui.setup.ts"],
        },
      },
    ],
  },
});
