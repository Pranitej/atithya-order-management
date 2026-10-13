import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderStatus } from "@/shared/order-status";
import type { OrderDTO } from "@/shared/types";
import { createOrderEventStream } from "./order-events";

function orderWith(status: OrderStatus, updatedAt: string): OrderDTO {
  return {
    id: "64b7f0c2a1d3e4f5a6b7c8d9",
    userId: "64b7f0c2a1d3e4f5a6b7c8da",
    items: [
      {
        menuItemId: "64b7f0c2a1d3e4f5a6b7c8db",
        name: "Margherita Pizza",
        unitPrice: 24900,
        quantity: 1,
        lineTotal: 24900,
      },
    ],
    customer: {
      name: "Asha Rao",
      address: "12 MG Road, Bengaluru",
      phone: "+919876543210",
    },
    subtotal: 24900,
    deliveryFee: 4000,
    tax: 1245,
    total: 30145,
    status,
    statusHistory: [{ status, at: updatedAt }],
    estimatedDeliveryAt: null,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt,
  };
}

const received = orderWith("received", "2026-03-01T12:00:00.000Z");
const preparing = orderWith("preparing", "2026-03-01T12:00:20.000Z");
const delivered = orderWith("delivered", "2026-03-01T12:01:00.000Z");

/** Reads a stream in the background and exposes what has arrived so far. */
function listenTo(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  let text = "";
  let closed = false;

  void (async () => {
    const reader = stream.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    closed = true;
  })();

  return {
    /** The orders received so far, parsed from `event: order` frames. */
    orders(): OrderDTO[] {
      return text
        .split("\n\n")
        .filter((frame) => frame.startsWith("event: order\n"))
        .map((frame) => JSON.parse(frame.slice(frame.indexOf("data: ") + 6)));
    },
    text: () => text,
    isClosed: () => closed,
  };
}

/** A loader that returns the given orders in turn, then repeats the last one. */
function loaderReturning(...orders: OrderDTO[]) {
  let calls = 0;
  const loadOrder = vi.fn(async () => {
    const order = orders[Math.min(calls, orders.length - 1)];
    calls += 1;
    return order;
  });
  return loadOrder;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("order event stream", () => {
  it("sends the current order as soon as the client connects", async () => {
    const stream = createOrderEventStream({
      loadOrder: loaderReturning(received),
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(0);

    expect(listener.orders()).toEqual([received]);
  });

  it("sends the order again when its status changes", async () => {
    const stream = createOrderEventStream({
      loadOrder: loaderReturning(received, preparing),
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(2000);

    expect(listener.orders()).toEqual([received, preparing]);
  });

  it("stays quiet while nothing has changed", async () => {
    const stream = createOrderEventStream({
      loadOrder: loaderReturning(received),
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(listener.orders()).toEqual([received]);
  });

  it("checks for changes every two seconds", async () => {
    const loadOrder = loaderReturning(received);
    createOrderEventStream({
      loadOrder,
      signal: new AbortController().signal,
    });

    await vi.advanceTimersByTimeAsync(6000);

    // Once on connect, then at 2s, 4s and 6s.
    expect(loadOrder).toHaveBeenCalledTimes(4);
  });

  it("sends a keep-alive comment when idle, so proxies keep the connection open", async () => {
    const stream = createOrderEventStream({
      loadOrder: loaderReturning(received),
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(14_000);
    expect(listener.text()).not.toContain(": keep-alive");

    await vi.advanceTimersByTimeAsync(2000);
    expect(listener.text()).toContain(": keep-alive\n\n");
  });

  it("tells the browser to reconnect two seconds after a drop", async () => {
    const stream = createOrderEventStream({
      loadOrder: loaderReturning(received),
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(0);

    expect(listener.text().startsWith("retry: 2000\n\n")).toBe(true);
  });

  it("closes once it has sent a finished order", async () => {
    const loadOrder = loaderReturning(received, delivered);
    const stream = createOrderEventStream({
      loadOrder,
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(listener.orders()).toEqual([received, delivered]);
    expect(listener.isClosed()).toBe(true);
    // No polling continues after the stream has ended.
    expect(loadOrder).toHaveBeenCalledTimes(2);
  });

  it("stops polling when the client disconnects", async () => {
    const controller = new AbortController();
    const loadOrder = loaderReturning(received);
    const stream = createOrderEventStream({
      loadOrder,
      signal: controller.signal,
    });
    const listener = listenTo(stream);
    await vi.advanceTimersByTimeAsync(2000);

    controller.abort();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(listener.isClosed()).toBe(true);
    expect(loadOrder).toHaveBeenCalledTimes(2);
  });

  it("closes itself before the hosting platform's time limit", async () => {
    const loadOrder = loaderReturning(received);
    const stream = createOrderEventStream({
      loadOrder,
      signal: new AbortController().signal,
      maxDurationMs: 10_000,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(9000);
    expect(listener.isClosed()).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);
    expect(listener.isClosed()).toBe(true);
  });

  it("closes instead of crashing if the order can no longer be loaded", async () => {
    const loadOrder = vi
      .fn<() => Promise<OrderDTO>>()
      .mockResolvedValueOnce(received)
      .mockRejectedValue(new Error("database unavailable"));
    const stream = createOrderEventStream({
      loadOrder,
      signal: new AbortController().signal,
    });
    const listener = listenTo(stream);

    await vi.advanceTimersByTimeAsync(2000);

    expect(listener.orders()).toEqual([received]);
    expect(listener.isClosed()).toBe(true);
  });
});
