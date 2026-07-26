"use client";

import { HomeCategoriesSection, HomeProductsSection, Section, toast } from "@/components";
import { useAddToCart, useCategories, useProducts } from "@/hooks";
import type { Product } from "@/types/api";
import { useState } from "react";

export default function Home() {
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  const addToCart = useAddToCart();
  const categories = useCategories();

  const offers = useProducts({
    pageSize: 8,
    onSale: true,
    ordering: "-created_at",
  });

  const bestSellers = useProducts({
    pageSize: 8,
    ordering: "-views",
  });

  async function handleAddToCart(product: Product) {
    if (!product.id) {
      return;
    }

    setAddingProductId(product.id);
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: 1 });
      toast.success("Produto adicionado ao carrinho!", "O item foi enviado para o seu carrinho.");
    } catch {
      toast.error("Erro ao adicionar ao carrinho", "Tente novamente em alguns instantes.");
    } finally {
      setAddingProductId(null);
    }
  }

  return (
    <Section className="space-y-8 py-6">
      <HomeProductsSection
        title="Ofertas"
        description="Ofertas da semana com economia real para finalizar hoje."
        products={offers.data?.results || []}
        viewMoreHref="/products?onSale=1&sort=newest"
        isLoading={offers.isLoading}
        isError={offers.isError}
        addingProductId={addingProductId}
        onRetry={() => offers.refetch()}
        onAddToCart={handleAddToCart}
        tone="offers"
      />

      <HomeCategoriesSection
        categories={categories.data || []}
        isLoading={categories.isLoading}
        isError={categories.isError}
        onRetry={() => categories.refetch()}
      />

      <HomeProductsSection
        title="Mais vendidos"
        description="Produtos com maior procura e excelente aceitacao dos clientes."
        products={bestSellers.data?.results || []}
        viewMoreHref="/products?sort=popular"
        isLoading={bestSellers.isLoading}
        isError={bestSellers.isError}
        addingProductId={addingProductId}
        onRetry={() => bestSellers.refetch()}
        onAddToCart={handleAddToCart}
        tone="best-sellers"
      />
    </Section>
  );
}
