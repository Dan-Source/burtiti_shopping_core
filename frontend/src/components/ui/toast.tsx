"use client";

import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type ToastVariant = "success" | "error";

type ToastState = {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastInput = Omit<ToastState, "id">;

const listeners = new Set<(value: ToastState[]) => void>();
let toastQueue: ToastState[] = [];

function emitToasts() {
  listeners.forEach((listener) => listener(toastQueue));
}

function enqueueToast(input: ToastInput) {
  const toast: ToastState = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    ...input,
  };

  toastQueue = [...toastQueue, toast];
  emitToasts();

  window.setTimeout(() => {
    toastQueue = toastQueue.filter((item) => item.id !== toast.id);
    emitToasts();
  }, 3500);
}

export const toast = {
  success(title: string, message?: string) {
    enqueueToast({ title, message, variant: "success" });
  },
  error(title: string, message?: string) {
    enqueueToast({ title, message, variant: "error" });
  },
};

export function ToastViewport() {
  const [items, setItems] = useState<ToastState[]>(toastQueue);

  useEffect(() => {
    listeners.add(setItems);

    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto rounded-xl border bg-white p-4 shadow-lg",
            item.variant === "success" ? "border-emerald-300" : "border-red-300",
          )}
        >
          <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
          {item.message ? <p className="mt-1 text-sm text-zinc-600">{item.message}</p> : null}
        </div>
      ))}
    </div>
  );
}
