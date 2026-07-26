"use client";

import { EmptyState, FriendlyError, OrderHistory, Section, Spinner } from "@/components";
import { useOrders } from "@/hooks";
import { toApiError } from "@/lib/api/errors";

export default function OrdersPage() {
  const orders = useOrders();

  if (orders.isLoading) {
    return (
      <Section className="py-6">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner /> Carregando pedidos...
        </div>
      </Section>
    );
  }

  if (orders.isError) {
    const apiError = toApiError(orders.error);
    const authError = apiError.status === 401 || apiError.status === 403;

    return (
      <Section className="py-6">
        <FriendlyError
          title={authError ? "Sua sessao expirou" : "Nao foi possivel carregar pedidos"}
          description={
            authError
              ? "Faca login novamente para acessar seu historico de pedidos."
              : "Tente novamente em alguns instantes."
          }
          onRetry={() => {
            void orders.refetch();
          }}
          redirectHref={authError ? "/login?next=/orders" : undefined}
        />
      </Section>
    );
  }

  const result = orders.data || [];

  return (
    <Section className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Historico de pedidos</h1>
      {result.length ? (
        <OrderHistory orders={result} />
      ) : (
        <EmptyState
          title="Voce ainda nao tem pedidos"
          description="Quando finalizar compras, os pedidos aparecerao aqui."
        />
      )}
    </Section>
  );
}
