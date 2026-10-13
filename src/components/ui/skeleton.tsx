import { cn } from "./cn";

/** A placeholder block shown while content loads, sized by the caller. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-leaf-100/70", className)}
    />
  );
}
