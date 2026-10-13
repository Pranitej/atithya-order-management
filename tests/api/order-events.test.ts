import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as orderEvents } from "@/app/api/v1/orders/[id]/events/route";
import { DELETE as cancelOrder } from "@/app/api/v1/orders/[id]/route";
import { POST as createOrder } from "@/app/api/v1/orders/route";
import {
  createMenuItem,
  signUpCustomer,
  validCustomer,
} from "../helpers/factories";
import { type TestClient, createTestClient } from "../helpers/http";

const ORDERS = "/api/v1/orders";
const T0 = new Date("2026-03-01T12:00:00.000Z");

let customer: TestClient;
let orderId: string;

beforeEach(async () => {
  // Only the clock is faked; the stream's own polling timer stays real.
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
  orderId = response.body.data.order.id;
});

/** Resolves once the stream has ended, with everything it sent as text. */
function openEvents(client: TestClient, id = orderId) {
  return client.get(orderEvents, `${ORDERS}/${id}/events`, { params: { id } });
}

function statusesIn(streamText: string): string[] {
  return streamText
    .split("\n\n")
    .filter((frame) => frame.startsWith("event: order\n"))
    .map(
      (frame) => JSON.parse(frame.slice(frame.indexOf("data: ") + 6)).status,
    );
}

describe("GET /orders/:id/events", () => {
  it("responds as an event stream that must not be cached or buffered", async () => {
    await customer.delete(cancelOrder, `${ORDERS}/${orderId}`, {
      params: { id: orderId },
    });

    const response = await openEvents(customer);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-cache");
  });

  it("sends a finished order once and then ends the stream", async () => {
    await customer.delete(cancelOrder, `${ORDERS}/${orderId}`, {
      params: { id: orderId },
    });

    const response = await openEvents(customer);

    expect(statusesIn(response.body)).toEqual(["cancelled"]);
  });

  it("pushes the new status to a customer who is already connected", async () => {
    const stream = openEvents(customer);
    // Give the stream a moment to send the order as it is now.
    await new Promise((resolve) => setTimeout(resolve, 200));

    // A minute passes: the simulated kitchen has delivered the order.
    vi.setSystemTime(new Date(T0.getTime() + 60_000));
    const response = await stream;

    expect(statusesIn(response.body)).toEqual(["received", "delivered"]);
  });

  it("does not open a stream for someone else's order", async () => {
    const { client: stranger } = await signUpCustomer("Someone Else");

    const response = await openEvents(stranger);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("requires signing in", async () => {
    const response = await openEvents(createTestClient());

    expect(response.status).toBe(401);
  });
});
