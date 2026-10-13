import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ORDER_ID, orderInStatus } from "../../../tests/helpers/order-fixtures";
import { mockApi, renderWithProviders } from "../../../tests/helpers/render";
import { AdminOrdersView } from "./admin-orders-view";

const admin = {
  status: 200,
  body: {
    data: {
      user: {
        id: "64b7f0c2a1d3e4f5a6b7c8f0",
        name: "Kitchen Staff",
        email: "kitchen@atithya.example",
        role: "admin",
      },
    },
  },
};

const customer = {
  status: 200,
  body: {
    data: {
      user: {
        id: "64b7f0c2a1d3e4f5a6b7c8e1",
        name: "Asha Rao",
        email: "asha@example.com",
        role: "customer",
      },
    },
  },
};

const ordersReply = (...statuses: Parameters<typeof orderInStatus>[0][]) => ({
  status: 200,
  body: {
    data: {
      orders: statuses.map((status, index) => ({
        ...orderInStatus(status),
        id: `${ORDER_ID.slice(0, -1)}${index}`,
      })),
    },
  },
});

const orderRows = () => screen.findAllByRole("listitem");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminOrdersView", () => {
  it("lists each order with who it is for and its status", async () => {
    mockApi({
      "GET /api/v1/auth/me": admin,
      "GET /api/v1/orders": ordersReply("received"),
    });

    renderWithProviders(<AdminOrdersView />);

    const [row] = await orderRows();
    expect(within(row).getByText("Asha Rao")).toBeInTheDocument();
    expect(within(row).getByText("Order Received")).toBeInTheDocument();
    expect(within(row).getByText("1 × Margherita Pizza")).toBeInTheDocument();
  });

  it("moves an order to its next stage", async () => {
    const user = userEvent.setup();
    const orderId = `${ORDER_ID.slice(0, -1)}0`;
    const fetchMock = mockApi({
      "GET /api/v1/auth/me": admin,
      "GET /api/v1/orders": ordersReply("received"),
      [`PATCH /api/v1/orders/${orderId}/status`]: {
        status: 200,
        body: {
          data: { order: { ...orderInStatus("preparing"), id: orderId } },
        },
      },
    });
    renderWithProviders(<AdminOrdersView />);

    await user.click(
      await screen.findByRole("button", { name: "Start preparing" }),
    );

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        status: "preparing",
      });
    });
    const [row] = await orderRows();
    expect(await within(row).findByText("Preparing")).toBeInTheDocument();
  });

  it("names the next action after the stage the order is in", async () => {
    mockApi({
      "GET /api/v1/auth/me": admin,
      "GET /api/v1/orders": ordersReply("preparing", "out_for_delivery"),
    });

    renderWithProviders(<AdminOrdersView />);

    const [cooking, onTheRoad] = await orderRows();
    expect(
      within(cooking).getByRole("button", { name: "Send out for delivery" }),
    ).toBeInTheDocument();
    expect(
      within(onTheRoad).getByRole("button", { name: "Mark as delivered" }),
    ).toBeInTheDocument();
  });

  it("offers no actions on a finished order", async () => {
    mockApi({
      "GET /api/v1/auth/me": admin,
      "GET /api/v1/orders": ordersReply("delivered"),
    });

    renderWithProviders(<AdminOrdersView />);

    const [row] = await orderRows();
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the reason when a change is refused", async () => {
    const user = userEvent.setup();
    const orderId = `${ORDER_ID.slice(0, -1)}0`;
    mockApi({
      "GET /api/v1/auth/me": admin,
      "GET /api/v1/orders": ordersReply("received"),
      [`PATCH /api/v1/orders/${orderId}/status`]: {
        status: 409,
        body: {
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "This order was just updated. Refresh and try again.",
          },
        },
      },
    });
    renderWithProviders(<AdminOrdersView />);

    await user.click(
      await screen.findByRole("button", { name: "Start preparing" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This order was just updated. Refresh and try again.",
    );
  });

  it("says when there are no orders yet", async () => {
    mockApi({
      "GET /api/v1/auth/me": admin,
      "GET /api/v1/orders": ordersReply(),
    });

    renderWithProviders(<AdminOrdersView />);

    expect(
      await screen.findByRole("heading", { name: "No orders yet" }),
    ).toBeInTheDocument();
  });

  it("turns customers away without loading anyone's orders", async () => {
    const fetchMock = mockApi({ "GET /api/v1/auth/me": customer });

    renderWithProviders(<AdminOrdersView />);

    expect(
      await screen.findByRole("heading", {
        name: "This page is for kitchen staff",
      }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/v1/orders"),
      ),
    ).toBe(false);
  });
});
