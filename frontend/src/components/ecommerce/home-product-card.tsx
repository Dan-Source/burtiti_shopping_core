"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Product } from "@/types/api";
import { BadgePercent, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type HomeProductCardProps = {
  product: Product;
  isAddingToCart: boolean;
  onAddToCart: (product: Product) => void;
  highlightOffer?: boolean;
};

function parsePrice(raw: string) {
  const sanitized = raw.replace(/[^0-9,.-]/g, "").trim();

  if (!sanitized) {
    return Number.NaN;
  }

  if (sanitized.includes(",")) {
    return Number(sanitized.replace(/\./g, "").replace(",", "."));
  }

  return Number(sanitized);
}

function formatPrice(raw: string, currency = "BRL") {
  const parsed = parsePrice(raw);
  if (Number.isNaN(parsed)) {
    return raw;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(parsed);
}

function toDisplayPrice(product: Product) {
  const raw = product.discountedPrice || product.price?.incl_tax;
  if (!raw) {
    return "Preco indisponivel";
  }

  return formatPrice(raw, product.price?.currency || "BRL");
}

function toOriginalPrice(product: Product) {
  const raw = product.price?.incl_tax;
  if (!raw || !product.discountedPrice) {
    return null;
  }

  return formatPrice(raw, product.price?.currency || "BRL");
}

export function HomeProductCard({
  product,
  isAddingToCart,
  onAddToCart,
  highlightOffer = false,
}: HomeProductCardProps) {
  const title = product.title || product.name;
  const displayPrice = useMemo(() => toDisplayPrice(product), [product]);
  const originalPrice = useMemo(() => toOriginalPrice(product), [product]);
  const stock = product.stock ?? 0;
  const stockLabel = stock > 0 ? `${stock} em estoque` : "Esgotado";
  const hasDiscount = Boolean(product.discountedPrice && product.discountPercentage);

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <Link href={`/products/${product.id}`} className="group block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Sem imagem
            </div>
          )}

          {highlightOffer && hasDiscount ? (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white">
              <BadgePercent className="h-3.5 w-3.5" />-{product.discountPercentage}%
            </div>
          ) : null}
        </div>
      </Link>

      <div className="space-y-1">
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
        >
          {title}
        </Link>
        <div className="flex items-end gap-2">
          <p className="text-lg font-bold text-zinc-900">{displayPrice}</p>
          {highlightOffer && hasDiscount && originalPrice ? (
            <p className="text-sm text-zinc-500 line-through">{originalPrice}</p>
          ) : null}
        </div>
        <p className="text-xs text-zinc-600">{stockLabel}</p>
      </div>

      <Button
        className="mt-auto"
        onClick={() => onAddToCart(product)}
        disabled={isAddingToCart || stock <= 0}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {stock <= 0
          ? "Produto esgotado"
          : isAddingToCart
            ? "Adicionando..."
            : "Adicionar ao carrinho"}
      </Button>
    </Card>
  );
}
