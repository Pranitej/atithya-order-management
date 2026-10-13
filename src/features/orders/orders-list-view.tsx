"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentUser } from "@/features/auth/use-auth";
import { formatDateTime, shortOrderNumber } from "@/lib/format";
import { formatPrice } from "@/shared/money";
import { isTerminal } from "@/shared/order-status";
import { getOrders, orderKeys } from "./order-api";

const REFRESH_EVERY_MS = 5000;

export function OrdersListView() {
  const { data: user, isPending: loadingUser } = useCurrentUser();

  const orders = useQuery({
    queryKey: orderKeys.list(),
    queryFn: () => getOrders(),
    enabled: Boolean(user),
    // Keep statuses moving while something is still on its way.
    refetchInterval: (query) =>
      query.state.data?.some((order) => !isTerminal(order.status))
        ? REFRESH_EVERY_MS
        : false,
  });

  if (loadingUser) return <ListSkeleton />;

  if (!user) {
    return (
      <Notice
        title="Sign in to see your orders"
        action={
          <Link href="/login?next=/orders" className={buttonStyles()}>
            Sign in
          </Link>
        }
      >
        Your past and current orders are kept with your account.
      </Notice>
    );
  }

  if (orders.isPending) return <ListSkeleton />;

  if (orders.error) {
    return (
      <Notice
        tone="error"
        title="Your orders could not be loaded"
        action={
          <Button onClick={() => void orders.refetch()}>Try again</Button>
        }
      >
        {orders.error.message}
      </Notice>
    );
  }

  if (orders.data.length === 0) {
    return (
      <Notice
        title="You have not ordered anything yet"
        action={
          <Link href="/" className={buttonStyles()}>
            Browse the menu
          </Link>
        }
      >
        When you place an order it appears here, with live tracking.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-line border-y border-line">
      {orders.data.map((order) => (
        <Link
          key={order.id}
          href={`/orders/${order.id}`}
          className="group grid gap-2 py-5 transition-colors hover:bg-mist sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:px-4"
        >
          <span className="block">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold tabular-nums">
                {shortOrderNumber(order.id)}
              </span>
              <StatusBadge status={order.status} />
            </span>
            <span className="mt-2 block text-lg leading-snug">
              {order.items
                .map((line) => `${line.quantity} × ${line.name}`)
                .join(", ")}
            </span>
            <span className="mt-1 block text-sm text-muted">
              <time dateTime={order.createdAt}>
                {formatDateTime(order.createdAt)}
              </time>
            </span>
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatPrice(order.total)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your orders"
      className="grid gap-4"
    >
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-24" />
      ))}
    </div>
  );
}
