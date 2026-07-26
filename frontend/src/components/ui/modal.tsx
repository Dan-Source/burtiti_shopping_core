"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, description, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-semibold text-zinc-900">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100")}
            aria-label="Fechar modal"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
