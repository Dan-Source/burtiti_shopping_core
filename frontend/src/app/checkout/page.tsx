"use client";

import Link from "next/link";
import {
  Card,
  CheckoutStepper,
  EmptyState,
  PaymentStep,
  PixPostCheckoutStep,
  ReviewStep,
  Section,
  ShippingAddressStep,
  Spinner,
  toast,
} from "@/components";
import {
  useCart,
  useCreateAddress,
  useCreateOrder,
  useDeleteAddress,
  useOrderById,
  usePaymentMethods,
  useProfile,
  useShippingMethods,
  useUpdateAddress,
  useUserAddresses,
} from "@/hooks";
import { useAuthStore, useCheckoutStore } from "@/store";
import { normalizePixStatus, isPixMethod, isCashMethod, getQrCodeImageSource } from "@/lib/pix";
import type { CreateAddressPayload, UserAddress } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

export default function CheckoutPage() {
  const createOrder = useCreateOrder();
  const router = useRouter();
  const cart = useCart();
  const shippingMethods = useShippingMethods();
  const paymentMethods = usePaymentMethods();
  const userAddresses = useUserAddresses();
  const profile = useProfile();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { state, setAddressField, setField, setPixState, setPostcodeLookup, setStep, reset } =
    useCheckoutStore();
  const lastPixStatus = useRef<string>(state.pix.status);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const userEmail = isAuthenticated ? profile.data?.email : undefined;

  const pixOrder = useOrderById(state.pix.orderId || "", {
    enablePolling: state.step === "pix" && Boolean(state.pix.orderId),
    pollIntervalMs: 5000,
  });

  useEffect(() => {
    if (!pixOrder.data || state.step !== "pix") {
      return;
    }

    const status = normalizePixStatus(pixOrder.data);
    const qrCode =
      getQrCodeImageSource(pixOrder.data.pix_qr_code_image) ||
      getQrCodeImageSource(pixOrder.data.pix_qr_code) ||
      state.pix.qrCode;
    const copyPasteKey = pixOrder.data.pix_copy_paste || state.pix.copyPasteKey;

    setPixState({
      status,
      qrCode,
      copyPasteKey,
    });

    if (status === "paid" && lastPixStatus.current !== "paid") {
      toast.success("Pagamento confirmado", "O pagamento PIX foi aprovado.");
      const orderId = state.pix.orderId;
      reset();
      if (orderId) {
        router.push(`/orders/${orderId}`);
      }
      return;
    }

    lastPixStatus.current = status;
  }, [pixOrder.data, setPixState, state.pix.copyPasteKey, state.pix.orderId, state.pix.qrCode, state.step, reset, router]);

  function validateAddressStep() {
    const requiredAddressFields: Array<keyof typeof state.shipping_address> = [
      "full_name",
      "street",
      "bairro",
      "cep",
    ];

    if (!state.guest_email.trim()) {
      toast.error("Email obrigatorio", "Informe um email para contato no checkout.");
      return false;
    }

    const missingAddressField = requiredAddressFields.find(
      (field) => !String(state.shipping_address[field] || "").trim(),
    );
    if (missingAddressField) {
      toast.error(
        "Endereco incompleto",
        "Preencha todos os campos obrigatorios do endereco de entrega.",
      );
      return false;
    }

    if (!state.shipping_method_code.trim()) {
      toast.error("Frete obrigatorio", "Selecione um metodo de entrega para continuar.");
      return false;
    }

    return true;
  }

  function validatePaymentStep() {
    if (!state.payment_method_code.trim()) {
      toast.error("Pagamento obrigatorio", "Selecione um metodo de pagamento para continuar.");
      return false;
    }

    return true;
  }

  async function onSubmitReview() {
    try {
      const order = await createOrder.mutateAsync({
        guest_email: state.guest_email,
        shipping_address: state.shipping_address,
        shipping_method_code: state.shipping_method_code,
        payment_method_code: state.payment_method_code,
      });

      if (isPixMethod(state.payment_method_code)) {
        setPixState({
          orderId: order.id,
          status: normalizePixStatus(order),
          qrCode:
            getQrCodeImageSource(order.pix_qr_code_image) ||
            getQrCodeImageSource(order.pix_qr_code),
          copyPasteKey: order.pix_copy_paste || "",
        });
        setStep("pix");
        toast.success("Pedido criado", "Finalize o pagamento usando PIX.");
        return;
      }

      toast.success("Pedido criado", "Seu pedido foi finalizado com sucesso.");
      reset();
      router.push(`/orders/${order.id}`);
    } catch {
      toast.error("Falha no checkout", "Nao foi possivel concluir o pedido.");
    }
  }

  async function handlePaymentStepContinue() {
    if (!validatePaymentStep()) {
      return;
    }

    if (isPixMethod(state.payment_method_code) || isCashMethod(state.payment_method_code)) {
      await onSubmitReview();
      return;
    }

    setStep("review");
  }

  function goNextFromAddress() {
    if (!validateAddressStep()) {
      return;
    }

    setStep("payment-method");
  }

  const handleSelectSavedAddress = useCallback(
    (addr: UserAddress) => {
      setSelectedAddressId(addr.id);
      const fullName = [addr.first_name, addr.last_name].filter(Boolean).join(" ");
      const numberParts = [addr.line2, addr.line3].filter(Boolean).join(" ");
      setAddressField("full_name", fullName);
      setAddressField("street", addr.line1 || "");
      setAddressField("number", numberParts);
      setAddressField("bairro", addr.line4 || "");
      setAddressField("city", addr.city || "");
      setAddressField("state", addr.state || "");
      setAddressField("cep", addr.postcode || "");
      setAddressField("phone", addr.phone_number || "");
      setPostcodeLookup({
        postcode: (addr.postcode || "").replace(/\D/g, ""),
        city: addr.city || "",
        state: addr.state || "",
      });
    },
    [setAddressField, setPostcodeLookup],
  );

  const handleNewAddress = useCallback(() => {
    setSelectedAddressId(null);
    setAddressField("full_name", "");
    setAddressField("street", "");
    setAddressField("number", "");
    setAddressField("bairro", "");
    setAddressField("city", "");
    setAddressField("state", "");
    setAddressField("cep", "");
    setAddressField("phone", "");
    setPostcodeLookup({ postcode: "", city: "", state: "" });
  }, [setAddressField, setPostcodeLookup]);

  const handleSaveNewAddress = useCallback(
    async (data: CreateAddressPayload) => {
      try {
        await createAddress.mutateAsync(data);
        toast.success("Endereco salvo", "Endereco salvo com sucesso na sua conta.");
        setSelectedAddressId(null);
        setAddressField("full_name", "");
        setAddressField("street", "");
        setAddressField("number", "");
        setAddressField("bairro", "");
        setAddressField("city", "");
        setAddressField("state", "");
        setAddressField("cep", "");
        setAddressField("phone", "");
        setPostcodeLookup({ postcode: "", city: "", state: "" });
      } catch {
        toast.error("Erro ao salvar", "Nao foi possivel salvar o endereco.");
      }
    },
    [createAddress, setAddressField, setPostcodeLookup],
  );

  const handleUpdateAddress = useCallback(
    async (id: number, data: Partial<CreateAddressPayload>) => {
      try {
        await updateAddress.mutateAsync({ id, data });
        toast.success("Endereco atualizado", "Endereco atualizado com sucesso.");
        setSelectedAddressId(id);
      } catch {
        toast.error("Erro ao atualizar", "Nao foi possivel atualizar o endereco.");
      }
    },
    [updateAddress],
  );

  const handleDeleteAddress = useCallback(
    async (id: number) => {
      try {
        await deleteAddress.mutateAsync(id);
        toast.success("Endereco removido", "Endereco removido com sucesso.");
      } catch {
        toast.error("Erro ao remover", "Nao foi possivel remover o endereco.");
      }
    },
    [deleteAddress],
  );

  const paymentContinueLabel = isPixMethod(state.payment_method_code)
    ? "Ver PIX"
    : isCashMethod(state.payment_method_code)
      ? "Finalizar pedido"
      : "Revisar pedido";

  if (cart.isLoading) {
    return (
      <Section className="py-6">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner /> Carregando checkout...
        </div>
      </Section>
    );
  }

  const cartLines = Array.isArray(cart.data?.lines) ? cart.data.lines : [];
  if (!cart.data || cartLines.length === 0) {
    return (
      <Section className="py-6">
        <EmptyState
          title="Seu carrinho esta vazio"
          description="Adicione produtos ao carrinho antes de iniciar o checkout."
          action={
            <Link href="/products" className="text-sm font-medium text-zinc-900 underline">
              Ir para o catalogo
            </Link>
          }
        />
      </Section>
    );
  }

  const pixStatusLabel =
    state.pix.status === "paid"
      ? "Pago"
      : state.pix.status === "expired"
        ? "Expirado"
        : "Aguardando";

  return (
    <Section className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Checkout</h1>
      <CheckoutStepper current={state.step} />

      {state.step === "shipping-address" ? (
        <ShippingAddressStep
          guestEmail={state.guest_email}
          address={state.shipping_address}
          postcodeLookup={state.postcode_lookup}
          selectedShippingMethod={state.shipping_method_code}
          shippingMethods={shippingMethods.data || []}
          loadingShippingMethods={shippingMethods.isLoading}
          savedAddresses={userAddresses.data}
          isLoadingAddresses={userAddresses.isLoading}
          selectedAddressId={selectedAddressId}
          userEmail={userEmail}
          isAuthenticated={isAuthenticated}
          isSavingAddress={createAddress.isPending || updateAddress.isPending}
          isDeletingAddress={deleteAddress.isPending}
          onGuestEmailChange={(value) => setField("guest_email", value)}
          onAddressChange={setAddressField}
          onPostcodeLookupChange={setPostcodeLookup}
          onShippingMethodChange={(value) => setField("shipping_method_code", value)}
          onSelectSavedAddress={handleSelectSavedAddress}
          onNewAddress={handleNewAddress}
          onSaveNewAddress={handleSaveNewAddress}
          onUpdateAddress={handleUpdateAddress}
          onDeleteAddress={handleDeleteAddress}
          onContinue={goNextFromAddress}
        />
      ) : null}

      {state.step === "payment-method" ? (
        <PaymentStep
          methods={paymentMethods.data || []}
          selectedCode={state.payment_method_code}
          isLoading={paymentMethods.isLoading}
          isSubmitting={createOrder.isPending}
          onChange={(value) => setField("payment_method_code", value)}
          onBack={() => setStep("shipping-address")}
          onContinue={handlePaymentStepContinue}
          continueLabel={paymentContinueLabel}
        />
      ) : null}

      {state.step === "review" ? (
        <ReviewStep
          cart={cart.data}
          checkout={state}
          shippingMethods={shippingMethods.data || []}
          paymentMethods={paymentMethods.data || []}
          isSubmitting={createOrder.isPending}
          onBack={() => setStep("payment-method")}
          onSubmit={onSubmitReview}
        />
      ) : null}

      {state.step === "pix" ? (
        <PixPostCheckoutStep
          orderNumber={pixOrder.data?.number || state.pix.orderId}
          status={pixStatusLabel}
          qrCode={state.pix.qrCode}
          copyPasteKey={state.pix.copyPasteKey}
          expiresAt={pixOrder.data?.pix_expires_at}
          onGoToOrder={() => {
            if (!state.pix.orderId) {
              return;
            }

            const orderId = state.pix.orderId;
            reset();
            router.push(`/orders/${orderId}`);
          }}
        />
      ) : null}

      {state.step === "pix" && pixOrder.isLoading ? (
        <Card>
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <Spinner /> Atualizando status do pagamento...
          </p>
        </Card>
      ) : null}
    </Section>
  );
}
