import type { ReactNode } from "react";
import { cn } from "./ui/cn";

/** The centred column every page except the menu's hero sits in. */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-6xl px-5 py-10 sm:py-14", className)}>
      {children}
    </div>
  );
}
