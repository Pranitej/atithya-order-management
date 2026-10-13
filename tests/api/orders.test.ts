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
import { MenuItemModel } from "@/server/models/menu-item.model";
import { OrderModel } from "@/server/models/order.model";
import {
  createMenuItem,
  signUpAdmin,
  signUpCustomer,
  validCustomer,
} from "../helpers/factories";
import { type TestClient, createTestClient } from "../helpers/http";

const ORDERS = "/api/v1/orders";
const UNKNOWN_ID = "64b7f0c2a1d3e4f5a6b7c8d9";

let pizzaId: string;
let friesId: string;

beforeEach(async () => {
  pizzaId = await createMenuItem({ name: "Margherita Pizza", price: 24900 });
  friesId = await createMenuItem({
    name: "Masala Fries",
    price: 9900,
    category: "sides",
  });
});

function orderBody(items = [{ menuItemId: pizzaId, quantity: 1 }]) {
  return { items, customer: validCustomer };
}

async function placeOrder(client: TestClient, body = orderBody()) {
  const response = await client.post(createOrder, ORDERS, { body });
  expect(response.status).toBe(201);
  return response.body.data.order;
}

function fetchOrder(client: TestClient, id: string) {
  return client.get(getOrder, `${ORDERS}/${id}`, { params: { id } });
}

function setStatus(client: TestClient, id: string, status: string) {
  return client.patch(updateStatus, `${ORDERS}/${id}/status`, {
    params: { id },
    body: { status },
  });
}

function cancel(client: TestClient, id: string) {
  return client.delete(cancelOrder, `${ORDERS}/${id}`, { params: { id } });
}

describe("POST /orders", () => {
  it("places an order priced from the menu, not from the request", async () => {
    const { client, user } = await signUpCustomer();

    const response = await client.post(createOrder, ORDERS, {
      body: orderBody([
        { menuItemId: pizzaId, quantity: 2 },
        { menuItemId: friesId, quantity: 1 },
      ]),
    });

    expect(response.status).toBe(201);
    expect(response.body.data.order).toMatchObject({
      id: expect.any(String),
      userId: user.id,
      items: [
        {
          menuItemId: pizzaId,
          name: "Margherita Pizza",
          unitPrice: 24900,
          quantity: 2,
          lineTotal: 49800,
        },
        {
          menuItemId: friesId,
          name: "Masala Fries",
          unitPrice: 9900,
          quantity: 1,
          lineTotal: 9900,
        },
      ],
      // 59700 qualifies for free delivery; tax is 5%.
      subtotal: 59700,
      deliveryFee: 0,
      tax: 2985,
      total: 62685,
      status: "received",
    });
  });

  it("starts the status history with the moment the order was received", async () => {
    const { client } = await signUpCustomer();

    const order = await placeOrder(client);

    expect(order.statusHistory).toEqual([
      { status: "received", at: order.createdAt },
    ]);
  });

  it("stores the delivery details in normalised form", async () => {
    const { client } = await signUpCustomer();

    const order = await placeOrder(client, {
      items: [{ menuItemId: pizzaId, quantity: 1 }],
      customer: {
        name: "  Asha Rao ",
        address: " 12 MG Road, Indiranagar, Bengaluru ",
        phone: "+91 98765 43210",
      },
    });

    expect(order.customer).toEqual({
      name: "Asha Rao",
      address: "12 MG Road, Indiranagar, Bengaluru",
      phone: "+919876543210",
    });
  });

  it("ignores prices, totals and status sent by the client", async () => {
    const { client } = await signUpCustomer();

    const response = await client.post(createOrder, ORDERS, {
      body: {
        items: [{ menuItemId: pizzaId, quantity: 1, unitPrice: 1 }],
        customer: validCustomer,
        total: 1,
        status: "delivered",
      },
    });

    expect(response.body.data.order).toMatchObject({
      subtotal: 24900,
      total: 30145,
      status: "received",
    });
  });

  it("keeps the price that was charged even if the menu changes later", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);

    await MenuItemModel.updateOne(
      { _id: pizzaId },
      { price: 99900, name: "Renamed" },
    );

    const reloaded = (await fetchOrder(client, order.id)).body.data.order;
    expect(reloaded.items[0]).toMatchObject({
      name: "Margherita Pizza",
      unitPrice: 24900,
    });
    expect(reloaded.total).toBe(order.total);
  });

  it("requires signing in", async () => {
    const response = await createTestClient().post(createOrder, ORDERS, {
      body: orderBody(),
    });

    expect(response.status).toBe(401);
    expect(await OrderModel.countDocuments()).toBe(0);
  });

  it("rejects an empty cart", async () => {
    const { client } = await signUpCustomer();

    const response = await client.post(createOrder, ORDERS, {
      body: orderBody([]),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toHaveProperty("items");
  });

  it("rejects a quantity of zero", async () => {
    const { client } = await signUpCustomer();

    const response = await client.post(createOrder, ORDERS, {
      body: orderBody([{ menuItemId: pizzaId, quantity: 0 }]),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("items.0.quantity");
  });

  it("rejects incomplete delivery details and says which ones", async () => {
    const { client } = await signUpCustomer();

    const response = await client.post(createOrder, ORDERS, {
      body: {
        items: [{ menuItemId: pizzaId, quantity: 1 }],
        customer: { name: "", address: "Flat 2", phone: "12345" },
      },
    });

    expect(response.status).toBe(400);
    expect(Object.keys(response.body.error.details).sort()).toEqual([
      "customer.address",
      "customer.name",
      "customer.phone",
    ]);
    expect(await OrderModel.countDocuments()).toBe(0);
  });

  it("rejects an item that is not on the menu", async () => {
    const { client } = await signUpCustomer();

    const response = await client.post(createOrder, ORDERS, {
      body: orderBody([
        { menuItemId: pizzaId, quantity: 1 },
        { menuItemId: UNKNOWN_ID, quantity: 1 },
      ]),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("items.1.menuItemId");
    expect(await OrderModel.countDocuments()).toBe(0);
  });

  it("rejects an item that is currently unavailable", async () => {
    const { client } = await signUpCustomer();
    const soldOutId = await createMenuItem({ isAvailable: false });

    const response = await client.post(createOrder, ORDERS, {
      body: orderBody([{ menuItemId: soldOutId, quantity: 1 }]),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("items.0.menuItemId");
  });

  it("limits how many orders one address can place per minute", async () => {
    // Frozen mid-minute, so all the orders fall in one counting window.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T10:00:20Z"));
    const { client } = await signUpCustomer();
    const headers = { "x-forwarded-for": "203.0.113.50" };

    for (let count = 1; count <= 10; count++) {
      const accepted = await client.post(createOrder, ORDERS, {
        body: orderBody(),
        headers,
      });
      expect(accepted.status, `order ${count}`).toBe(201);
    }
    const blocked = await client.post(createOrder, ORDERS, {
      body: orderBody(),
      headers,
    });

    expect(blocked.status).toBe(429);
  });
});

describe("GET /orders/:id", () => {
  it("returns the order to the customer who placed it", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);

    const response = await fetchOrder(client, order.id);

    expect(response.status).toBe(200);
    expect(response.body.data.order).toEqual(order);
  });

  it("hides the order from other customers as if it did not exist", async () => {
    const { client: owner } = await signUpCustomer();
    const { client: stranger } = await signUpCustomer("Someone Else");
    const order = await placeOrder(owner);

    const response = await fetchOrder(stranger, order.id);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("lets an admin see any order", async () => {
    const { client: owner } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(owner);

    const response = await fetchOrder(admin, order.id);

    expect(response.status).toBe(200);
    expect(response.body.data.order.id).toBe(order.id);
  });

  it("returns 404 for an id that does not exist", async () => {
    const { client } = await signUpCustomer();

    expect((await fetchOrder(client, UNKNOWN_ID)).status).toBe(404);
  });

  it("returns 404 for an id that is not a valid database id", async () => {
    const { client } = await signUpCustomer();

    expect((await fetchOrder(client, "not-an-id")).status).toBe(404);
  });

  it("requires signing in", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);

    expect((await fetchOrder(createTestClient(), order.id)).status).toBe(401);
  });
});

describe("GET /orders", () => {
  it("lists only the signed-in customer's orders", async () => {
    const { client: asha } = await signUpCustomer();
    const { client: ravi } = await signUpCustomer("Ravi Kumar");
    const ashaOrder = await placeOrder(asha);
    await placeOrder(ravi);

    const response = await asha.get(listOrders, ORDERS);

    expect(response.status).toBe(200);
    const ids = response.body.data.orders.map((o: { id: string }) => o.id);
    expect(ids).toEqual([ashaOrder.id]);
  });

  it("lists the newest order first", async () => {
    const { client } = await signUpCustomer();
    const first = await placeOrder(client);
    const second = await placeOrder(client);

    const response = await client.get(listOrders, ORDERS);

    const ids = response.body.data.orders.map((o: { id: string }) => o.id);
    expect(ids).toEqual([second.id, first.id]);
  });

  it("lists every customer's orders for an admin", async () => {
    const { client: asha } = await signUpCustomer();
    const { client: ravi } = await signUpCustomer("Ravi Kumar");
    const { client: admin } = await signUpAdmin();
    await placeOrder(asha);
    await placeOrder(ravi);

    const response = await admin.get(listOrders, ORDERS);

    expect(response.body.data.orders).toHaveLength(2);
  });

  it("filters by status", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const waiting = await placeOrder(customer);
    const cooking = await placeOrder(customer);
    await setStatus(admin, cooking.id, "preparing");

    const response = await admin.get(listOrders, `${ORDERS}?status=received`);

    const ids = response.body.data.orders.map((o: { id: string }) => o.id);
    expect(ids).toEqual([waiting.id]);
  });

  it("rejects a status filter that is not a real status", async () => {
    const { client } = await signUpCustomer();

    const response = await client.get(listOrders, `${ORDERS}?status=lost`);

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("status");
  });

  it("returns an empty list for a customer with no orders", async () => {
    const { client } = await signUpCustomer();

    const response = await client.get(listOrders, ORDERS);

    expect(response.body.data.orders).toEqual([]);
  });

  it("requires signing in", async () => {
    expect((await createTestClient().get(listOrders, ORDERS)).status).toBe(401);
  });
});

describe("PATCH /orders/:id/status", () => {
  it("lets an admin move an order to the next status", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);

    const response = await setStatus(admin, order.id, "preparing");

    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe("preparing");
  });

  it("records each change in the status history", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);

    await setStatus(admin, order.id, "preparing");
    const response = await setStatus(admin, order.id, "out_for_delivery");

    const statuses = response.body.data.order.statusHistory.map(
      (change: { status: string }) => change.status,
    );
    expect(statuses).toEqual(["received", "preparing", "out_for_delivery"]);
  });

  it("shows the new status to the customer", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);

    await setStatus(admin, order.id, "preparing");

    const seenByCustomer = await fetchOrder(customer, order.id);
    expect(seenByCustomer.body.data.order.status).toBe("preparing");
  });

  it("refuses customers, even for their own order", async () => {
    const { client: customer } = await signUpCustomer();
    const order = await placeOrder(customer);

    const response = await setStatus(customer, order.id, "delivered");

    expect(response.status).toBe(403);
    expect((await fetchOrder(customer, order.id)).body.data.order.status).toBe(
      "received",
    );
  });

  it("refuses to skip a step", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);

    const response = await setStatus(admin, order.id, "delivered");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect((await fetchOrder(admin, order.id)).body.data.order.status).toBe(
      "received",
    );
  });

  it("refuses to move an order backwards", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);
    await setStatus(admin, order.id, "preparing");

    const response = await setStatus(admin, order.id, "received");

    expect(response.status).toBe(409);
  });

  it("refuses any change once the order is delivered", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);
    await setStatus(admin, order.id, "preparing");
    await setStatus(admin, order.id, "out_for_delivery");
    await setStatus(admin, order.id, "delivered");

    const response = await setStatus(admin, order.id, "cancelled");

    expect(response.status).toBe(409);
  });

  it("lets an admin cancel an order that is being prepared", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);
    await setStatus(admin, order.id, "preparing");

    const response = await setStatus(admin, order.id, "cancelled");

    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe("cancelled");
  });

  it("rejects a status that does not exist", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);

    const response = await setStatus(admin, order.id, "teleported");

    expect(response.status).toBe(400);
    expect(response.body.error.details).toHaveProperty("status");
  });

  it("returns 404 for an order that does not exist", async () => {
    const { client: admin } = await signUpAdmin();

    expect((await setStatus(admin, UNKNOWN_ID, "preparing")).status).toBe(404);
  });

  it("requires signing in", async () => {
    const { client: customer } = await signUpCustomer();
    const order = await placeOrder(customer);

    const response = await setStatus(createTestClient(), order.id, "preparing");

    expect(response.status).toBe(401);
  });
});

describe("DELETE /orders/:id", () => {
  it("lets the customer cancel before the kitchen starts", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);

    const response = await cancel(client, order.id);

    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe("cancelled");
    expect(response.body.data.order.estimatedDeliveryAt).toBeNull();
  });

  it("keeps the cancelled order in the customer's history", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);

    await cancel(client, order.id);

    const reloaded = await fetchOrder(client, order.id);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.data.order.status).toBe("cancelled");
  });

  it("refuses once the kitchen has started preparing", async () => {
    const { client: customer } = await signUpCustomer();
    const { client: admin } = await signUpAdmin();
    const order = await placeOrder(customer);
    await setStatus(admin, order.id, "preparing");

    const response = await cancel(customer, order.id);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORDER_NOT_CANCELLABLE");
    expect((await fetchOrder(customer, order.id)).body.data.order.status).toBe(
      "preparing",
    );
  });

  it("refuses to cancel the same order twice", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);
    await cancel(client, order.id);

    expect((await cancel(client, order.id)).status).toBe(409);
  });

  it("does not let one customer cancel another's order", async () => {
    const { client: owner } = await signUpCustomer();
    const { client: stranger } = await signUpCustomer("Someone Else");
    const order = await placeOrder(owner);

    const response = await cancel(stranger, order.id);

    expect(response.status).toBe(404);
    expect((await fetchOrder(owner, order.id)).body.data.order.status).toBe(
      "received",
    );
  });

  it("requires signing in", async () => {
    const { client } = await signUpCustomer();
    const order = await placeOrder(client);

    expect((await cancel(createTestClient(), order.id)).status).toBe(401);
  });
});
