import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center",
        className,
      )}
      {...props}
    >
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
