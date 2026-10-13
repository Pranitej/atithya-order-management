import { cn } from "./cn";

/**
 * The vegetarian / non-vegetarian mark printed on food packaging in India:
 * a green dot or a red-brown triangle inside a square of the same colour.
 * The shape differs as well as the colour, so it never relies on colour alone.
 */
export function VegMark({
  isVeg,
  className,
}: {
  isVeg: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px]",
        isVeg ? "border-leaf-700" : "border-chili-600",
        className,
      )}
    >
      {isVeg ? (
        <span className="size-2 rounded-full bg-leaf-700" />
      ) : (
        <span className="size-0 border-x-[4.5px] border-b-[8px] border-x-transparent border-b-chili-600" />
      )}
    </span>
  );
}
