"use client";

import { FriendlyError } from "@/components/feedback/friendly-error";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/feedback/skeleton";
import { HomeProductCard } from "@/components/ecommerce/home-product-card";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/api";
import { Flame, Trophy } from "lucide-react";
import Link from "next/link";

type HomeProductsSectionProps = {
  title: string;
  description: string;
  products: Product[];
  viewMoreHref: string;
  isLoading: boolean;
  isError: boolean;
  addingProductId: number | null;
  onRetry: () => void;
  onAddToCart: (product: Product) => void;
  tone?: "offers" | "best-sellers";
};

export function HomeProductsSection({
  title,
  description,
  products,
  viewMoreHref,
  isLoading,
  isError,
  addingProductId,
  onRetry,
  onAddToCart,
  tone = "best-sellers",
}: HomeProductsSectionProps) {
  const isOffers = tone === "offers";

  return (
    <section className="space-y-4" aria-label={title}>
      <div
        className={[
          "flex items-center justify-between gap-3 rounded-2xl border p-4",
          isOffers
            ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white"
            : "border-sky-200 bg-gradient-to-r from-sky-50 to-white",
        ].join(" ")}
      >
        <div>
          <div className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tracking-wide text-zinc-700 uppercase">
            {isOffers ? (
              <Flame className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <Trophy className="h-3.5 w-3.5 text-sky-600" />
            )}
            {isOffers ? "Oferta ativa" : "Alta procura"}
          </div>
          <h2 className="text-2xl font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        </div>

        <Link href={viewMoreHref}>
          <Button variant="secondary">Ver mais</Button>
        </Link>
      </div>

      {isError ? (
        <FriendlyError
          title="Erro ao carregar produtos"
          description="Nao foi possivel carregar esta secao agora."
          onRetry={onRetry}
        />
      ) : null}

      {!isError && isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`${title}-skeleton-${index}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-5 w-24" />
              <Skeleton className="mt-1 h-3 w-20" />
              <Skeleton className="mt-4 h-10 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {!isError && !isLoading && products.length === 0 ? (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Esta secao nao possui produtos no momento."
        />
      ) : null}

      {!isError && !isLoading && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <HomeProductCard
              key={product.id}
              product={product}
              isAddingToCart={addingProductId === product.id}
              onAddToCart={onAddToCart}
              highlightOffer={isOffers}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
