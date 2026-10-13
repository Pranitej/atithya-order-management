"use client";

import { ChefHat, LogOut, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser, useSignOut } from "@/features/auth/use-auth";
import { CartButton, CartSheet } from "@/features/cart/cart-sheet";

const navLink =
  "inline-flex h-11 items-center gap-2 rounded-xl px-3 font-semibold text-leaf-900 transition-colors hover:bg-leaf-50";

export function SiteHeader() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-5">
        <Link
          href="/"
          className="font-display text-[1.7rem] leading-none text-leaf-900"
          aria-label="Atithya, back to the menu"
        >
          Atithya
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {user?.role === "admin" && (
            <Link href="/admin/orders" className={navLink}>
              <ChefHat className="size-[1.15rem]" aria-hidden="true" />
              <span className="hidden sm:inline">Kitchen</span>
              <span className="sr-only sm:hidden">Kitchen</span>
            </Link>
          )}

          {user && (
            <Link href="/orders" className={navLink}>
              <ReceiptText className="size-[1.15rem]" aria-hidden="true" />
              <span className="hidden sm:inline">Orders</span>
              <span className="sr-only sm:hidden">Orders</span>
            </Link>
          )}

          {user ? (
            <button
              type="button"
              className={navLink}
              onClick={() =>
                signOut.mutate(undefined, { onSuccess: () => router.push("/") })
              }
            >
              <LogOut className="size-[1.15rem]" aria-hidden="true" />
              <span className="hidden md:inline">Sign out</span>
              <span className="sr-only md:hidden">Sign out</span>
            </button>
          ) : (
            <Link href="/login" className={navLink}>
              <UserRound className="size-[1.15rem]" aria-hidden="true" />
              Sign in
            </Link>
          )}

          <CartButton />
        </nav>
      </div>

      <CartSheet />
    </header>
  );
}
