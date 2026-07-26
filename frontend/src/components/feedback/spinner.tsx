import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type SpinnerProps = HTMLAttributes<HTMLDivElement>;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800",
        className,
      )}
      aria-label="Carregando"
      {...props}
    />
  );
}
