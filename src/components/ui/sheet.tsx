"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * A panel that slides in from the right. Built on Radix Dialog, which
 * handles the parts that are easy to get wrong: focus is trapped inside,
 * Escape closes it, and focus returns to the button that opened it.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-leaf-950/45" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md animate-sheet-in flex-col bg-paper shadow-[-24px_0_60px_-30px_rgb(10_42_32/0.45)]">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-2xl leading-tight">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="-mr-1.5 grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-leaf-50 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
