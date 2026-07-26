import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Cart, CheckoutState, PaymentMethod, ShippingMethod } from "@/types/api";

type ReviewStepProps = {
  cart?: Cart;
  checkout: CheckoutState;
  shippingMethods: ShippingMethod[];
  paymentMethods: PaymentMethod[];
  isSubmitting?: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export function ReviewStep({
  cart,
  checkout,
  shippingMethods,
  paymentMethods,
  isSubmitting,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const selectedShipping = shippingMethods.find(
    (item) => item.code === checkout.shipping_method_code,
  );
  const selectedPayment = paymentMethods.find((item) => item.code === checkout.payment_method_code);

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">Revisao do pedido</h2>
        <p className="text-sm text-zinc-600">Confira os dados antes de finalizar.</p>
      </Card>

      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-zinc-900">Itens</h3>
        <div className="space-y-2">
          {(cart?.lines || []).map((line) => (
            <div key={line.id} className="flex items-center justify-between text-sm text-zinc-700">
              <span>
                {line.product.name} x {line.quantity}
              </span>
              <span>{line.price_incl_tax || "-"}</span>
            </div>
          ))}
        </div>
        <p className="text-sm font-semibold text-zinc-900">Total: {cart?.total_incl_tax || "-"}</p>
      </Card>

      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-zinc-900">Entrega</h3>
        <p className="text-sm text-zinc-700">
          {checkout.shipping_address.full_name}
        </p>
        <p className="text-sm text-zinc-700">
          {checkout.shipping_address.street}, {checkout.shipping_address.number || "s/n"}
        </p>
        <p className="text-sm text-zinc-700">
          {checkout.shipping_address.bairro} - {checkout.shipping_address.cep}
        </p>
        {checkout.shipping_address.phone ? (
          <p className="text-sm text-zinc-700">Tel: {checkout.shipping_address.phone}</p>
        ) : null}
        <p className="text-sm text-zinc-700">
          {checkout.shipping_address.city} - {checkout.shipping_address.state}
        </p>
        <p className="text-sm text-zinc-700">
          Frete: {selectedShipping?.name || checkout.shipping_method_code}
        </p>
      </Card>

      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-zinc-900">Pagamento</h3>
        <p className="text-sm text-zinc-700">
          Metodo: {selectedPayment?.name || selectedPayment?.label || checkout.payment_method_code}
        </p>
        <p className="text-sm text-zinc-700">Email: {checkout.guest_email}</p>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Finalizando..." : "Finalizar pedido"}
        </Button>
      </div>
    </div>
  );
}
