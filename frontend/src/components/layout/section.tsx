import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type SectionProps = HTMLAttributes<HTMLElement>;

export function Section({ className, ...props }: SectionProps) {
  return <section className={cn("py-10 sm:py-12", className)} {...props} />;
}
