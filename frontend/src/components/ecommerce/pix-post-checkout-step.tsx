"use client";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";

type PixPostCheckoutStepProps = {
  orderNumber?: string | number;
  status: string;
  qrCode: string;
  copyPasteKey: string;
  expiresAt?: string | null;
  onGoToOrder: () => void;
};

export function PixPostCheckoutStep({
  orderNumber,
  status,
  qrCode,
  copyPasteKey,
  expiresAt,
  onGoToOrder,
}: PixPostCheckoutStepProps) {
  async function handleCopyPixKey() {
    if (!copyPasteKey) {
      toast.error("Chave PIX indisponivel", "A chave copia e cola nao foi retornada.");
      return;
    }

    try {
      await navigator.clipboard.writeText(copyPasteKey);
      toast.success("Chave copiada", "A chave PIX foi copiada para a area de transferencia.");
    } catch {
      toast.error("Falha ao copiar", "Nao foi possivel copiar a chave PIX.");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">Pagamento com PIX</h2>
        <p className="text-sm text-zinc-600">Pedido: {orderNumber || "-"}</p>
        <p className="text-sm font-medium text-zinc-900">Status: {status}</p>
        {expiresAt ? (
          <p className="text-xs text-zinc-500">Expira em: {new Date(expiresAt).toLocaleString()}</p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">QR Code</h3>
        {qrCode ? (
          <div className="flex justify-center">
            <Image
              src={qrCode}
              alt="QR Code PIX"
              width={224}
              height={224}
              unoptimized
              className="rounded-lg border border-zinc-200 bg-white p-2"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
            QR Code indisponivel no momento. Use a chave copia e cola abaixo.
          </div>
        )}
      </Card>

      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-zinc-900">Chave copia e cola</h3>
        <textarea
          readOnly
          value={copyPasteKey}
          className="min-h-24 w-full rounded-lg border border-zinc-300 p-3 text-xs text-zinc-700"
        />

        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={onGoToOrder}>
            Ver pedido
          </Button>
          <Button onClick={handleCopyPixKey}>Copiar chave PIX</Button>
        </div>
      </Card>
    </div>
  );
}
