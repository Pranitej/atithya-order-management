"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import type { MenuCategory } from "@/shared/types";

export type SectionFilter = MenuCategory | "all";

type SectionStripProps = {
  options: { value: SectionFilter; label: string }[];
  selected: SectionFilter;
  onSelect: (value: SectionFilter) => void;
};

/** Smooth scrolling, unless the person has asked their device for less motion. */
function scrollBehavior(): ScrollBehavior {
  const prefersLessMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return prefersLessMotion ? "auto" : "smooth";
}

/**
 * The menu's section filters on a single row that scrolls sideways.
 *
 * Touch screens and trackpads scroll it directly. A mouse cannot, so an arrow
 * appears at an edge whenever there are sections hidden beyond it. The arrows
 * are a convenience for the pointer only: every section button is in the page
 * and reachable by keyboard, and focusing one scrolls it into view, so the
 * arrows are kept out of the tab order and away from screen readers.
 */
export function SectionStrip({
  options,
  selected,
  onSelect,
}: SectionStripProps) {
  const strip = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState({ before: false, after: false });

  useEffect(() => {
    const element = strip.current;
    if (!element) return;

    const measure = () => {
      const before = element.scrollLeft > 1;
      const after =
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      setHidden((current) =>
        current.before === before && current.after === after
          ? current
          : { before, after },
      );
    };

    element.addEventListener("scroll", measure, { passive: true });
    // Reports once as soon as it starts, then again whenever the strip is
    // resized (a rotated phone, a narrower window).
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
    // Re-measured when the number of sections changes, since that changes
    // how wide the row is.
  }, [options.length]);

  const page = (direction: 1 | -1) => {
    const element = strip.current;
    element?.scrollBy({
      left: direction * element.clientWidth * 0.75,
      behavior: scrollBehavior(),
    });
  };

  const select = (value: SectionFilter, button: HTMLButtonElement) => {
    onSelect(value);

    // Centre the chosen button in the strip. This moves only the strip, so
    // it never fights with the page's own scroll position.
    const element = strip.current;
    element?.scrollTo({
      left: button.offsetLeft - (element.clientWidth - button.offsetWidth) / 2,
      behavior: scrollBehavior(),
    });
  };

  return (
    <div className="sticky top-16 z-20 -mx-5 border-b border-line bg-paper sm:mx-0">
      <div className="relative">
        {hidden.before && <Arrow direction="back" onClick={() => page(-1)} />}

        <nav
          ref={strip}
          aria-label="Menu sections"
          className="no-scrollbar relative flex gap-1.5 overflow-x-auto px-5 py-3 sm:px-0"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected === option.value}
              onClick={(event) => select(option.value, event.currentTarget)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 font-semibold whitespace-nowrap transition-colors",
                selected === option.value
                  ? "bg-leaf-900 text-white"
                  : "text-muted hover:bg-leaf-50 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </nav>

        {hidden.after && <Arrow direction="forward" onClick={() => page(1)} />}
      </div>
    </div>
  );
}

function Arrow({
  direction,
  onClick,
}: {
  direction: "back" | "forward";
  onClick: () => void;
}) {
  const Icon = direction === "back" ? ChevronLeft : ChevronRight;

  return (
    // The fade behind the button hints that the row continues underneath it.
    // Phones swipe the row instead, so the arrows are for wider screens.
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 hidden items-center from-paper from-60% to-transparent sm:flex",
        direction === "back"
          ? "left-0 bg-linear-to-r pr-10"
          : "right-0 bg-linear-to-l pl-10",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        title={
          direction === "back" ? "Show earlier sections" : "Show more sections"
        }
        onClick={onClick}
        className="pointer-events-auto grid size-9 place-items-center rounded-full border border-line bg-paper text-leaf-900 shadow-[0_2px_8px_-2px_rgb(4_48_34/0.25)] transition-colors hover:bg-leaf-50"
      >
        <Icon className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
