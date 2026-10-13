"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/safe-next-path";
import { AuthForm } from "./auth-form";

const COPY = {
  login: {
    title: "Sign in",
    lead: "Sign in to place orders and follow them live.",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    switchHref: "/register",
  },
  register: {
    title: "Create your account",
    lead: "It takes a few seconds, and your cart is kept.",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
  },
} as const;

/** The sign-in and sign-up screens. Returns people to where they came from. */
export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const requested = useSearchParams().get("next");
  const next = safeNextPath(requested);
  const copy = COPY[mode];

  // Carry the destination across when switching between the two forms.
  const switchHref = requested
    ? `${copy.switchHref}?next=${encodeURIComponent(next)}`
    : copy.switchHref;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-3 mb-8 text-lg text-muted">{copy.lead}</p>

      <AuthForm mode={mode} onSuccess={() => router.replace(next)} />

      <p className="mt-6 text-muted">
        {copy.switchPrompt}{" "}
        <Link
          href={switchHref}
          className="font-semibold text-leaf-900 underline underline-offset-4"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
