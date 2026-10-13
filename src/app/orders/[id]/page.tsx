import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTrackingView } from "@/features/orders/order-tracking-view";

export const metadata: Metadata = { title: "Track your order" };

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <PageShell>
      {/* The id is only known per request, so it is read inside Suspense
          and the rest of the page can still be served as a static shell. */}
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        {params.then(({ id }) => (
          <OrderTrackingView orderId={id} />
        ))}
      </Suspense>
    </PageShell>
  );
}
