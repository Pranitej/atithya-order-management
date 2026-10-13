import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StatusChangeDTO } from "@/shared/types";
import { OrderStatusTracker } from "./order-status-tracker";

const RECEIVED_AT = "2026-03-01T12:00:00.000Z";
const PREPARING_AT = "2026-03-01T12:00:20.000Z";
const OUT_AT = "2026-03-01T12:00:40.000Z";
const DELIVERED_AT = "2026-03-01T12:01:00.000Z";

const received: StatusChangeDTO = { status: "received", at: RECEIVED_AT };
const preparing: StatusChangeDTO = { status: "preparing", at: PREPARING_AT };
const out: StatusChangeDTO = { status: "out_for_delivery", at: OUT_AT };
const delivered: StatusChangeDTO = { status: "delivered", at: DELIVERED_AT };

const steps = () =>
  within(screen.getByRole("list", { name: "Order progress" })).getAllByRole(
    "listitem",
  );

const step = (label: string) =>
  steps().find((item) => within(item).queryByText(label) !== null)!;

/** The machine-readable time shown on a step, if it has one. */
const timeOn = (label: string) =>
  step(label).querySelector("time")?.getAttribute("datetime") ?? null;

describe("OrderStatusTracker", () => {
  it("lists the four stages of an order in sequence", () => {
    render(<OrderStatusTracker status="received" history={[received]} />);

    const labels = steps().map(
      (item) => within(item).getByTestId("step-label").textContent,
    );
    expect(labels).toEqual([
      "Order Received",
      "Preparing",
      "Out for Delivery",
      "Delivered",
    ]);
  });

  it("marks the stage the order is at now", () => {
    render(
      <OrderStatusTracker status="preparing" history={[received, preparing]} />,
    );

    expect(step("Preparing")).toHaveAttribute("aria-current", "step");
    expect(step("Order Received")).not.toHaveAttribute("aria-current");
    expect(step("Out for Delivery")).not.toHaveAttribute("aria-current");
  });

  it("says in words which stages are done, in progress and still to come", () => {
    render(
      <OrderStatusTracker status="preparing" history={[received, preparing]} />,
    );

    expect(
      within(step("Order Received")).getByText("Completed"),
    ).toBeInTheDocument();
    expect(
      within(step("Preparing")).getByText("In progress"),
    ).toBeInTheDocument();
    expect(
      within(step("Out for Delivery")).getByText("Not started"),
    ).toBeInTheDocument();
  });

  it("shows when each reached stage happened", () => {
    render(
      <OrderStatusTracker status="preparing" history={[received, preparing]} />,
    );

    expect(timeOn("Order Received")).toBe(RECEIVED_AT);
    expect(timeOn("Preparing")).toBe(PREPARING_AT);
  });

  it("shows no time for stages that have not happened", () => {
    render(
      <OrderStatusTracker status="preparing" history={[received, preparing]} />,
    );

    expect(timeOn("Out for Delivery")).toBeNull();
    expect(timeOn("Delivered")).toBeNull();
  });

  it("shows every stage as completed once delivered", () => {
    render(
      <OrderStatusTracker
        status="delivered"
        history={[received, preparing, out, delivered]}
      />,
    );

    for (const item of steps()) {
      expect(within(item).getByText("Completed")).toBeInTheDocument();
    }
    expect(timeOn("Delivered")).toBe(DELIVERED_AT);
  });

  it("ends a cancelled order at the cancellation, without the stages it never reached", () => {
    const cancelledAt = "2026-03-01T12:00:30.000Z";
    render(
      <OrderStatusTracker
        status="cancelled"
        history={[
          received,
          preparing,
          { status: "cancelled", at: cancelledAt },
        ]}
      />,
    );

    const labels = steps().map(
      (item) => within(item).getByTestId("step-label").textContent,
    );
    expect(labels).toEqual(["Order Received", "Preparing", "Cancelled"]);
    expect(timeOn("Cancelled")).toBe(cancelledAt);
  });
});
