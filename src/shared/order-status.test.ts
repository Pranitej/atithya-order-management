import { describe, expect, it } from "vitest";
import {
  canCustomerCancel,
  canTransition,
  isTerminal,
  nextStatus,
} from "./order-status";

describe("nextStatus", () => {
  it.each([
    ["received", "preparing"],
    ["preparing", "out_for_delivery"],
    ["out_for_delivery", "delivered"],
  ] as const)("moves %s on to %s", (from, to) => {
    expect(nextStatus(from)).toBe(to);
  });

  it.each(["delivered", "cancelled"] as const)(
    "has nothing after %s",
    (status) => {
      expect(nextStatus(status)).toBeNull();
    },
  );
});

describe("canTransition", () => {
  it("allows moving one step forward", () => {
    expect(canTransition("received", "preparing")).toBe(true);
    expect(canTransition("preparing", "out_for_delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered")).toBe(true);
  });

  it("rejects skipping a step", () => {
    expect(canTransition("received", "out_for_delivery")).toBe(false);
    expect(canTransition("received", "delivered")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(canTransition("preparing", "received")).toBe(false);
    expect(canTransition("delivered", "out_for_delivery")).toBe(false);
  });

  it("rejects staying in the same status", () => {
    expect(canTransition("preparing", "preparing")).toBe(false);
  });

  it("allows cancelling while the order is still in the kitchen", () => {
    expect(canTransition("received", "cancelled")).toBe(true);
    expect(canTransition("preparing", "cancelled")).toBe(true);
  });

  it("rejects cancelling once the order is out for delivery", () => {
    expect(canTransition("out_for_delivery", "cancelled")).toBe(false);
  });

  it("rejects every move out of a finished order", () => {
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "received")).toBe(false);
    expect(canTransition("cancelled", "preparing")).toBe(false);
  });
});

describe("canCustomerCancel", () => {
  it("lets a customer cancel only before the kitchen starts", () => {
    expect(canCustomerCancel("received")).toBe(true);
    expect(canCustomerCancel("preparing")).toBe(false);
    expect(canCustomerCancel("out_for_delivery")).toBe(false);
    expect(canCustomerCancel("delivered")).toBe(false);
    expect(canCustomerCancel("cancelled")).toBe(false);
  });
});

describe("isTerminal", () => {
  it("treats delivered and cancelled as finished", () => {
    expect(isTerminal("delivered")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
  });

  it("treats every in-progress status as not finished", () => {
    expect(isTerminal("received")).toBe(false);
    expect(isTerminal("preparing")).toBe(false);
    expect(isTerminal("out_for_delivery")).toBe(false);
  });
});
