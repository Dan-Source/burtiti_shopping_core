import type { Product } from "@/types/api";
import { ProductCard } from "@/components/ecommerce/product-card";
import { Skeleton } from "@/components/feedback/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/cn";

type ProductGridProps = {
  products: Product[];
  viewMode: "grid" | "list";
  wishlistedIds: number[];
  addingProductId: number | null;
  isLoading?: boolean;
  onToggleWishlist: (productId: number) => void;
  onAddToCart: (product: Product) => void;
};

export function ProductGrid({
  products,
  viewMode,
  wishlistedIds,
  addingProductId,
  isLoading = false,
  onToggleWishlist,
  onAddToCart,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid" ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1",
        )}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`product-skeleton-${index}`}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-5/6" />
            <Skeleton className="mt-4 h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        title="Nenhum produto encontrado"
        description="Tente ajustar seus filtros para encontrar itens disponiveis."
      />
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1",
      )}
      role="region"
      aria-label="Lista de produtos"
      aria-live="polite"
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          viewMode={viewMode}
          wishlisted={wishlistedIds.includes(product.id)}
          isAddingToCart={addingProductId === product.id}
          onToggleWishlist={onToggleWishlist}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
