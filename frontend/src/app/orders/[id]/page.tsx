"use client";

import { Card, OrderTracking, PixPostCheckoutStep, Section, Spinner, toast } from "@/components";
import { useOrderById } from "@/hooks";
import { normalizePixStatus, getQrCodeImageSource } from "@/lib/pix";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const order = useOrderById(id, {
    enablePolling: true,
    pollIntervalMs: 5000,
  });
  const lastPaymentStatus = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!order.data) {
      return;
    }

    const status = normalizePixStatus(order.data);
    if (status === "paid" && lastPaymentStatus.current === "pending") {
      toast.success("Pagamento confirmado", "O pagamento PIX foi aprovado.");
    }

    lastPaymentStatus.current = status;
  }, [order.data]);

  if (order.isLoading) {
    return (
      <Section className="py-6">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner /> Carregando pedido...
        </div>
      </Section>
    );
  }

  if (order.isError || !order.data) {
    return (
      <Section className="py-6">
        <Card>
          <h1 className="text-lg font-semibold text-zinc-900">Pedido nao encontrado</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Nao foi possivel encontrar o pedido informado.
          </p>
        </Card>
      </Section>
    );
  }

  const pixQrCode =
    getQrCodeImageSource(order.data.pix_qr_code_image) ||
    getQrCodeImageSource(order.data.pix_qr_code);

  const hasPixData = Boolean(pixQrCode || order.data.pix_copy_paste);

  if (hasPixData) {
    const pixStatus = normalizePixStatus(order.data);
    const statusLabel =
      pixStatus === "paid" ? "Pago" : pixStatus === "expired" ? "Expirado" : "Aguardando";

    return (
      <Section className="space-y-4 py-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Pedido #{order.data.number}</h1>
        <PixPostCheckoutStep
          orderNumber={order.data.number || order.data.id}
          status={statusLabel}
          qrCode={pixQrCode}
          copyPasteKey={order.data.pix_copy_paste || ""}
          expiresAt={order.data.pix_expires_at}
          onGoToOrder={() => {
            router.push("/orders");
          }}
        />
        <Card>
          <p className="text-sm text-zinc-600">Numero: {order.data.number || order.data.id}</p>
          <p className="mt-1 text-sm text-zinc-600">
            Total: {order.data.total_incl_tax || "-"}
          </p>
        </Card>
      </Section>
    );
  }

  return (
    <Section className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Confirmacao do pedido</h1>
      <Card>
        <p className="text-sm text-zinc-600">Numero: {order.data.number || order.data.id}</p>
        <p className="mt-1 text-sm text-zinc-600">Total: {order.data.total_incl_tax || "-"}</p>
      </Card>
      <OrderTracking orderId={order.data.id} status={order.data.status} />
    </Section>
  );
}
