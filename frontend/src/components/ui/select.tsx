import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] leading-5 font-medium tracking-tight text-zinc-900 shadow-xs transition outline-none focus:ring-2 focus:ring-zinc-300",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
