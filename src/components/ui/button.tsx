import { type VariantProps, cva } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Exported separately so that links which should look like buttons
 * (`<Link className={buttonStyles()}>`) share exactly the same styling.
 */
export const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-leaf-900 text-white hover:bg-leaf-800 active:bg-leaf-950",
        secondary:
          "border border-leaf-900/25 bg-paper text-leaf-900 hover:bg-leaf-50 active:bg-leaf-100",
        accent:
          "bg-turmeric-500 text-ink hover:bg-turmeric-300 active:bg-turmeric-600",
        ghost: "text-leaf-900 hover:bg-leaf-50 active:bg-leaf-100",
        danger:
          "border border-chili-600/30 bg-paper text-chili-700 hover:bg-chili-50",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-[0.95rem]",
        lg: "h-13 px-7 text-base",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    /** Shows a spinner and blocks further clicks while work is in progress. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
