import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const complete = {
  MONGODB_URI: "mongodb://localhost:27017/food",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
};

describe("parseEnv", () => {
  it("advances an order every 20 seconds unless configured otherwise", () => {
    expect(parseEnv(complete).ORDER_STEP_SECONDS).toBe(20);
  });

  it("reads the step duration as a number", () => {
    expect(
      parseEnv({ ...complete, ORDER_STEP_SECONDS: "45" }).ORDER_STEP_SECONDS,
    ).toBe(45);
  });

  it("names the variable that is missing", () => {
    const withoutDatabase = {
      JWT_ACCESS_SECRET: complete.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: complete.JWT_REFRESH_SECRET,
    };

    expect(() => parseEnv(withoutDatabase)).toThrow(/MONGODB_URI/);
  });

  it("refuses a signing secret too short to be safe", () => {
    expect(() => parseEnv({ ...complete, JWT_ACCESS_SECRET: "short" })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it("refuses to use one secret for both token types", () => {
    expect(() =>
      parseEnv({ ...complete, JWT_REFRESH_SECRET: complete.JWT_ACCESS_SECRET }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });
});
