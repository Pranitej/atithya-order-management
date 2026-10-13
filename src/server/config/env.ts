import { z } from "zod";

const envSchema = z
  .object({
    MONGODB_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "must be at least 32 characters"),
    /** How long a simulated order stays in each status before moving on. */
    ORDER_STEP_SECONDS: z.coerce.number().int().min(1).max(3600).default(20),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    path: ["JWT_REFRESH_SECRET"],
    message: "must be different from JWT_ACCESS_SECRET",
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}

let cached: Env | undefined;

/**
 * Read lazily, not at import time, so that `next build` can load these
 * modules without the runtime secrets being present.
 */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
