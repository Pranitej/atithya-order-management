import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <PageShell>
      {/* Reading ?next= from the URL has to wait for the request. */}
      <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-md" />}>
        <AuthPage mode="login" />
      </Suspense>
    </PageShell>
  );
}
