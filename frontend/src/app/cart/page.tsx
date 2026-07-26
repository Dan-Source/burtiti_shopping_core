"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import {
  Button,
  CartItem,
  CartSummary,
  EmptyState,
  Input,
  Section,
  Spinner,
  toast,
} from "@/components";
import { useAddVoucher, useCart, useClearCart, useRemoveFromCart, useUpdateCart } from "@/hooks";
import { FormEvent, useState } from "react";

export default function CartPage() {
  const cart = useCart();
  const addVoucher = useAddVoucher();
  const updateCart = useUpdateCart();
  const removeFromCart = useRemoveFromCart();
  const clearCart = useClearCart();
  const [voucher, setVoucher] = useState("");
  const [pendingLineId, setPendingLineId] = useState<number | null>(null);
  const [removingLineId, setRemovingLineId] = useState<number | null>(null);
  const cartLines = Array.isArray(cart.data?.lines) ? cart.data.lines : [];
  const itemCount = cartLines.reduce((total, line) => total + line.quantity, 0);

  async function handleUpdateQuantity(lineId: number, quantity: number) {
    setPendingLineId(lineId);

    try {
      await updateCart.mutateAsync({ lineId, quantity });
    } catch {
      toast.error(
        "Nao foi possivel atualizar a quantidade",
        "Tente novamente em alguns instantes.",
      );
    } finally {
      setPendingLineId((current) => (current === lineId ? null : current));
    }
  }

  async function handleRemoveLine(lineId: number) {
    setRemovingLineId(lineId);

    try {
      await removeFromCart.mutateAsync(lineId);
      toast.success("Item removido do carrinho");
    } catch {
      toast.error("Nao foi possivel remover o item", "Tente novamente em alguns instantes.");
    } finally {
      setRemovingLineId((current) => (current === lineId ? null : current));
    }
  }

  async function onClearCart() {
    if (cartLines.length === 0 || clearCart.isPending) {
      return;
    }

    const confirmed = window.confirm("Deseja remover todos os itens do carrinho?");
    if (!confirmed) {
      return;
    }

    try {
      await clearCart.mutateAsync(cartLines.map((line) => line.id));
      toast.success("Carrinho limpo com sucesso");
    } catch {
      toast.error("Nao foi possivel limpar o carrinho", "Tente novamente em alguns instantes.");
    }
  }

  async function onApplyVoucher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await addVoucher.mutateAsync(voucher);
      toast.success("Cupom aplicado");
      setVoucher("");
    } catch {
      toast.error("Cupom invalido", "Confira o codigo e tente novamente.");
    }
  }

  if (cart.isLoading) {
    return (
      <Section className="py-6">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner /> Carregando carrinho...
        </div>
      </Section>
    );
  }

  if (!cart.data || cartLines.length === 0) {
    return (
      <Section className="py-6">
        <EmptyState
          title="Seu carrinho esta vazio"
          description="Adicione produtos para continuar o checkout."
          action={
            <Link href="/products" className="text-sm font-medium text-zinc-900 underline">
              Ir para o catalogo
            </Link>
          }
        />
      </Section>
    );
  }

  return (
    <Section className="grid gap-5 py-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-zinc-900" />
            <h1 className="text-2xl font-semibold text-zinc-900">Meu carrinho</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void onClearCart()}
            disabled={clearCart.isPending}
          >
            {clearCart.isPending ? "Limpando..." : "Limpar carrinho"}
          </Button>
        </div>
        {cartLines.map((line) => (
          <CartItem
            key={line.id}
            line={line}
            isUpdating={updateCart.isPending && pendingLineId === line.id}
            isRemoving={removeFromCart.isPending && removingLineId === line.id}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveLine}
          />
        ))}

        <form
          onSubmit={onApplyVoucher}
          className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <Input
            value={voucher}
            onChange={(event) => setVoucher(event.target.value)}
            placeholder="Codigo do cupom"
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" disabled={addVoucher.isPending}>
            {addVoucher.isPending ? "Aplicando..." : "Aplicar cupom"}
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        <CartSummary itemCount={itemCount} cart={cart.data} />
        <Link
          href="/checkout"
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Ir para checkout
        </Link>
      </div>
    </Section>
  );
}
