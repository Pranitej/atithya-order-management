"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonStyles } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthForm } from "@/features/auth/auth-form";
import { useCurrentUser } from "@/features/auth/use-auth";
import { type CartLine, useCart } from "@/features/cart/cart-store";
import { PriceBreakdown } from "@/features/cart/price-breakdown";
import { orderKeys, placeOrder } from "@/features/orders/order-api";
import { ApiError } from "@/lib/api-client";
import { formatPrice } from "@/shared/money";
import { calculateTotals } from "@/shared/pricing";
import type { DeliveryDetails } from "@/shared/schemas";
import { CheckoutForm } from "./checkout-form";

/**
 * Turns the API's refusal into something the customer can act on. An item
 * error arrives as "items.<index>.menuItemId", and the index lines up with
 * the cart because the items were sent in cart order.
 */
function describeFailure(error: Error, lines: CartLine[]): string | null {
  if (!(error instanceof ApiError) || !error.details) return error.message;

  const unavailable = Object.keys(error.details)
    .map((field) => /^items\.(\d+)\./.exec(field)?.[1])
    .filter((index) => index !== undefined)
    .map((index) => lines[Number(index)]?.name)
    .filter(Boolean);

  if (unavailable.length > 0) {
    return `${unavailable.join(" and ")} is no longer available. Remove it from your cart to continue.`;
  }

  // A refusal of the order as a whole, such as too many different dishes.
  const orderWide = error.details.items?.[0];
  if (orderWide) return orderWide;

  // What is left are delivery detail problems, shown next to their fields.
  return null;
}

export function CheckoutView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const lines = useCart((cart) => cart.lines);
  const clearCart = useCart((cart) => cart.clear);
  const { data: user, isPending: loadingUser } = useCurrentUser();

  const order = useMutation({
    mutationFn: (customer: DeliveryDetails) =>
      placeOrder({
        // Ids and quantities only. The server looks up the prices itself.
        items: lines.map((line) => ({
          menuItemId: line.id,
          quantity: line.quantity,
        })),
        customer,
      }),
    onSuccess: (placed) => {
      // The tracking page can render immediately from what we already have.
      queryClient.setQueryData(orderKeys.detail(placed.id), placed);
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists });
      clearCart();
      router.push(`/orders/${placed.id}`);
    },
  });

  if (order.isSuccess) {
    return (
      <p role="status" className="text-lg text-muted">
        Order placed. Taking you to live tracking.
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <Notice
        title="Your cart is empty"
        action={
          <Link href="/" className={buttonStyles()}>
            Browse the menu
          </Link>
        }
      >
        Add something from the menu before checking out.
      </Notice>
    );
  }

  const totals = calculateTotals(
    lines.map((line) => ({ unitPrice: line.price, quantity: line.quantity })),
  );
  const failure = order.error ? describeFailure(order.error, lines) : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
      <section>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Checkout
        </h1>

        {loadingUser ? (
          <div className="mt-8 flex flex-col gap-5" aria-busy="true">
            <Skeleton className="h-11" />
            <Skeleton className="h-24" />
            <Skeleton className="h-11" />
          </div>
        ) : user ? (
          <div className="mt-8">
            <h2 className="mb-5 text-lg font-semibold">
              Where should we deliver?
            </h2>
            {failure && (
              <p
                role="alert"
                className="mb-5 rounded-xl bg-chili-50 px-4 py-3 text-chili-700"
              >
                {failure}
              </p>
            )}
            <CheckoutForm
              // A fresh form for each account, pre-filled with its name.
              key={user.id}
              defaultName={user.name}
              submitting={order.isPending}
              serverErrors={
                order.error instanceof ApiError
                  ? order.error.details
                  : undefined
              }
              onSubmit={(details) => order.mutate(details)}
            />
          </div>
        ) : (
          <div className="mt-8 max-w-md">
            <h2 className="text-lg font-semibold">
              Sign in to place your order
            </h2>
            <p className="mt-1 mb-5 text-muted">
              Your cart is saved. Signing in lets you track the order live.
            </p>
            <AuthForm mode="login" onSuccess={() => {}} showStaffDemo={false} />
            <p className="mt-5 text-muted">
              New here?{" "}
              <Link
                href="/register?next=/checkout"
                className="font-semibold text-leaf-900 underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          </div>
        )}
      </section>

      <aside>
        <div className="rounded-2xl border border-line bg-mist p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl leading-tight">Your order</h2>
          <div className="mt-4 flex flex-col gap-3">
            {lines.map((line) => (
              <p
                key={line.id}
                className="flex items-baseline justify-between gap-4"
              >
                <span>
                  <span className="text-muted tabular-nums">
                    {line.quantity} ×
                  </span>{" "}
                  {line.name}
                </span>
                <span className="tabular-nums">
                  {formatPrice(line.price * line.quantity)}
                </span>
              </p>
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <PriceBreakdown totals={totals} />
          </div>
        </div>
      </aside>
    </div>
  );
}
