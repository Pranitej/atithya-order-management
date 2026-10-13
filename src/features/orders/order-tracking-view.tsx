"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { formatTime, shortOrderNumber } from "@/lib/format";
import {
  type OrderStatus,
  canCustomerCancel,
  isTerminal,
} from "@/shared/order-status";
import type { OrderDTO } from "@/shared/types";
import { cancelOrder, getOrder, orderKeys } from "./order-api";
import { OrderStatusTracker } from "./order-status-tracker";
import { OrderSummary } from "./order-summary";
import { type LiveState, useOrderStream } from "./use-order-stream";

const HEADLINES: Record<OrderStatus, string> = {
  received: "We have your order",
  preparing: "Your food is being prepared",
  out_for_delivery: "Your order is on its way",
  delivered: "Delivered. Enjoy your meal.",
  cancelled: "This order was cancelled",
};

export function OrderTrackingView({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const queryKey = orderKeys.detail(orderId);

  const {
    data: order,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getOrder(orderId),
  });

  // Each pushed order replaces the cached one, which re-renders the page.
  const liveState = useOrderStream(
    orderId,
    order !== undefined && !isTerminal(order.status),
    (pushed) => queryClient.setQueryData<OrderDTO>(queryKey, pushed),
  );

  const cancellation = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: (cancelled) => {
      queryClient.setQueryData<OrderDTO>(queryKey, cancelled);
      // The order lists now show a stale status; this order is already current.
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists });
    },
  });

  if (isPending) return <TrackingSkeleton />;

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;

    if (status === 401) {
      return (
        <Notice
          title="Sign in to see this order"
          action={
            <Link
              href={`/login?next=/orders/${orderId}`}
              className={buttonStyles()}
            >
              Sign in
            </Link>
          }
        >
          Your session has ended. Sign in again to keep tracking your order.
        </Notice>
      );
    }

    if (status === 404) {
      return (
        <Notice
          title="We could not find that order"
          action={
            <Link href="/orders" className={buttonStyles()}>
              See your orders
            </Link>
          }
        >
          The link may be wrong, or the order belongs to a different account.
        </Notice>
      );
    }

    return (
      <Notice
        tone="error"
        title="This order could not be loaded"
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      >
        {error.message}
      </Notice>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
      <section>
        <p className="text-muted">
          Order{" "}
          <span className="font-semibold text-ink tabular-nums">
            {shortOrderNumber(order.id)}
          </span>
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] text-balance sm:text-5xl">
          {HEADLINES[order.status]}
        </h1>

        {order.estimatedDeliveryAt && (
          <p className="mt-4 text-lg">
            Arriving by{" "}
            <time
              data-testid="arrival-time"
              dateTime={order.estimatedDeliveryAt}
              className="font-semibold tabular-nums"
            >
              {formatTime(order.estimatedDeliveryAt)}
            </time>
          </p>
        )}

        <LiveIndicator state={liveState} />

        <div className="mt-8">
          <OrderStatusTracker
            status={order.status}
            history={order.statusHistory}
          />
        </div>

        {canCustomerCancel(order.status) && (
          <div className="mt-8 flex flex-col items-start gap-3">
            <Button
              variant="danger"
              loading={cancellation.isPending}
              onClick={() => cancellation.mutate()}
            >
              Cancel order
            </Button>
            <p className="text-sm text-muted">
              You can cancel until the kitchen starts preparing your food.
            </p>
          </div>
        )}
        {cancellation.error && (
          <p role="alert" className="mt-3 text-chili-700">
            {cancellation.error.message}
          </p>
        )}

        {isTerminal(order.status) && (
          <Link
            href="/"
            className={buttonStyles({
              variant: "secondary",
              className: "mt-8",
            })}
          >
            Order something else
          </Link>
        )}
      </section>

      <aside>
        <OrderSummary order={order} />
      </aside>
    </div>
  );
}

const LIVE_MESSAGES: Record<Exclude<LiveState, "idle">, string> = {
  connecting: "Connecting to live updates",
  live: "Live updates on",
  reconnecting: "Reconnecting to live updates",
  paused: "Live updates are paused. Reload the page to reconnect.",
};

/** Tells the customer whether the status on screen is being kept up to date. */
function LiveIndicator({ state }: { state: LiveState }) {
  if (state === "idle") return null;

  return (
    <p
      role="status"
      className="mt-4 inline-flex items-center gap-2 text-sm text-muted"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          state === "live" ? "bg-leaf-700" : "bg-gold-600",
          state === "paused" && "bg-chili-600",
        )}
      />
      {LIVE_MESSAGES[state]}
    </p>
  );
}

function TrackingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your order"
      className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16"
    >
      <div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-12 w-4/5" />
        <Skeleton className="mt-5 h-6 w-44" />
        <div className="mt-10 flex flex-col gap-7">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
