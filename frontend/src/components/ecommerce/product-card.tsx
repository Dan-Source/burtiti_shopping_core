"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/feedback/skeleton";
import { cn } from "@/lib/cn";
import type { Product } from "@/types/api";
import { Eye, Heart, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProductCardProps = {
  product: Product;
  viewMode: "grid" | "list";
  wishlisted: boolean;
  isAddingToCart: boolean;
  onToggleWishlist: (productId: number) => void;
  onAddToCart: (product: Product) => void;
};

function getDisplayPrice(product: Product) {
  const raw = product.price?.incl_tax;
  if (!raw) {
    return "Preco indisponivel";
  }

  const maybeNumber = Number(
    raw
      .replace(/[^0-9,.-]/g, "")
      .replace(".", "")
      .replace(",", "."),
  );
  if (Number.isNaN(maybeNumber)) {
    return raw;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: product.price?.currency || "BRL",
  }).format(maybeNumber);
}

function getOriginalPrice(product: Product) {
  if (!product.discountedPrice && product.discountPercentage && product.price?.incl_tax) {
    return product.price.incl_tax;
  }

  return product.discountedPrice;
}

function getRating(product: Product) {
  if (!product.rating) {
    return null;
  }
  return Math.max(1, Math.min(5, Math.round(product.rating)));
}

function getReviewsCount(product: Product) {
  return product.reviewsCount ?? null;
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, index) => (
    <Star
      key={`star-${index}`}
      className={cn("h-4 w-4", index < rating ? "fill-amber-400 text-amber-400" : "text-zinc-300")}
      aria-hidden
    />
  ));
}

function ProductImage({ product, title }: { product: Product; title: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group/image relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
      {!loaded ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image}
          alt={title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition duration-300 group-hover/image:scale-105",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Sem imagem
        </div>
      )}
    </div>
  );
}

export function ProductCard({
  product,
  viewMode,
  wishlisted,
  isAddingToCart,
  onToggleWishlist,
  onAddToCart,
}: ProductCardProps) {
  const displayTitle = product.title || product.name;
  const displayCategory = product.category?.name || "Categoria geral";
  const description = product.description || "Produto sem descricao.";
  const displayPrice = getDisplayPrice(product);
  const originalPrice = getOriginalPrice(product);
  const rating = getRating(product);
  const reviewsCount = getReviewsCount(product);
  const installment = useMemo(() => {
    const parsed = Number(
      displayPrice
        .replace(/[^0-9,.-]/g, "")
        .replace(".", "")
        .replace(",", "."),
    );
    if (Number.isNaN(parsed)) {
      return null;
    }

    const count = product.installments || 10;
    return {
      count,
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        parsed / count,
      ),
    };
  }, [displayPrice, product.installments]);

  const [openQuickView, setOpenQuickView] = useState(false);
  const [pulseWishlist, setPulseWishlist] = useState(false);

  const isOutOfStock = (product.stock ?? 1) <= 0;

  const badges = [
    product.isNew ? { label: "NOVO", className: "bg-emerald-500 text-white" } : null,
    product.discountPercentage
      ? { label: `-${product.discountPercentage}%`, className: "bg-red-500 text-white" }
      : null,
    isOutOfStock ? { label: "ESGOTADO", className: "bg-red-800 text-white" } : null,
  ].filter((badge): badge is { label: string; className: string } => Boolean(badge));

  function handleWishlistClick() {
    onToggleWishlist(product.id);
    setPulseWishlist(true);
    window.setTimeout(() => setPulseWishlist(false), 280);
  }

  if (viewMode === "list") {
    return (
      <Card className="group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row">
        <div className="relative sm:w-[160px] sm:shrink-0">
          <ProductImage product={product} title={displayTitle} />
          <button
            type="button"
            onClick={handleWishlistClick}
            className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm"
            title="Adicionar aos favoritos"
            aria-label="Adicionar aos favoritos"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                wishlisted ? "fill-red-500 text-red-500" : "",
                pulseWishlist ? "animate-ping" : "",
              )}
            />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            {displayCategory}
          </p>
          <h3 className="line-clamp-2 text-base font-semibold text-zinc-900">{displayTitle}</h3>
          {rating !== null ? (
            <div className="flex items-center gap-1">
              {renderStars(rating)}
              {reviewsCount !== null ? (
                <span className="ml-1 text-sm text-zinc-600">({reviewsCount} avaliacoes)</span>
              ) : null}
            </div>
          ) : null}
          <p className="line-clamp-1 text-sm text-zinc-600">{description}</p>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-zinc-900">{displayPrice}</p>
              {installment ? (
                <p className="text-xs text-zinc-500">
                  ou {installment.count}x {installment.value} sem juros
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onAddToCart(product)}
                disabled={isAddingToCart || isOutOfStock}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isAddingToCart ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button variant="secondary" onClick={() => setOpenQuickView(true)}>
                <Eye className="mr-2 h-4 w-4" /> Detalhes
              </Button>
            </div>
          </div>
        </div>

        <Modal
          open={openQuickView}
          onClose={() => setOpenQuickView(false)}
          title={displayTitle}
          description="Visualizacao rapida"
        >
          <p className="text-sm text-zinc-600">{description}</p>
          <div className="mt-4">
            <Link
              href={`/products/${product.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Ir para pagina do produto
            </Link>
          </div>
        </Modal>
      </Card>
    );
  }

  return (
    <Card className="group relative flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
        {badges.slice(0, 2).map((badge) => (
          <span
            key={badge.label}
            className={cn("rounded-full px-2 py-1 text-[10px] font-bold", badge.className)}
          >
            {badge.label}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleWishlistClick}
        className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm"
        title="Adicionar aos favoritos"
        aria-label="Adicionar aos favoritos"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition",
            wishlisted ? "fill-red-500 text-red-500" : "",
            pulseWishlist ? "[animation:popScale_300ms_ease-out]" : "",
          )}
        />
      </button>

      <div className="relative">
        <ProductImage product={product} title={displayTitle} />
        <button
          type="button"
          onClick={() => setOpenQuickView(true)}
          className="pointer-events-none absolute inset-x-4 bottom-3 inline-flex translate-y-1 items-center justify-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-medium text-zinc-800 opacity-0 shadow-sm transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Eye className="h-4 w-4" /> Visualizacao rapida
        </button>
      </div>

      <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
        {displayCategory}
      </p>
      <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900 transition group-hover:text-blue-700">
        {displayTitle}
      </h3>
      {rating !== null ? (
        <div className="flex items-center gap-1">
          {renderStars(rating)}
          {reviewsCount !== null ? (
            <span className="ml-1 text-xs text-zinc-600">({reviewsCount})</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto space-y-1">
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-zinc-900">{displayPrice}</p>
          {originalPrice && originalPrice !== displayPrice ? (
            <p className="text-sm text-zinc-500 line-through">{originalPrice}</p>
          ) : null}
        </div>
        {installment ? (
          <p className="text-xs text-zinc-500">
            ou {installment.count}x {installment.value} sem juros
          </p>
        ) : null}
      </div>

      <Button
        onClick={() => onAddToCart(product)}
        disabled={isAddingToCart || isOutOfStock}
        className="mt-2"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {isOutOfStock
          ? "Produto esgotado"
          : isAddingToCart
            ? "Adicionando..."
            : "Adicionar ao carrinho"}
      </Button>

      <Modal
        open={openQuickView}
        onClose={() => setOpenQuickView(false)}
        title={displayTitle}
        description="Visualizacao rapida"
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">{description}</p>
          <p className="text-base font-semibold text-zinc-900">{displayPrice}</p>
          <Link
            href={`/products/${product.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver detalhes completos
          </Link>
        </div>
      </Modal>
    </Card>
  );
}
