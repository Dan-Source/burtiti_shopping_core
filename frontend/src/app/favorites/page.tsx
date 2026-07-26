"use client";

import { EmptyState, Section } from "@/components";

export default function FavoritesPage() {
  return (
    <Section className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Meus Favoritos</h1>
      <EmptyState
        title="Você ainda não tem favoritos"
        description="Adicione produtos à sua lista de favoritos para acessá-los facilmente."
      />
    </Section>
  );
}
