"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { CartLine } from "@/types/api";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type CartItemProps = {
  line: CartLine;
  isUpdating?: boolean;
  isRemoving?: boolean;
  onUpdateQuantity: (lineId: number, quantity: number) => Promise<void> | void;
  onRemove?: (lineId: number) => Promise<void> | void;
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

function resolveUnitPrice(line: CartLine) {
  const raw = line.product.discountedPrice || line.product.price?.incl_tax;
  const parsed = parsePrice(raw);

  if (Number.isNaN(parsed)) {
    return raw || null;
  }

  return formatCurrency(parsed, line.product.price?.currency || "BRL");
}

export function CartItem({
  line,
  isUpdating = false,
  isRemoving = false,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const [quantityDraft, setQuantityDraft] = useState<string | null>(null);

  const productTitle = line.product.title || line.product.name;
  const productHref = line.product.slug
    ? `/products/${line.product.slug}`
    : `/products/${line.product.id}`;
  const unitPrice = useMemo(() => resolveUnitPrice(line), [line]);
  const quantityInput = quantityDraft ?? String(line.quantity);

  async function commitQuantity(nextQuantity: number) {
    const safeQuantity = Math.max(1, Math.floor(nextQuantity));
    setQuantityDraft(String(safeQuantity));

    if (safeQuantity === line.quantity) {
      setQuantityDraft(null);
      return;
    }

    try {
      await onUpdateQuantity(line.id, safeQuantity);
    } finally {
      setQuantityDraft(null);
    }
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {line.product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={line.product.image}
              alt={productTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">
              Sem imagem
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="space-y-1">
            <Link
              href={productHref}
              className="line-clamp-2 font-medium text-zinc-900 transition hover:text-zinc-700"
            >
              {productTitle}
            </Link>
            <p className="text-sm text-zinc-600">
              Valor unitario:{" "}
              <span className="font-medium text-zinc-900">{unitPrice || "Preco indisponivel"}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white p-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void commitQuantity(line.quantity - 1)}
                  disabled={isUpdating || line.quantity <= 1}
                  aria-label={`Diminuir quantidade de ${productTitle}`}
                  className="h-8 w-8 rounded-full p-0"
                >
                  <Minus className="h-20 w-20" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={quantityInput}
                  onChange={(event) => setQuantityDraft(event.target.value)}
                  onBlur={() => {
                    const parsed = Number(quantityInput);
                    void commitQuantity(Number.isFinite(parsed) ? parsed : line.quantity);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const parsed = Number(quantityInput);
                      void commitQuantity(Number.isFinite(parsed) ? parsed : line.quantity);
                    }
                  }}
                  aria-label={`Quantidade de ${productTitle}`}
                  className={cn(
                    "h-8 w-14 border-0 bg-transparent px-1 text-center text-sm font-semibold text-zinc-900 shadow-none focus-visible:ring-0",
                    isUpdating && "text-zinc-500",
                  )}
                  disabled={isUpdating}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void commitQuantity(line.quantity + 1)}
                  disabled={isUpdating || isRemoving}
                  aria-label={`Aumentar quantidade de ${productTitle}`}
                  className="h-8 w-8 rounded-full p-0"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {onRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void onRemove(line.id)}
                  disabled={isUpdating || isRemoving}
                  className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {isRemoving ? "Removendo..." : "Remover"}
                </Button>
              ) : null}
            </div>

            <div className="space-y-1 text-left sm:text-right">
              <p className="text-sm text-zinc-600">
                {line.quantity} × {unitPrice}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
