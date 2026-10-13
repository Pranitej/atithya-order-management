import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "../../../tests/helpers/fake-event-source";
import { ORDER_ID, orderInStatus } from "../../../tests/helpers/order-fixtures";
import {
  mockApi,
  renderWithProviders,
  requestsMade,
} from "../../../tests/helpers/render";
import { OrderTrackingView } from "./order-tracking-view";

const ORDER_URL = `/api/v1/orders/${ORDER_ID}`;
const EVENTS_URL = `${ORDER_URL}/events`;

const orderReply = (status: Parameters<typeof orderInStatus>[0]) => ({
  status: 200,
  body: { data: { order: orderInStatus(status) } },
});

const headline = () => screen.findByRole("heading", { level: 1 });

const currentStep = () =>
  within(screen.getByRole("list", { name: "Order progress" }))
    .getAllByRole("listitem")
    .find((item) => item.getAttribute("aria-current") === "step");

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OrderTrackingView", () => {
  it("shows where the order is", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    expect(await headline()).toHaveTextContent("We have your order");
    expect(currentStep()).toHaveTextContent("Order Received");
  });

  it("shows what was ordered, the bill and where it is going", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    expect(await screen.findByText("Margherita Pizza")).toBeInTheDocument();
    expect(screen.getByText("₹301.45")).toBeInTheDocument();
    expect(
      screen.getByText("12 MG Road, Indiranagar, Bengaluru 560038"),
    ).toBeInTheDocument();
  });

  it("shows the expected arrival time while the order is on its way", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("preparing") });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    const arrival = await screen.findByTestId("arrival-time");
    expect(arrival).toHaveAttribute("datetime", "2026-03-01T12:01:00.000Z");
  });
});

describe("OrderTrackingView live updates", () => {
  it("subscribes to the order's event stream", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    expect(FakeEventSource.latest.url).toBe(EVENTS_URL);
  });

  it("moves to the new status the moment the server pushes it", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    FakeEventSource.latest.push(orderInStatus("preparing"));

    expect(await headline()).toHaveTextContent("Your food is being prepared");
    expect(currentStep()).toHaveTextContent("Preparing");
  });

  it("says when live updates are connected", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    FakeEventSource.latest.open();

    expect(screen.getByRole("status")).toHaveTextContent("Live updates on");
  });

  it("says when the connection has dropped and is being retried", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();
    FakeEventSource.latest.open();

    FakeEventSource.latest.drop();

    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting");
  });

  it("stops listening once the order is delivered", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("out_for_delivery") });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();
    const stream = FakeEventSource.latest;

    stream.push(orderInStatus("delivered"));

    expect(await headline()).toHaveTextContent("Delivered");
    expect(stream.closedByPage).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("does not open a stream for an order that is already finished", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("delivered") });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("closes the stream when the customer leaves the page", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("received") });
    const { unmount } = renderWithProviders(
      <OrderTrackingView orderId={ORDER_ID} />,
    );
    await headline();
    const stream = FakeEventSource.latest;

    unmount();

    expect(stream.closedByPage).toBe(true);
  });

  it("renews the session and reconnects when the server refuses the stream", async () => {
    const fetchMock = mockApi({
      [`GET ${ORDER_URL}`]: orderReply("received"),
      "POST /api/v1/auth/refresh": {
        status: 200,
        body: { data: { user: {} } },
      },
    });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    FakeEventSource.latest.refuse();

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
    expect(requestsMade(fetchMock)).toContain("POST /api/v1/auth/refresh");
    expect(FakeEventSource.latest.url).toBe(EVENTS_URL);
  });

  it("says live updates are paused when the session cannot be renewed", async () => {
    mockApi({
      [`GET ${ORDER_URL}`]: orderReply("received"),
      "POST /api/v1/auth/refresh": {
        status: 401,
        body: { error: { code: "UNAUTHENTICATED", message: "Sign in" } },
      },
    });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    FakeEventSource.latest.refuse();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Live updates are paused",
      ),
    );
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

describe("OrderTrackingView cancelling", () => {
  it("cancels an order the kitchen has not started", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      [`GET ${ORDER_URL}`]: orderReply("received"),
      [`DELETE ${ORDER_URL}`]: orderReply("cancelled"),
    });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    await user.click(
      await screen.findByRole("button", { name: "Cancel order" }),
    );

    expect(await headline()).toHaveTextContent("This order was cancelled");
    expect(requestsMade(fetchMock)).toContain(`DELETE ${ORDER_URL}`);
  });

  it("offers no cancel button once the kitchen has started", async () => {
    mockApi({ [`GET ${ORDER_URL}`]: orderReply("preparing") });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);
    await headline();

    expect(
      screen.queryByRole("button", { name: "Cancel order" }),
    ).not.toBeInTheDocument();
  });

  it("explains why when the order can no longer be cancelled", async () => {
    const user = userEvent.setup();
    mockApi({
      [`GET ${ORDER_URL}`]: orderReply("received"),
      [`DELETE ${ORDER_URL}`]: {
        status: 409,
        body: {
          error: {
            code: "ORDER_NOT_CANCELLABLE",
            message:
              'This order is already "Preparing" and can no longer be cancelled',
          },
        },
      },
    });
    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    await user.click(
      await screen.findByRole("button", { name: "Cancel order" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'This order is already "Preparing" and can no longer be cancelled',
    );
  });
});

describe("OrderTrackingView when the order cannot be shown", () => {
  it("says so when the order does not exist", async () => {
    mockApi({
      [`GET ${ORDER_URL}`]: {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Order not found" } },
      },
    });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    expect(
      await screen.findByRole("heading", {
        name: "We could not find that order",
      }),
    ).toBeInTheDocument();
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("asks the customer to sign in when their session has ended", async () => {
    mockApi({
      [`GET ${ORDER_URL}`]: {
        status: 401,
        body: { error: { code: "UNAUTHENTICATED", message: "Sign in" } },
      },
      "POST /api/v1/auth/refresh": {
        status: 401,
        body: { error: { code: "UNAUTHENTICATED", message: "Sign in" } },
      },
    });

    renderWithProviders(<OrderTrackingView orderId={ORDER_ID} />);

    const signIn = await screen.findByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", `/login?next=/orders/${ORDER_ID}`);
  });
});
