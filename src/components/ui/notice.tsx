import type { ReactNode } from "react";
import { cn } from "./cn";

type NoticeProps = {
  title: string;
  children?: ReactNode;
  /** Buttons or links that tell the person what to do next. */
  action?: ReactNode;
  tone?: "neutral" | "error";
  className?: string;
};

/**
 * Used for empty screens and failures. It always says what happened and
 * offers the next step, rather than leaving a blank area.
 */
export function Notice({
  title,
  children,
  action,
  tone = "neutral",
  className,
}: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border px-6 py-7",
        tone === "error"
          ? "border-chili-600/25 bg-chili-50"
          : "border-line bg-mist",
        className,
      )}
    >
      <h2 className="font-display text-2xl leading-tight">{title}</h2>
      {children && <div className="max-w-prose text-muted">{children}</div>}
      {action && <div className="mt-1 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}
