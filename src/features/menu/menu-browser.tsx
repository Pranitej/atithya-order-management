"use client";

import { useState } from "react";
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
    <div>
      <nav
        aria-label="Menu sections"
        className="sticky top-16 z-20 -mx-5 flex gap-1.5 overflow-x-auto border-b border-line bg-paper/95 px-5 py-3 backdrop-blur sm:mx-0 sm:px-0"
      >
        <FilterButton
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {sections.map((category) => (
          <FilterButton
            key={category}
            label={CATEGORY_LABELS[category]}
            active={filter === category}
            onClick={() => setFilter(category)}
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
