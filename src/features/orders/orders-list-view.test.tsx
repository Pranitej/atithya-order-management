import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ORDER_ID, orderInStatus } from "../../../tests/helpers/order-fixtures";
import { mockApi, renderWithProviders } from "../../../tests/helpers/render";
import { OrdersListView } from "./orders-list-view";

const signedIn = {
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

const signedOut = {
  status: 401,
  body: { error: { code: "UNAUTHENTICATED", message: "Sign in to continue" } },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OrdersListView", () => {
  it("lists each order with its status and total, linked to its tracking page", async () => {
    mockApi({
      "GET /api/v1/auth/me": signedIn,
      "GET /api/v1/orders": {
        status: 200,
        body: { data: { orders: [orderInStatus("preparing")] } },
      },
    });

    renderWithProviders(<OrdersListView />);

    const link = await screen.findByRole("link", { name: /Margherita Pizza/ });
    expect(link).toHaveAttribute("href", `/orders/${ORDER_ID}`);
    expect(within(link).getByText("Preparing")).toBeInTheDocument();
    expect(within(link).getByText("₹301.45")).toBeInTheDocument();
  });

  it("invites a customer with no orders to the menu", async () => {
    mockApi({
      "GET /api/v1/auth/me": signedIn,
      "GET /api/v1/orders": { status: 200, body: { data: { orders: [] } } },
    });

    renderWithProviders(<OrdersListView />);

    expect(
      await screen.findByRole("heading", {
        name: "You have not ordered anything yet",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse the menu" }),
    ).toHaveAttribute("href", "/");
  });

  it("asks a visitor to sign in instead of loading orders", async () => {
    const fetchMock = mockApi({
      "GET /api/v1/auth/me": signedOut,
      "POST /api/v1/auth/refresh": signedOut,
    });

    renderWithProviders(<OrdersListView />);

    expect(
      await screen.findByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/login?next=/orders");
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/v1/orders"),
      ),
    ).toBe(false);
  });
});
