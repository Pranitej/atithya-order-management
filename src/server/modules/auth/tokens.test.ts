import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens";

const USER_ID = "64b7f0c2a1d3e4f5a6b7c8d9";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

afterEach(() => {
  vi.useRealTimers();
});

function freezeTimeAt(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

describe("access tokens", () => {
  it("carry the user's id and role", async () => {
    const token = await signAccessToken({ userId: USER_ID, role: "admin" });

    expect(await verifyAccessToken(token)).toEqual({ userId: USER_ID, role: "admin" });
  });

  it("are still valid 14 minutes after being issued", async () => {
    freezeTimeAt("2026-01-01T10:00:00Z");
    const token = await signAccessToken({ userId: USER_ID, role: "customer" });

    vi.setSystemTime(Date.now() + 14 * MINUTE);

    expect(await verifyAccessToken(token)).not.toBeNull();
  });

  it("expire after 15 minutes", async () => {
    freezeTimeAt("2026-01-01T10:00:00Z");
    const token = await signAccessToken({ userId: USER_ID, role: "customer" });

    vi.setSystemTime(Date.now() + 16 * MINUTE);

    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("are rejected when signed with a different secret", async () => {
    const forged = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(USER_ID)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("an-attacker-chosen-secret-0123456789"));

    expect(await verifyAccessToken(forged)).toBeNull();
  });

  it("are rejected when the role claim is not one we issue", async () => {
    const tampered = await new SignJWT({ role: "superuser" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(USER_ID)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

    expect(await verifyAccessToken(tampered)).toBeNull();
  });

  it("are rejected when malformed", async () => {
    expect(await verifyAccessToken("not-a-jwt")).toBeNull();
    expect(await verifyAccessToken("")).toBeNull();
  });
});

describe("refresh tokens", () => {
  const claims = { userId: USER_ID, sessionId: "session-1", tokenId: "token-1" };

  it("carry the user, session and token ids", async () => {
    const token = await signRefreshToken(claims);

    expect(await verifyRefreshToken(token)).toEqual(claims);
  });

  it("are still valid 6 days after being issued", async () => {
    freezeTimeAt("2026-01-01T10:00:00Z");
    const token = await signRefreshToken(claims);

    vi.setSystemTime(Date.now() + 6 * DAY);

    expect(await verifyRefreshToken(token)).toEqual(claims);
  });

  it("expire after 7 days", async () => {
    freezeTimeAt("2026-01-01T10:00:00Z");
    const token = await signRefreshToken(claims);

    vi.setSystemTime(Date.now() + 7 * DAY + MINUTE);

    expect(await verifyRefreshToken(token)).toBeNull();
  });

  it("cannot be used as an access token", async () => {
    const refresh = await signRefreshToken(claims);

    expect(await verifyAccessToken(refresh)).toBeNull();
  });

  it("cannot be forged from an access token", async () => {
    const access = await signAccessToken({ userId: USER_ID, role: "customer" });

    expect(await verifyRefreshToken(access)).toBeNull();
  });
});
