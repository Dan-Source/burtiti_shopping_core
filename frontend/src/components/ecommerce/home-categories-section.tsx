import { FriendlyError } from "@/components/feedback/friendly-error";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/feedback/skeleton";
import { Card } from "@/components/ui/card";
import type { CategoryTree } from "@/types/api";
import {
  Grid3X3,
  House,
  Monitor,
  Smartphone,
  Sparkles,
  Shirt,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";

function renderCategoryIcon(slug: string) {
  if (slug === "eletronicos") {
    return <Monitor className="h-8 w-8 text-zinc-600" aria-hidden />;
  }

  if (slug === "smartphones") {
    return <Smartphone className="h-8 w-8 text-zinc-600" aria-hidden />;
  }

  if (slug === "moda") {
    return <Shirt className="h-8 w-8 text-zinc-600" aria-hidden />;
  }

  if (slug === "casa-decor") {
    return <House className="h-8 w-8 text-zinc-600" aria-hidden />;
  }

  if (slug === "cozinha") {
    return <UtensilsCrossed className="h-8 w-8 text-zinc-600" aria-hidden />;
  }

  return <Sparkles className="h-8 w-8 text-zinc-600" aria-hidden />;
}

type HomeCategoriesSectionProps = {
  categories: CategoryTree[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

function CategoryCard({ category }: { category: CategoryTree }) {
  return (
    <Link href={`/products?categories=${encodeURIComponent(category.slug)}`}>
      <Card className="group h-full p-0 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative overflow-hidden rounded-2xl">
          {category.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.image}
              alt={category.name}
              loading="lazy"
              className="h-28 w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              {renderCategoryIcon(category.slug)}
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" aria-hidden />
        </div>

        <div className="p-4">
          <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{category.name}</p>
          <p className="mt-1 text-xs text-zinc-600">{category.count} produtos</p>
        </div>
      </Card>
    </Link>
  );
}

export function HomeCategoriesSection({
  categories,
  isLoading,
  isError,
  onRetry,
}: HomeCategoriesSectionProps) {
  const mainCategories = categories.slice(0, 8);

  return (
    <section className="space-y-4" aria-label="Categorias principais">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Categorias</h2>
          <p className="mt-1 text-sm text-zinc-600">Explore as principais categorias do sistema.</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          <Grid3X3 className="h-4 w-4" /> Ver todas
        </Link>
      </div>

      {isError ? (
        <FriendlyError
          title="Erro ao carregar categorias"
          description="Nao foi possivel carregar as categorias agora."
          onRetry={onRetry}
        />
      ) : null}

      {!isError && isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`category-skeleton-${index}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {!isError && !isLoading && mainCategories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria encontrada"
          description="As categorias ficarao disponiveis assim que houver itens cadastrados."
        />
      ) : null}

      {!isError && !isLoading && mainCategories.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {mainCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
