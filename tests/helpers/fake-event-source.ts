import { act } from "@testing-library/react";
import type { OrderDTO } from "@/shared/types";

type Listener = (event: Event) => void;

/**
 * Stands in for the browser's EventSource, which jsdom does not provide.
 * Tests drive it by hand: open the connection, push an order, break it.
 */
export class FakeEventSource {
  static instances: FakeEventSource[] = [];

  static reset() {
    FakeEventSource.instances = [];
  }

  /** The most recently opened connection. */
  static get latest(): FakeEventSource {
    const latest = FakeEventSource.instances.at(-1);
    if (!latest) throw new Error("No EventSource has been opened");
    return latest;
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState = FakeEventSource.CONNECTING;
  closedByPage = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
    this.closedByPage = true;
  }

  private emit(type: string, event: Event) {
    act(() => {
      this.listeners.get(type)?.forEach((listener) => listener(event));
    });
  }

  // --- controls for tests -------------------------------------------------

  /** The server accepted the connection. */
  open() {
    this.readyState = FakeEventSource.OPEN;
    this.emit("open", new Event("open"));
  }

  /** The server pushed the order in its current state. */
  push(order: OrderDTO) {
    this.emit(
      "order",
      new MessageEvent("order", { data: JSON.stringify(order) }),
    );
  }

  /** The connection dropped; the browser is retrying by itself. */
  drop() {
    this.readyState = FakeEventSource.CONNECTING;
    this.emit("error", new Event("error"));
  }

  /** The server refused the connection (for example 401); no automatic retry. */
  refuse() {
    this.readyState = FakeEventSource.CLOSED;
    this.emit("error", new Event("error"));
  }
}
