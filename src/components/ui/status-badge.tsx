import { type OrderStatus, STATUS_LABELS } from "@/shared/order-status";
import { cn } from "./cn";

const styles: Record<OrderStatus, string> = {
  received: "bg-gold-100 text-ink",
  preparing: "bg-gold-100 text-ink",
  out_for_delivery: "bg-leaf-100 text-leaf-900",
  delivered: "bg-leaf-900 text-white",
  cancelled: "bg-chili-50 text-chili-700",
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        styles[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
