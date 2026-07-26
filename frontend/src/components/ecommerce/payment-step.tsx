import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PaymentMethod } from "@/types/api";

type PaymentStepProps = {
  methods: PaymentMethod[];
  selectedCode: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  onChange: (code: string) => void;
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
};

export function PaymentStep({
  methods,
  selectedCode,
  isLoading,
  isSubmitting,
  onChange,
  onBack,
  onContinue,
  continueLabel,
}: PaymentStepProps) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Metodo de pagamento</h2>

      {isLoading ? <p className="text-sm text-zinc-600">Carregando metodos...</p> : null}

      <div className="space-y-3">
        {methods.map((method) => {
          const label = method.name || method.label || method.code;

          return (
            <label
              key={method.code}
              className="flex cursor-pointer items-start justify-between rounded-lg border border-zinc-200 p-3"
            >
              <span className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="payment_method_code"
                  checked={selectedCode === method.code}
                  onChange={() => onChange(method.code)}
                />
                {label}
              </span>
              {method.description ? (
                <span className="ml-4 max-w-xs text-right text-xs text-zinc-500">
                  {method.description}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={isSubmitting}>
          {isSubmitting ? "Processando..." : continueLabel || "Revisar pedido"}
        </Button>
      </div>
    </Card>
  );
}
