"use client";

type PaymentMethodsProps = {
  value?: string;
  onChange: (value: string) => void;
};

const methods = [
  { code: "credit-card", label: "Cartao de credito" },
  { code: "pix", label: "Pix" },
  { code: "boleto", label: "Boleto" },
];

export function PaymentMethods({ value, onChange }: PaymentMethodsProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Pagamento</h2>
      <div className="mt-3 space-y-2">
        {methods.map((method) => (
          <label key={method.code} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              checked={value === method.code}
              onChange={() => onChange(method.code)}
              className="h-4 w-4"
            />
            {method.label}
          </label>
        ))}
      </div>
    </div>
  );
}
