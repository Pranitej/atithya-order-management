import { Check, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { formatTime } from "@/lib/format";
import {
  type OrderStatus,
  STATUS_FLOW,
  STATUS_LABELS,
} from "@/shared/order-status";
import type { StatusChangeDTO } from "@/shared/types";

type StepState = "done" | "current" | "upcoming" | "cancelled";

type Step = {
  key: OrderStatus;
  label: string;
  state: StepState;
  at: string | null;
};

const STATE_IN_WORDS: Record<Exclude<StepState, "cancelled">, string> = {
  done: "Completed",
  current: "In progress",
  upcoming: "Not started",
};

/** Turns an order's status and history into the rows of the timeline. */
function buildSteps(status: OrderStatus, history: StatusChangeDTO[]): Step[] {
  const reachedAt = (step: OrderStatus) =>
    history.find((change) => change.status === step)?.at ?? null;

  if (status === "cancelled") {
    // Show how far the order got, then where it stopped.
    const reached = STATUS_FLOW.filter((step) => reachedAt(step) !== null);
    return [
      ...reached.map((step) => ({
        key: step,
        label: STATUS_LABELS[step],
        state: "done" as const,
        at: reachedAt(step),
      })),
      {
        key: "cancelled",
        label: STATUS_LABELS.cancelled,
        state: "cancelled",
        at: reachedAt("cancelled"),
      },
    ];
  }

  const currentIndex = STATUS_FLOW.indexOf(
    status as (typeof STATUS_FLOW)[number],
  );

  return STATUS_FLOW.map((step, index) => {
    let state: StepState = "upcoming";
    if (status === "delivered" || index < currentIndex) state = "done";
    else if (index === currentIndex) state = "current";

    return {
      key: step,
      label: STATUS_LABELS[step],
      state,
      at: reachedAt(step),
    };
  });
}

type OrderStatusTrackerProps = {
  status: OrderStatus;
  history: StatusChangeDTO[];
};

/** The order's journey as a vertical timeline, one row per stage. */
export function OrderStatusTracker({
  status,
  history,
}: OrderStatusTrackerProps) {
  const steps = buildSteps(status, history);

  return (
    <ol aria-label="Order progress" className="flex flex-col">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <Marker state={step.state} />
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "my-1 w-0.5 flex-1 rounded-full",
                    step.state === "done" ? "bg-leaf-900" : "bg-line",
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                "flex flex-1 items-baseline justify-between gap-4",
                isLast ? "pb-0" : "pb-7",
              )}
            >
              <div>
                <p
                  data-testid="step-label"
                  className={cn(
                    "leading-7",
                    step.state === "current" && "text-xl font-semibold",
                    step.state === "done" && "font-semibold",
                    step.state === "upcoming" && "text-muted",
                    step.state === "cancelled" &&
                      "text-xl font-semibold text-chili-700",
                  )}
                >
                  {step.label}
                </p>
                {step.state !== "cancelled" && (
                  <p className="sr-only">{STATE_IN_WORDS[step.state]}</p>
                )}
              </div>
              {step.at && (
                <time
                  dateTime={step.at}
                  className="shrink-0 text-sm text-muted tabular-nums"
                >
                  {formatTime(step.at)}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Marker({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="grid size-7 place-items-center rounded-full bg-leaf-900 text-white">
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }

  if (state === "cancelled") {
    return (
      <span className="grid size-7 place-items-center rounded-full bg-chili-600 text-white">
        <X className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }

  if (state === "current") {
    // The one moving element on the page: it shows the order is live.
    return (
      <span className="relative grid size-7 place-items-center">
        <span
          aria-hidden="true"
          className="absolute size-3.5 animate-pulse-ring rounded-full bg-turmeric-500"
        />
        <span className="relative size-3.5 rounded-full bg-turmeric-500 ring-4 ring-turmeric-100" />
      </span>
    );
  }

  return (
    <span className="grid size-7 place-items-center">
      <span className="size-3 rounded-full border-2 border-line bg-paper" />
    </span>
  );
}
