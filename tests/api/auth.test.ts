import { describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/http/cookies";
import { UserModel } from "@/server/models/user.model";
import { createTestClient, type TestClient } from "../helpers/http";

const REGISTER = "/api/v1/auth/register";
const LOGIN = "/api/v1/auth/login";
const REFRESH = "/api/v1/auth/refresh";
const LOGOUT = "/api/v1/auth/logout";
const ME = "/api/v1/auth/me";

const asha = {
  name: "Asha Rao",
  email: "asha@example.com",
  password: "correct-horse-9",
};

const MINUTE = 60_000;

async function registerAsha(client: TestClient) {
  const response = await client.post(register, REGISTER, { body: asha });
  expect(response.status).toBe(201);
  return response;
}

function cookieNamed(setCookies: string[], name: string) {
  return setCookies.find((cookie) => cookie.startsWith(`${name}=`));
}

describe("POST /auth/register", () => {
  it("creates the account and returns the user without any password data", async () => {
    const client = createTestClient();

    const response = await client.post(register, REGISTER, { body: asha });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual({
      id: expect.any(String),
      name: "Asha Rao",
      email: "asha@example.com",
      role: "customer",
    });
  });

  it("stores a hash, never the password itself", async () => {
    await registerAsha(createTestClient());

    const stored = await UserModel.findOne({ email: asha.email }).lean();

    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(JSON.stringify(stored)).not.toContain(asha.password);
  });

  it("signs the user in with httpOnly cookies", async () => {
    const response = await registerAsha(createTestClient());

    const access = cookieNamed(response.setCookies, ACCESS_COOKIE);
    const refreshCookie = cookieNamed(response.setCookies, REFRESH_COOKIE);

    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=lax/i);
    expect(refreshCookie).toMatch(/HttpOnly/i);
    // The refresh token is only ever sent to the auth endpoints.
    expect(refreshCookie).toMatch(/Path=\/api\/v1\/auth/i);
  });

  it("never lets a client choose its own role", async () => {
    const client = createTestClient();

    const response = await client.post(register, REGISTER, {
      body: { ...asha, role: "admin" },
    });

    expect(response.body.data.user.role).toBe("customer");
  });

  it("refuses an email that is already registered, ignoring case", async () => {
    await registerAsha(createTestClient());

    const response = await createTestClient().post(register, REGISTER, {
      body: { ...asha, email: "ASHA@example.com" },
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("reports which fields are invalid", async () => {
    const response = await createTestClient().post(register, REGISTER, {
      body: { name: "A", email: "not-an-email", password: "short" },
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(response.body.error.details).sort()).toEqual([
      "email",
      "name",
      "password",
    ]);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await createTestClient().post(register, REGISTER, {
      rawBody: "{not json",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });

  it("refuses a form posted from another website", async () => {
    const response = await createTestClient().post(register, REGISTER, {
      body: asha,
      headers: { origin: "https://evil.example" },
    });

    expect(response.status).toBe(403);
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe("POST /auth/login", () => {
  it("signs in with the right password", async () => {
    await registerAsha(createTestClient());
    const client = createTestClient();

    const response = await client.post(login, LOGIN, {
      body: { email: asha.email, password: asha.password },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("asha@example.com");
    expect(client.cookie(ACCESS_COOKIE)).toBeDefined();
  });

  it("rejects a wrong password", async () => {
    await registerAsha(createTestClient());
    const client = createTestClient();

    const response = await client.post(login, LOGIN, {
      body: { email: asha.email, password: "wrong-password" },
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(client.cookie(ACCESS_COOKIE)).toBeUndefined();
  });

  it("answers an unknown email exactly like a wrong password", async () => {
    await registerAsha(createTestClient());

    const wrongPassword = await createTestClient().post(login, LOGIN, {
      body: { email: asha.email, password: "wrong-password" },
    });
    const unknownEmail = await createTestClient().post(login, LOGIN, {
      body: { email: "nobody@example.com", password: "wrong-password" },
    });

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});

describe("GET /auth/me", () => {
  it("returns the signed-in user", async () => {
    const client = createTestClient();
    await registerAsha(client);

    const response = await client.get(me, ME);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("asha@example.com");
  });

  it("is refused without a session", async () => {
    const response = await createTestClient().get(me, ME);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("is refused once the access token has expired", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const client = createTestClient();
    await registerAsha(client);

    vi.setSystemTime(Date.now() + 16 * MINUTE);

    expect((await client.get(me, ME)).status).toBe(401);
  });
});

describe("POST /auth/refresh", () => {
  it("issues a working access token after the old one expired", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const client = createTestClient();
    await registerAsha(client);
    vi.setSystemTime(Date.now() + 16 * MINUTE);

    const refreshed = await client.post(refresh, REFRESH);

    expect(refreshed.status).toBe(200);
    expect((await client.get(me, ME)).status).toBe(200);
  });

  it("replaces the refresh token every time it is used", async () => {
    const client = createTestClient();
    await registerAsha(client);
    const original = client.cookie(REFRESH_COOKIE, REFRESH);

    await client.post(refresh, REFRESH);

    expect(client.cookie(REFRESH_COOKIE, REFRESH)).toBeDefined();
    expect(client.cookie(REFRESH_COOKIE, REFRESH)).not.toBe(original);
  });

  it("refuses a refresh token that was already used", async () => {
    const client = createTestClient();
    await registerAsha(client);
    const stolen = client.cookie(REFRESH_COOKIE, REFRESH)!;
    await client.post(refresh, REFRESH);

    const attacker = createTestClient();
    attacker.setCookie(REFRESH_COOKIE, stolen, "/api/v1/auth");
    const replay = await attacker.post(refresh, REFRESH);

    expect(replay.status).toBe(401);
  });

  it("ends the whole session when an old refresh token is replayed", async () => {
    const client = createTestClient();
    await registerAsha(client);
    const stolen = client.cookie(REFRESH_COOKIE, REFRESH)!;
    await client.post(refresh, REFRESH);

    const attacker = createTestClient();
    attacker.setCookie(REFRESH_COOKIE, stolen, "/api/v1/auth");
    await attacker.post(refresh, REFRESH);

    // The legitimate user's newer token stops working too: someone has a copy.
    expect((await client.post(refresh, REFRESH)).status).toBe(401);
  });

  it("is refused without a refresh token", async () => {
    const response = await createTestClient().post(refresh, REFRESH);

    expect(response.status).toBe(401);
  });

  it("is refused when handed an access token instead", async () => {
    const client = createTestClient();
    await registerAsha(client);
    client.setCookie(
      REFRESH_COOKIE,
      client.cookie(ACCESS_COOKIE)!,
      "/api/v1/auth",
    );

    expect((await client.post(refresh, REFRESH)).status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("removes both cookies from the browser", async () => {
    const client = createTestClient();
    await registerAsha(client);

    const response = await client.post(logout, LOGOUT);

    expect(response.status).toBe(200);
    expect(client.cookie(ACCESS_COOKIE)).toBeUndefined();
    expect(client.cookie(REFRESH_COOKIE, REFRESH)).toBeUndefined();
  });

  it("makes the refresh token useless even if it was copied beforehand", async () => {
    const client = createTestClient();
    await registerAsha(client);
    const copied = client.cookie(REFRESH_COOKIE, REFRESH)!;

    await client.post(logout, LOGOUT);

    const attacker = createTestClient();
    attacker.setCookie(REFRESH_COOKIE, copied, "/api/v1/auth");
    expect((await attacker.post(refresh, REFRESH)).status).toBe(401);
  });

  it("succeeds even when nobody is signed in", async () => {
    expect((await createTestClient().post(logout, LOGOUT)).status).toBe(200);
  });
});
