import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CartGate } from "@/features/cart/cart-hydration";
import { CheckoutView } from "@/features/checkout/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <PageShell>
      {/* The saved cart is only known in the browser, so wait for it. */}
      <CartGate fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <CheckoutView />
      </CartGate>
    </PageShell>
  );
}
