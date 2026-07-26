"use client";

import type { ReactNode } from "react";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function CartDrawer({ open, onClose, children }: CartDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/55">
      <div className="ml-auto flex h-full w-full max-w-md flex-col bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Carrinho</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Fechar
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
