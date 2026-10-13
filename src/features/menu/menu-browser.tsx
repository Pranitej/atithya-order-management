"use client";

import { useRef, useState } from "react";
import { Notice } from "@/components/ui/notice";
import {
  CATEGORY_LABELS,
  MENU_CATEGORIES,
  type MenuItemDTO,
} from "@/shared/types";
import { MenuItemCard } from "./menu-item-card";
import { type SectionFilter, SectionStrip } from "./section-strip";

export function MenuBrowser({ items }: { items: MenuItemDTO[] }) {
  const [filter, setFilter] = useState<SectionFilter>("all");
  const top = useRef<HTMLDivElement>(null);

  // The menu is long. Someone who picks a section while far down the page
  // would otherwise be left looking at whatever is now at that height, often
  // the footer, so the start of the menu is brought back into view.
  const choose = (next: SectionFilter) => {
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
      <SectionStrip
        selected={filter}
        onSelect={choose}
        options={[
          { value: "all", label: "All" },
          ...sections.map((category) => ({
            value: category,
            label: CATEGORY_LABELS[category],
          })),
        ]}
      />

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
