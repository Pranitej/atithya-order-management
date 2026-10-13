"use client";

import { useEffect, useRef, useState } from "react";
import { refreshSession } from "@/lib/api-client";
import type { OrderDTO } from "@/shared/types";

export type LiveState =
  /** Not listening, because there is nothing left to wait for. */
  | "idle"
  | "connecting"
  | "live"
  /** The connection dropped and the browser is retrying by itself. */
  | "reconnecting"
  /** Gave up; the page shows the last known status. */
  | "paused";

/** EventSource.CLOSED: the browser has stopped trying to connect. */
const CLOSED = 2;

/** How many times in a row a refused stream is retried after renewing the session. */
const MAX_RECOVERIES = 2;

/**
 * Subscribes to an order's server-sent events and calls `onOrder` each time
 * the server pushes the order. Returns the state of the connection so the
 * page can show whether it is live.
 *
 * EventSource reconnects by itself after a network drop. What it cannot
 * recover from is being refused outright, which happens when the access
 * token has expired; in that case the session is renewed and a new stream
 * is opened.
 */
export function useOrderStream(
  orderId: string,
  enabled: boolean,
  onOrder: (order: OrderDTO) => void,
): LiveState {
  const [state, setState] = useState<LiveState>("connecting");

  // Always call the latest callback without reopening the stream for it.
  const onOrderRef = useRef(onOrder);
  useEffect(() => {
    onOrderRef.current = onOrder;
  });

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let disposed = false;
    let recoveries = 0;

    const connect = () => {
      source = new EventSource(`/api/v1/orders/${orderId}/events`);

      source.addEventListener("open", () => {
        recoveries = 0;
        setState("live");
      });

      source.addEventListener("order", (event) => {
        onOrderRef.current(JSON.parse((event as MessageEvent<string>).data));
      });

      source.addEventListener("error", () => {
        if (source?.readyState !== CLOSED) {
          setState("reconnecting");
          return;
        }

        source.close();
        if (recoveries >= MAX_RECOVERIES) {
          setState("paused");
          return;
        }

        recoveries += 1;
        setState("reconnecting");
        void refreshSession().then((renewed) => {
          if (disposed) return;
          if (renewed) connect();
          else setState("paused");
        });
      });
    };

    connect();

    return () => {
      disposed = true;
      source?.close();
    };
  }, [orderId, enabled]);

  return enabled ? state : "idle";
}
