import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { OrdersListView } from "@/features/orders/orders-list-view";

export const metadata: Metadata = { title: "Your orders" };

export default function OrdersPage() {
  return (
    <PageShell className="max-w-4xl">
      <h1 className="mb-8 font-display text-4xl leading-tight sm:text-5xl">
        Your orders
      </h1>
      <OrdersListView />
    </PageShell>
  );
}
