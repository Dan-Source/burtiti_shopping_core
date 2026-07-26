"use client";

import { Button, Card, FriendlyError, Section, Spinner, toast } from "@/components";
import { cn } from "@/lib/cn";
import { useAddToCart, useProductById } from "@/hooks";
import { Star, ShoppingCart } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

function formatPrice(product: { price?: { currency: string; incl_tax: string } }) {
  const raw = product.price?.incl_tax;
  if (!raw) {
    return null;
  }
  const cleaned = raw
    .replace(/[^0-9,.-]/g, "")
    .replace(".", "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const currency = product.price?.currency || "BRL";
  return {
    formatted: new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(parsed),
    raw: parsed,
  };
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

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const product = useProductById(id);
  const addToCart = useAddToCart();
  const [selectedImage, setSelectedImage] = useState(0);

  async function onAddToCart() {
    if (!product.data?.id) {
      return;
    }
    try {
      await addToCart.mutateAsync({ productId: product.data.id, quantity: 1 });
      toast.success("Produto adicionado", "O item foi enviado para o carrinho.");
    } catch {
      toast.error("Falha ao adicionar", "Tente novamente em alguns instantes.");
    }
  }

  if (product.isLoading) {
    return (
      <Section className="py-6">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner /> Carregando produto...
        </div>
      </Section>
    );
  }

  if (product.isError || !product.data) {
    return (
      <Section className="py-6">
        <FriendlyError
          title="Produto indisponivel"
          description="Nao foi possivel carregar os detalhes desse item."
          onRetry={() => product.refetch()}
        />
      </Section>
    );
  }

  const p = product.data;
  const displayTitle = p.title || p.name;
  const price = formatPrice(p);
  const isOutOfStock = (p.stock ?? 1) <= 0;
  const images = p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : [];
  const activeImage = images[selectedImage] || images[0];

  return (
    <Section className="py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100">
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeImage} alt={displayTitle} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Sem imagem
              </div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2",
                    index === selectedImage ? "border-zinc-900" : "border-zinc-200",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Card className="space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900">{displayTitle}</h1>
          {p.category?.name ? (
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {p.category.name}
            </p>
          ) : null}
          <p className="text-sm text-zinc-700">
            {p.description || "Sem descricao para este produto."}
          </p>

          {p.rating ? (
            <div className="flex items-center gap-1">
              {renderStars(Math.round(p.rating))}
              {p.reviewsCount ? (
                <span className="ml-1 text-sm text-zinc-600">({p.reviewsCount} avaliacoes)</span>
              ) : null}
            </div>
          ) : null}

          {price ? (
            <div>
              <p className="text-2xl font-bold text-zinc-900">{price.formatted}</p>
              {p.discountPercentage ? (
                <p className="text-sm text-green-600">{p.discountPercentage}% de desconto</p>
              ) : null}
            </div>
          ) : (
            <p className="text-xl text-zinc-500">Preco indisponivel</p>
          )}

          <div className="text-sm text-zinc-600">
            {isOutOfStock ? (
              <span className="font-semibold text-red-600">Produto esgotado</span>
            ) : (
              <span className="font-semibold text-green-600">
                Em estoque{p.stock ? ` (${p.stock} unidades)` : ""}
              </span>
            )}
          </div>

          <Button
            onClick={onAddToCart}
            disabled={addToCart.isPending || isOutOfStock}
            className="w-full sm:w-auto"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isOutOfStock
              ? "Produto esgotado"
              : addToCart.isPending
                ? "Adicionando..."
                : "Adicionar ao carrinho"}
          </Button>
        </Card>
      </div>
    </Section>
  );
}
