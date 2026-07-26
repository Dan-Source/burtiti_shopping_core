import type { Cart } from "@/types/api";

type CartSummaryProps = {
  itemCount: number;
  cart: Cart;
};

function parsePrice(raw?: string | null) {
  if (!raw) {
    return Number.NaN;
  }

  const sanitized = raw.replace(/[^0-9,.-]/g, "").trim();
  if (!sanitized) {
    return Number.NaN;
  }

  if (sanitized.includes(",")) {
    return Number(sanitized.replace(/\./g, "").replace(",", "."));
  }

  return Number(sanitized);
}

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function resolveTotal(cart: Cart) {
  const totalRaw = cart.total_incl_tax || cart.total_excl_tax || null;
  const parsed = parsePrice(totalRaw);

  if (!Number.isNaN(parsed)) {
    return formatCurrency(parsed);
  }

  const fallback = cart.lines.reduce((sum, line) => {
    const unitRaw =
      line.price_incl_tax || line.product.discountedPrice || line.product.price?.incl_tax || null;
    const unitParsed = parsePrice(unitRaw);

    if (Number.isNaN(unitParsed)) {
      return sum;
    }

    return sum + unitParsed * line.quantity;
  }, 0);

  return fallback > 0 ? formatCurrency(fallback) : "Total indisponivel";
}

export function CartSummary({ itemCount, cart }: CartSummaryProps) {
  const grandTotal = resolveTotal(cart);

  return (
    <aside className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Resumo</h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-700">
        <div className="flex items-center justify-between">
          <span>Itens</span>
          <span className="font-medium text-zinc-900">{itemCount}</span>
        </div>
      </div>
      <div className="mt-4 border-t border-zinc-200 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">Total geral</span>
          <span className="text-lg font-bold text-zinc-900">{grandTotal}</span>
        </div>
      </div>
    </aside>
  );
}
