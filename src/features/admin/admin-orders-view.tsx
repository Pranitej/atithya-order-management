"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentUser } from "@/features/auth/use-auth";
import {
  getOrders,
  orderKeys,
  updateOrderStatus,
} from "@/features/orders/order-api";
import { formatDateTime, shortOrderNumber } from "@/lib/format";
import { formatPrice } from "@/shared/money";
import {
  type OrderStatus,
  canTransition,
  nextStatus,
} from "@/shared/order-status";
import type { OrderDTO } from "@/shared/types";

/** What the button that moves an order into each status says. */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  preparing: "Start preparing",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark as delivered",
};

const REFRESH_EVERY_MS = 5000;

export function AdminOrdersView() {
  const queryClient = useQueryClient();
  const { data: user, isPending: loadingUser } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const orders = useQuery({
    queryKey: orderKeys.list(),
    queryFn: () => getOrders(),
    // Never requested for anyone but staff; the API would refuse anyway.
    enabled: isAdmin,
    // New orders and simulated progress appear without a manual reload.
    refetchInterval: REFRESH_EVERY_MS,
  });

  const change = useMutation({
    mutationFn: (input: { id: string; status: OrderStatus }) =>
      updateOrderStatus(input.id, input.status),
    onSuccess: (updated) => {
      queryClient.setQueryData<OrderDTO[]>(orderKeys.list(), (current) =>
        current?.map((order) => (order.id === updated.id ? updated : order)),
      );
      queryClient.setQueryData(orderKeys.detail(updated.id), updated);
    },
  });

  if (loadingUser) return <BoardSkeleton />;

  if (!user) {
    return (
      <Notice
        title="Sign in as kitchen staff"
        action={
          <Link href="/login?next=/admin/orders" className={buttonStyles()}>
            Sign in
          </Link>
        }
      >
        The order board is only available to the kitchen team.
      </Notice>
    );
  }

  if (!isAdmin) {
    return (
      <Notice
        title="This page is for kitchen staff"
        action={
          <Link href="/orders" className={buttonStyles()}>
            See your orders
          </Link>
        }
      >
        Your account can place and track orders, but cannot manage them.
      </Notice>
    );
  }

  if (orders.isPending) return <BoardSkeleton />;

  if (orders.error) {
    return (
      <Notice
        tone="error"
        title="The orders could not be loaded"
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
      <Notice title="No orders yet">
        New orders appear here as soon as customers place them.
      </Notice>
    );
  }

  return (
    <div>
      {change.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-chili-50 px-4 py-3 text-chili-700"
        >
          {change.error.message}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {orders.data.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            busy={change.isPending && change.variables?.id === order.id}
            onChange={(status) => change.mutate({ id: order.id, status })}
          />
        ))}
      </ul>
    </div>
  );
}

type OrderRowProps = {
  order: OrderDTO;
  busy: boolean;
  onChange: (status: OrderStatus) => void;
};

function OrderRow({ order, busy, onChange }: OrderRowProps) {
  const next = nextStatus(order.status);

  return (
    <li className="grid gap-4 py-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-8">
      <div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold tabular-nums">
            {shortOrderNumber(order.id)}
          </span>
          <StatusBadge status={order.status} />
        </p>
        <p className="mt-1.5 font-semibold">{order.customer.name}</p>
        <p className="text-sm text-muted">{order.customer.address}</p>
      </div>

      <div>
        {order.items.map((line) => (
          <p key={line.menuItemId}>{`${line.quantity} × ${line.name}`}</p>
        ))}
        <p className="mt-1 text-sm text-muted tabular-nums">
          {formatPrice(order.total)}, placed{" "}
          <time dateTime={order.createdAt}>
            {formatDateTime(order.createdAt)}
          </time>
        </p>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {next && (
          <Button size="sm" loading={busy} onClick={() => onChange(next)}>
            {ACTION_LABELS[next]}
          </Button>
        )}
        {canTransition(order.status, "cancelled") && (
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => onChange("cancelled")}
          >
            Cancel order
          </Button>
        )}
      </div>
    </li>
  );
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading orders" className="grid gap-4">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-24" />
      ))}
    </div>
  );
}
