import { NextRequest } from "next/server";

const ORIGIN = "http://localhost:3000";

type RouteHandler = (
  request: NextRequest,
  // Route handlers each declare their own params shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: { params: Promise<any> },
) => Promise<Response>;

type CallOptions = {
  body?: unknown;
  /** Send this exact string as the body, for malformed-JSON cases. */
  rawBody?: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

export type TestResponse = {
  status: number;
  // Tests assert on arbitrary response shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
  /** Raw Set-Cookie header values, one per cookie. */
  setCookies: string[];
};

type StoredCookie = { value: string; path: string };

/**
 * A minimal browser stand-in: it calls route handlers directly and carries
 * cookies between calls, honouring each cookie's Path the way a browser does.
 * One client is one browser session, so two clients are two separate users.
 */
export function createTestClient() {
  const jar = new Map<string, StoredCookie>();

  function storeCookies(setCookies: string[]) {
    for (const header of setCookies) {
      const [pair, ...attributes] = header.split(";").map((part) => part.trim());
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);

      const attribute = (key: string) =>
        attributes
          .find((item) => item.toLowerCase().startsWith(`${key}=`))
          ?.slice(key.length + 1);

      const expired =
        attribute("max-age") === "0" ||
        (attribute("expires") !== undefined &&
          new Date(attribute("expires")!).getTime() <= Date.now());

      if (expired || value === "") jar.delete(name);
      else jar.set(name, { value, path: attribute("path") ?? "/" });
    }
  }

  function cookieHeaderFor(pathname: string) {
    return [...jar.entries()]
      .filter(([, cookie]) => pathname.startsWith(cookie.path))
      .map(([name, cookie]) => `${name}=${cookie.value}`)
      .join("; ");
  }

  async function call(
    handler: RouteHandler,
    method: string,
    path: string,
    options: CallOptions = {},
  ): Promise<TestResponse> {
    const url = new URL(path, ORIGIN);
    const headers = new Headers(options.headers);

    const cookie = cookieHeaderFor(url.pathname);
    if (cookie && !headers.has("cookie")) headers.set("cookie", cookie);

    let body: string | undefined;
    if (options.rawBody !== undefined) body = options.rawBody;
    else if (options.body !== undefined) body = JSON.stringify(options.body);
    if (body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const request = new NextRequest(url, { method, headers, body });
    const response = await handler(request, {
      params: Promise.resolve(options.params ?? {}),
    });

    const setCookies = response.headers.getSetCookie();
    storeCookies(setCookies);

    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON (for example an event stream); leave it as text.
    }

    return {
      status: response.status,
      body: parsed,
      headers: response.headers,
      setCookies,
    };
  }

  return {
    get: (handler: RouteHandler, path: string, options?: CallOptions) =>
      call(handler, "GET", path, options),
    post: (handler: RouteHandler, path: string, options?: CallOptions) =>
      call(handler, "POST", path, options),
    patch: (handler: RouteHandler, path: string, options?: CallOptions) =>
      call(handler, "PATCH", path, options),
    delete: (handler: RouteHandler, path: string, options?: CallOptions) =>
      call(handler, "DELETE", path, options),
    /** The cookie value this client would send to `path`, if any. */
    cookie(name: string, path = "/"): string | undefined {
      const cookie = jar.get(name);
      return cookie && path.startsWith(cookie.path) ? cookie.value : undefined;
    },
    /** Replace a cookie's value, to simulate replaying an old token. */
    setCookie(name: string, value: string, path = "/") {
      jar.set(name, { value, path });
    },
    clearCookies() {
      jar.clear();
    },
  };
}

export type TestClient = ReturnType<typeof createTestClient>;
