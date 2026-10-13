import { route } from "@/server/http/route";
import { createOrderEventStream } from "@/server/modules/orders/order-events";
import { getOrder } from "@/server/modules/orders/order.service";

/** The platform's ceiling for a streamed response; the stream ends itself sooner. */
export const maxDuration = 300;

export const GET = route(
  { auth: "user" },
  async ({ user, params, request }) => {
    // Checked before streaming starts, so a missing or forbidden order is an
    // ordinary JSON 404 rather than an event stream that fails silently.
    await getOrder(user, params.id);

    const stream = createOrderEventStream({
      loadOrder: () => getOrder(user, params.id),
      signal: request.signal,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        // Ask any proxy in front of us to pass events through as they are sent.
        "X-Accel-Buffering": "no",
      },
    });
  },
);
