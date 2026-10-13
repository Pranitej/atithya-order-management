import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import { fries, pizza } from "../../../tests/helpers/menu-fixtures";
import { ORDER_ID, orderInStatus } from "../../../tests/helpers/order-fixtures";
import { mockApi, renderWithProviders } from "../../../tests/helpers/render";
import { CheckoutView } from "./checkout-view";

// The Next.js router only exists inside a running app, so it is the one
// thing replaced here; `push` records where the page tried to go.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const asha = {
  id: "64b7f0c2a1d3e4f5a6b7c8e1",
  name: "Asha Rao",
  email: "asha@example.com",
  role: "customer" as const,
};

const signedInAsAsha = { status: 200, body: { data: { user: asha } } };
const signedOut = {
  status: 401,
  body: { error: { code: "UNAUTHENTICATED", message: "Sign in to continue" } },
};

async function fillDeliveryDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText("Delivery address"),
    "12 MG Road, Indiranagar, Bengaluru 560038",
  );
  await user.type(screen.getByLabelText("Phone number"), "+91 98765 43210");
}

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
  cartStore.setState({ lines: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckoutView", () => {
  it("sends the cart and delivery details, then opens the new order", async () => {
    const user = userEvent.setup();
    cartStore.getState().add(pizza);
    cartStore.getState().add(pizza);
    cartStore.getState().add(fries);
    const fetchMock = mockApi({
      "GET /api/v1/auth/me": signedInAsAsha,
      "POST /api/v1/orders": {
        status: 201,
        body: { data: { order: orderInStatus("received") } },
      },
    });
    renderWithProviders(<CheckoutView />);

    await fillDeliveryDetails(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/orders/${ORDER_ID}`),
    );
    const placed = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input) === "/api/v1/orders" && init?.method === "POST",
    );
    // Only ids and quantities are sent: the server decides the prices.
    expect(JSON.parse(String(placed?.[1]?.body))).toEqual({
      items: [
        { menuItemId: pizza.id, quantity: 2 },
        { menuItemId: fries.id, quantity: 1 },
      ],
      customer: {
        name: "Asha Rao",
        address: "12 MG Road, Indiranagar, Bengaluru 560038",
        phone: "+919876543210",
      },
    });
  });

  it("empties the cart once the order is placed", async () => {
    const user = userEvent.setup();
    cartStore.getState().add(pizza);
    mockApi({
      "GET /api/v1/auth/me": signedInAsAsha,
      "POST /api/v1/orders": {
        status: 201,
        body: { data: { order: orderInStatus("received") } },
      },
    });
    renderWithProviders(<CheckoutView />);

    await fillDeliveryDetails(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => expect(cartStore.getState().lines).toEqual([]));
  });

  it("keeps the cart and explains when the kitchen refuses the order", async () => {
    const user = userEvent.setup();
    cartStore.getState().add(pizza);
    mockApi({
      "GET /api/v1/auth/me": signedInAsAsha,
      "POST /api/v1/orders": {
        status: 400,
        body: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Some fields are invalid",
            details: {
              "items.0.menuItemId": ["This item is no longer available"],
            },
          },
        },
      },
    });
    renderWithProviders(<CheckoutView />);

    await fillDeliveryDetails(user);
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Margherita Pizza is no longer available",
    );
    expect(cartStore.getState().lines).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("shows what is being ordered and the bill", async () => {
    cartStore.getState().add(pizza);
    cartStore.getState().add(pizza);
    cartStore.getState().add(fries);
    mockApi({ "GET /api/v1/auth/me": signedInAsAsha });

    renderWithProviders(<CheckoutView />);

    expect(await screen.findByText("Margherita Pizza")).toBeInTheDocument();
    expect(screen.getByText("₹626.85")).toBeInTheDocument();
  });

  it("asks a signed-out customer to sign in before taking delivery details", async () => {
    cartStore.getState().add(pizza);
    mockApi({
      "GET /api/v1/auth/me": signedOut,
      "POST /api/v1/auth/refresh": signedOut,
    });

    renderWithProviders(<CheckoutView />);

    expect(
      await screen.findByRole("button", { name: "Continue as demo customer" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Delivery address")).not.toBeInTheDocument();
  });

  it("sends an empty-handed visitor back to the menu", async () => {
    mockApi({ "GET /api/v1/auth/me": signedInAsAsha });

    renderWithProviders(<CheckoutView />);

    expect(
      await screen.findByRole("heading", { name: "Your cart is empty" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse the menu" }),
    ).toHaveAttribute("href", "/");
  });
});
