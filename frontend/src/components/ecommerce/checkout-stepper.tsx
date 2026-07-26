import { cn } from "@/lib/cn";
import type { CheckoutStep } from "@/types/api";

type CheckoutStepperProps = {
  current: CheckoutStep;
};

const steps: Array<{ key: CheckoutStep; label: string }> = [
  { key: "shipping-address", label: "Endereco" },
  { key: "payment-method", label: "Pagamento" },
  { key: "review", label: "Revisao" },
  { key: "pix", label: "PIX" },
];

export function CheckoutStepper({ current }: CheckoutStepperProps) {
  const currentIndex = steps.findIndex((item) => item.key === current);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <ol className="grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = current === step.key;
          const isDone = index < currentIndex;

          return (
            <li key={step.key} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  isActive && "border-zinc-900 bg-zinc-900 text-white",
                  isDone && "border-emerald-500 bg-emerald-500 text-white",
                  !isActive && !isDone && "border-zinc-300 bg-white text-zinc-500",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isActive ? "font-semibold text-zinc-900" : "text-zinc-600",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
