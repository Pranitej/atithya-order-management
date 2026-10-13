import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { createTestClient } from "../helpers/http";

const LOGIN = "/api/v1/auth/login";
const credentials = { email: "nobody@example.com", password: "wrong-password" };

function attemptLoginFrom(ip: string) {
  return createTestClient().post(login, LOGIN, {
    body: credentials,
    headers: { "x-forwarded-for": ip },
  });
}

async function exhaustLimitFrom(ip: string) {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const response = await attemptLoginFrom(ip);
    expect(response.status, `attempt ${attempt}`).toBe(401);
  }
}

// The limiter counts per clock minute. Freezing the clock mid-minute keeps a
// test from straddling two minutes and seeing its attempts split between them.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T10:00:20Z"));
});

describe("rate limiting on sign-in", () => {
  it("blocks the 11th attempt from one address within a minute", async () => {
    await exhaustLimitFrom("203.0.113.7");

    const blocked = await attemptLoginFrom("203.0.113.7");

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
  });

  it("tells the client how many seconds to wait", async () => {
    // The clock is 20 seconds into a one-minute window, so 40 seconds remain.
    await exhaustLimitFrom("203.0.113.7");

    const blocked = await attemptLoginFrom("203.0.113.7");

    expect(blocked.headers.get("retry-after")).toBe("40");
  });

  it("does not block other addresses", async () => {
    await exhaustLimitFrom("203.0.113.7");

    const other = await attemptLoginFrom("198.51.100.4");

    expect(other.status).toBe(401);
  });

  it("uses the first address when the request passed through proxies", async () => {
    await exhaustLimitFrom("203.0.113.7, 10.0.0.1");

    const sameClient = await attemptLoginFrom("203.0.113.7, 10.0.0.2");

    expect(sameClient.status).toBe(429);
  });

  it("allows attempts again once the minute has passed", async () => {
    await exhaustLimitFrom("203.0.113.7");
    expect((await attemptLoginFrom("203.0.113.7")).status).toBe(429);

    vi.setSystemTime(new Date("2026-01-01T10:01:01Z"));

    expect((await attemptLoginFrom("203.0.113.7")).status).toBe(401);
  });
});
