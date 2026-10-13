"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

/** Shown in place of a page that failed to render, with a way to retry. */
export default function PageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell className="max-w-3xl">
      <Notice
        tone="error"
        title="This page could not be loaded"
        action={<Button onClick={reset}>Try again</Button>}
      >
        Something went wrong on our side. Your cart is safe.
      </Notice>
    </PageShell>
  );
}
