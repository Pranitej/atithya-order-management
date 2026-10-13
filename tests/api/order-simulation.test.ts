import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE as cancelOrder,
  GET as getOrder,
} from "@/app/api/v1/orders/[id]/route";
import { PATCH as updateStatus } from "@/app/api/v1/orders/[id]/status/route";
import {
  POST as createOrder,
  GET as listOrders,
} from "@/app/api/v1/orders/route";
import {
  createMenuItem,
  signUpAdmin,
  signUpCustomer,
  validCustomer,
} from "../helpers/factories";
import type { TestClient } from "../helpers/http";

/**
 * The backend simulates a kitchen: with ORDER_STEP_SECONDS=20 (see
 * tests/setup/env.ts) an order moves one status every 20 seconds. These tests
 * freeze the clock and move it by hand.
 */

const ORDERS = "/api/v1/orders";
const T0 = new Date("2026-03-01T12:00:00.000Z");

const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);
const iso = (seconds: number) => at(seconds).toISOString();

let customer: TestClient;
let orderId: string;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);

  const pizzaId = await createMenuItem();
  customer = (await signUpCustomer()).client;

  const response = await customer.post(createOrder, ORDERS, {
    body: {
      items: [{ menuItemId: pizzaId, quantity: 1 }],
      customer: validCustomer,
    },
  });
  expect(response.status).toBe(201);
  orderId = response.body.data.order.id;
});

async function orderSeenAt(seconds: number, client = customer) {
  vi.setSystemTime(at(seconds));
  const response = await client.get(getOrder, `${ORDERS}/${orderId}`, {
    params: { id: orderId },
  });
  expect(response.status).toBe(200);
  return response.body.data.order;
}

describe("status simulation", () => {
  it("keeps a new order at received for the first 19 seconds", async () => {
    expect((await orderSeenAt(19)).status).toBe("received");
  });

  it("starts preparing after 20 seconds", async () => {
    expect((await orderSeenAt(20)).status).toBe("preparing");
  });

  it("sends the order out for delivery after 40 seconds", async () => {
    expect((await orderSeenAt(40)).status).toBe("out_for_delivery");
  });

  it("delivers after 60 seconds", async () => {
    expect((await orderSeenAt(60)).status).toBe("delivered");
  });

  it("stamps each step with when it was due, not when someone looked", async () => {
    const order = await orderSeenAt(65);

    expect(order.statusHistory).toEqual([
      { status: "received", at: iso(0) },
      { status: "preparing", at: iso(20) },
      { status: "out_for_delivery", at: iso(40) },
      { status: "delivered", at: iso(60) },
    ]);
    expect(order.updatedAt).toBe(iso(60));
  });

  it("leaves a delivered order alone", async () => {
    await orderSeenAt(60);

    const muchLater = await orderSeenAt(600);

    expect(muchLater.status).toBe("delivered");
    expect(muchLater.statusHistory).toHaveLength(4);
  });

  it("advances orders when they are listed, not only when opened", async () => {
    vi.setSystemTime(at(20));

    const response = await customer.get(listOrders, ORDERS);

    expect(response.body.data.orders[0].status).toBe("preparing");
  });

  it("applies a step exactly once when many requests arrive together", async () => {
    vi.setSystemTime(at(20));

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        customer.get(getOrder, `${ORDERS}/${orderId}`, {
          params: { id: orderId },
        }),
      ),
    );

    for (const response of responses) {
      expect(response.body.data.order.status).toBe("preparing");
    }
    expect((await orderSeenAt(21)).statusHistory).toEqual([
      { status: "received", at: iso(0) },
      { status: "preparing", at: iso(20) },
    ]);
  });
});

describe("simulation alongside manual changes", () => {
  it("never advances a cancelled order", async () => {
    vi.setSystemTime(at(5));
    await customer.delete(cancelOrder, `${ORDERS}/${orderId}`, {
      params: { id: orderId },
    });

    const later = await orderSeenAt(120);

    expect(later.status).toBe("cancelled");
    expect(later.statusHistory).toEqual([
      { status: "received", at: iso(0) },
      { status: "cancelled", at: iso(5) },
    ]);
  });

  it("stops a customer cancelling once the kitchen has started by itself", async () => {
    vi.setSystemTime(at(20));

    const response = await customer.delete(
      cancelOrder,
      `${ORDERS}/${orderId}`,
      { params: { id: orderId } },
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORDER_NOT_CANCELLABLE");
  });

  it("restarts the countdown when staff move the order by hand", async () => {
    const { client: admin } = await signUpAdmin();
    vi.setSystemTime(at(5));
    await admin.patch(updateStatus, `${ORDERS}/${orderId}/status`, {
      params: { id: orderId },
      body: { status: "preparing" },
    });

    // Moved at 5s, so the next step is due at 25s rather than 40s.
    expect((await orderSeenAt(24)).status).toBe("preparing");
    expect((await orderSeenAt(25)).status).toBe("out_for_delivery");
  });

  it("judges a manual change against the simulated status, not a stale one", async () => {
    const { client: admin } = await signUpAdmin();
    vi.setSystemTime(at(20));

    // By now the order is "preparing", so "preparing" again is not a step forward.
    const response = await admin.patch(
      updateStatus,
      `${ORDERS}/${orderId}/status`,
      { params: { id: orderId }, body: { status: "preparing" } },
    );

    expect(response.status).toBe(409);
  });
});

describe("estimated delivery time", () => {
  it("is three steps after the order is placed", async () => {
    expect((await orderSeenAt(0)).estimatedDeliveryAt).toBe(iso(60));
  });

  it("does not move while the order progresses on schedule", async () => {
    expect((await orderSeenAt(45)).estimatedDeliveryAt).toBe(iso(60));
  });

  it("moves earlier when staff advance the order ahead of schedule", async () => {
    const { client: admin } = await signUpAdmin();
    vi.setSystemTime(at(5));
    await admin.patch(updateStatus, `${ORDERS}/${orderId}/status`, {
      params: { id: orderId },
      body: { status: "preparing" },
    });

    // Preparing at 5s: out for delivery at 25s, delivered at 45s.
    expect((await orderSeenAt(6)).estimatedDeliveryAt).toBe(iso(45));
  });

  it("is absent once the order has been delivered", async () => {
    expect((await orderSeenAt(60)).estimatedDeliveryAt).toBeNull();
  });
});
