import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { AdminOrdersView } from "@/features/admin/admin-orders-view";

export const metadata: Metadata = { title: "Kitchen orders" };

export default function AdminOrdersPage() {
  return (
    <PageShell>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">
        Kitchen orders
      </h1>
      <p className="mt-3 mb-8 max-w-prose text-lg text-muted">
        Orders move forward by themselves every few seconds to simulate a
        kitchen. You can also move one along by hand, and the customer sees the
        change straight away.
      </p>
      <AdminOrdersView />
    </PageShell>
  );
}
