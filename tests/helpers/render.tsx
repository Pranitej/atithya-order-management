import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

/** Renders with a fresh data cache, so nothing leaks between tests. */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

type Reply = { status: number; body: unknown };

/**
 * Replaces `fetch` with a table of canned API replies, keyed by
 * "METHOD /path". A request the test did not expect fails loudly.
 * Returns the mock so tests can inspect which requests were made.
 */
export function mockApi(routes: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${String(input)}`;
      const route = routes[key];
      if (!route) throw new Error(`Unexpected request in test: ${key}`);

      const { status, body } = typeof route === "function" ? route() : route;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The "METHOD /path" of every request made so far. */
export function requestsMade(fetchMock: ReturnType<typeof mockApi>): string[] {
  return fetchMock.mock.calls.map(
    ([input, init]) => `${init?.method ?? "GET"} ${String(input)}`,
  );
}
