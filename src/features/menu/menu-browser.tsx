"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/notice";
import {
  CATEGORY_LABELS,
  MENU_CATEGORIES,
  type MenuCategory,
  type MenuItemDTO,
} from "@/shared/types";
import { MenuItemCard } from "./menu-item-card";

type Filter = MenuCategory | "all";

export function MenuBrowser({ items }: { items: MenuItemDTO[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const top = useRef<HTMLDivElement>(null);

  // The menu is long. Someone who picks a section while far down the page
  // would otherwise be left looking at whatever is now at that height, often
  // the footer, so the start of the menu is brought back into view.
  const choose = (next: Filter) => {
    setFilter(next);
    top.current?.scrollIntoView({ block: "start" });
  };

  if (items.length === 0) {
    return (
      <Notice title="The kitchen is closed right now">
        There is nothing on the menu at the moment. Please check back a little
        later.
      </Notice>
    );
  }

  // Only sections that actually have dishes, in menu order.
  const sections = MENU_CATEGORIES.filter((category) =>
    items.some((item) => item.category === category),
  );
  const visibleSections =
    filter === "all" ? sections : sections.filter((s) => s === filter);

  return (
    // scroll-mt-16 stops the sticky site header covering the top when
    // `choose` scrolls here.
    <div ref={top} className="scroll-mt-16">
      {/* Phones scroll the filters sideways; wider screens wrap them onto a
          second row, so every section is always visible and clickable. */}
      <nav
        aria-label="Menu sections"
        className="no-scrollbar sticky top-16 z-20 -mx-5 flex gap-1.5 overflow-x-auto border-b border-line bg-paper px-5 py-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <FilterButton
          label="All"
          active={filter === "all"}
          onClick={() => choose("all")}
        />
        {sections.map((category) => (
          <FilterButton
            key={category}
            label={CATEGORY_LABELS[category]}
            active={filter === category}
            onClick={() => choose(category)}
          />
        ))}
      </nav>

      {visibleSections.map((category) => (
        <section
          key={category}
          aria-labelledby={`menu-section-${category}`}
          className="pt-10"
        >
          <h2
            id={`menu-section-${category}`}
            className="font-display text-3xl leading-tight"
          >
            {CATEGORY_LABELS[category]}
          </h2>
          <div className="mt-2 grid gap-x-14 md:grid-cols-2">
            {items
              .filter((item) => item.category === category)
              .map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full px-4 font-semibold transition-colors",
        active
          ? "bg-leaf-900 text-white"
          : "text-muted hover:bg-leaf-50 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
