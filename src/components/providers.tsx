"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { CartHydration } from "@/features/cart/cart-hydration";
import { ApiError } from "@/lib/api-client";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 4xx answer will not change by asking again; only retry failures
        // that might be temporary (network trouble, a 5xx).
        retry: (failureCount, error) => {
          const status = error instanceof ApiError ? error.status : 0;
          if (status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser tab, created once and kept across re-renders.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <CartHydration />
      {children}
    </QueryClientProvider>
  );
}
