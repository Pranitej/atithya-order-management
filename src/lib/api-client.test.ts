import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api-client";

/** Queues the responses `fetch` will return, in order, and records the calls. */
const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const unauthenticated = () =>
  json(401, {
    error: { code: "UNAUTHENTICATED", message: "Sign in to continue" },
  });

function requestedPaths() {
  return fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("returns the data from a successful response", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { data: { items: [{ id: "1" }] } }),
    );

    const result = await api.get<{ items: { id: string }[] }>("/menu");

    expect(result).toEqual({ items: [{ id: "1" }] });
    expect(requestedPaths()).toEqual(["GET /api/v1/menu"]);
  });

  it("sends cookies with every request", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: {} }));

    await api.get("/orders");

    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("same-origin");
  });

  it("sends the body as JSON", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { order: {} } }));

    await api.post("/orders", { items: [] });

    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe('{"items":[]}');
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("throws the server's error with its code and field details", async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields are invalid",
          details: { "customer.phone": ["Enter a valid phone number"] },
        },
      }),
    );

    const error = await api.post("/orders", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Some fields are invalid",
      details: { "customer.phone": ["Enter a valid phone number"] },
    });
  });

  it("reports a clear error when the server cannot be reached", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = await api.get("/menu").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("reports a clear error when the server replies with something that is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>Bad gateway</html>", { status: 502 }),
    );

    const error = await api.get("/menu").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, code: "UNEXPECTED_RESPONSE" });
  });
});

describe("api client session refresh", () => {
  it("refreshes an expired session and repeats the request", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(json(200, { data: { user: {} } }))
      .mockResolvedValueOnce(json(200, { data: { orders: ["o1"] } }));

    const result = await api.get("/orders");

    expect(result).toEqual({ orders: ["o1"] });
    expect(requestedPaths()).toEqual([
      "GET /api/v1/orders",
      "POST /api/v1/auth/refresh",
      "GET /api/v1/orders",
    ]);
  });

  it("repeats a POST with its original body after refreshing", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(json(200, { data: { user: {} } }))
      .mockResolvedValueOnce(json(201, { data: { order: { id: "o1" } } }));

    await api.post("/orders", { items: [1] });

    expect(fetchMock.mock.calls[2][1]?.body).toBe('{"items":[1]}');
  });

  it("gives up when the session cannot be refreshed", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(unauthenticated());

    const error = await api.get("/orders").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    expect(requestedPaths()).toEqual([
      "GET /api/v1/orders",
      "POST /api/v1/auth/refresh",
    ]);
  });

  it("repeats the request only once", async () => {
    fetchMock
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(json(200, { data: { user: {} } }))
      .mockResolvedValueOnce(unauthenticated());

    const error = await api.get("/orders").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("refreshes once when several requests fail at the same time", async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) {
        return json(200, { data: { user: {} } });
      }
      const alreadyRefreshed = fetchMock.mock.calls.some(([calledUrl]) =>
        String(calledUrl).endsWith("/auth/refresh"),
      );
      return alreadyRefreshed && init?.headers
        ? json(200, { data: { path } })
        : unauthenticated();
    });

    // Both start before any refresh has happened, so both get a 401.
    const [orders, me] = await Promise.all([
      api.get("/orders"),
      api.get("/auth/me"),
    ]);

    expect(orders).toEqual({ path: "/api/v1/orders" });
    expect(me).toEqual({ path: "/api/v1/auth/me" });
    const refreshCalls = requestedPaths().filter((call) =>
      call.endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("does not try to refresh when signing in fails", async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, {
        error: { code: "INVALID_CREDENTIALS", message: "Wrong password" },
      }),
    );

    const error = await api
      .post("/auth/login", { email: "a@b.co", password: "x" })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not loop when the refresh endpoint itself says unauthenticated", async () => {
    fetchMock.mockResolvedValue(unauthenticated());

    const error = await api.post("/auth/refresh").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
