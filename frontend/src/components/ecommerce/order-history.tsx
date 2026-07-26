import Link from "next/link";
import { getOrderId } from "@/lib/orders";
import type { Order } from "@/types/api";

type OrderHistoryProps = {
  orders: Order[];
};

function paymentStatusBadge(paymentStatus?: string) {
  const s = String(paymentStatus || "").toLowerCase();
  if (s === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
        Aguardando pagamento
      </span>
    );
  }
  if (s === "paid" || s === "complete" || s === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        Pago
      </span>
    );
  }
  if (s === "expired") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Expirado
      </span>
    );
  }
  return null;
}

function isPendingPayment(paymentStatus?: string) {
  return String(paymentStatus || "").toLowerCase() === "pending";
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const orderId = getOrderId(order);
        return (
          <Link key={orderId} href={`/orders/${orderId}`}>
            <article
              className={`rounded-xl border bg-white p-4 transition-colors hover:bg-zinc-50 ${
                isPendingPayment(order.payment_status)
                  ? "border-yellow-300"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-900">Pedido #{order.number || orderId}</h3>
                {paymentStatusBadge(order.payment_status)}
              </div>
              <p className="mt-1 text-sm text-zinc-600">Status: {order.status || "-"}</p>
              <p className="text-sm text-zinc-600">Total: {order.total_incl_tax || "-"}</p>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
