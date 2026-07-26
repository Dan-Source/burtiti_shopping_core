type OrderTrackingProps = {
  orderId: number | string;
  status?: string;
};

export function OrderTracking({ orderId, status }: OrderTrackingProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Rastreamento do pedido</h2>
      <p className="mt-2 text-sm text-zinc-600">Pedido #{orderId}</p>
      <p className="text-sm font-medium text-zinc-900">Status: {status || "Em processamento"}</p>
    </div>
  );
}
