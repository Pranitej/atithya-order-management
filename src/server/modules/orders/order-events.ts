import { isTerminal } from "@/shared/order-status";
import type { OrderDTO } from "@/shared/types";

/**
 * Live order updates over Server-Sent Events.
 *
 * Serverless instances share no memory, so there is no in-process event bus
 * to subscribe to. The database is the one thing every instance can see, so
 * the stream checks it on a short interval and pushes the order to the
 * browser whenever it has changed. Reading the order also applies any
 * overdue simulation steps, which is what makes the status move while a
 * customer is watching.
 */

const POLL_MS = 2000;
/** Idle connections are often closed by proxies; a comment line keeps this one open. */
const KEEP_ALIVE_MS = 15_000;
/** How long the browser waits before reconnecting after the stream ends. */
const RECONNECT_MS = 2000;
/**
 * The hosting platform ends any response after five minutes. Closing a little
 * earlier ourselves makes the end a clean one; the browser then reconnects.
 */
export const STREAM_MAX_DURATION_MS = 240_000;

export type OrderEventStreamOptions = {
  /** Loads the order as the connected user is allowed to see it. */
  loadOrder: () => Promise<OrderDTO>;
  /** Aborted when the client disconnects. */
  signal: AbortSignal;
  maxDurationMs?: number;
};

export function createOrderEventStream({
  loadOrder,
  signal,
  maxDurationMs = STREAM_MAX_DURATION_MS,
}: OrderEventStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let readerGone = false;

  async function run(controller: ReadableStreamDefaultController<Uint8Array>) {
    const send = (frame: string) => controller.enqueue(encoder.encode(frame));

    const startedAt = Date.now();
    let lastWriteAt = startedAt;
    let lastSent: string | null = null;

    send(`retry: ${RECONNECT_MS}\n\n`);

    try {
      while (
        !signal.aborted &&
        !readerGone &&
        Date.now() - startedAt < maxDurationMs
      ) {
        const order = await loadOrder();
        const version = `${order.status}@${order.updatedAt}`;

        if (version !== lastSent) {
          send(`event: order\ndata: ${JSON.stringify(order)}\n\n`);
          lastSent = version;
          lastWriteAt = Date.now();
          // Nothing more will happen to a delivered or cancelled order.
          if (isTerminal(order.status)) break;
        } else if (Date.now() - lastWriteAt >= KEEP_ALIVE_MS) {
          send(": keep-alive\n\n");
          lastWriteAt = Date.now();
        }

        await sleep(POLL_MS, signal);
      }
    } catch {
      // The order could not be loaded. End the stream; the browser will
      // reconnect, and its ordinary request for the order reports the cause.
    } finally {
      try {
        controller.close();
      } catch {
        // Already closed because the reader went away.
      }
    }
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      void run(controller);
    },
    cancel() {
      readerGone = true;
    },
  });
}

/** Resolves after `ms`, or immediately if the client disconnects first. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}
