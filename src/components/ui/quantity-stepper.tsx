import { Minus, Plus } from "lucide-react";
import { cn } from "./cn";

type QuantityStepperProps = {
  /** Used in the button labels, e.g. "Add one more Masala Fries". */
  itemName: string;
  quantity: number;
  max: number;
  onIncrease: () => void;
  onDecrease: () => void;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityStepper({
  itemName,
  quantity,
  max,
  onIncrease,
  onDecrease,
  size = "md",
  className,
}: QuantityStepperProps) {
  const button = cn(
    "grid place-items-center text-white transition-colors hover:bg-leaf-800 disabled:cursor-not-allowed disabled:opacity-45",
    size === "sm" ? "size-8" : "size-10",
  );

  return (
    <div
      role="group"
      aria-label={`Quantity of ${itemName}`}
      className={cn(
        "inline-flex items-center overflow-hidden rounded-xl bg-leaf-900 font-semibold text-white",
        className,
      )}
    >
      <button
        type="button"
        className={button}
        onClick={onDecrease}
        aria-label={
          quantity === 1 ? `Remove ${itemName}` : `Remove one ${itemName}`
        }
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span
        className={cn(
          "text-center tabular-nums",
          size === "sm" ? "min-w-6 text-sm" : "min-w-7",
        )}
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        className={button}
        onClick={onIncrease}
        disabled={quantity >= max}
        aria-label={`Add one more ${itemName}`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
