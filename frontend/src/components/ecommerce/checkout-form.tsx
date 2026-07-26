"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormEvent } from "react";

type CheckoutFormValues = {
  guest_email: string;
  shipping_method_code: string;
};

type CheckoutFormProps = {
  defaultValues?: Partial<CheckoutFormValues>;
  onSubmit: (values: CheckoutFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
};

export function CheckoutForm({ defaultValues, onSubmit, isSubmitting }: CheckoutFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await onSubmit({
      guest_email: String(formData.get("guest_email") || ""),
      shipping_method_code: String(formData.get("shipping_method_code") || ""),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold text-zinc-900">Checkout</h2>
      <Input
        required
        name="guest_email"
        type="email"
        placeholder="Email para contato"
        defaultValue={defaultValues?.guest_email || ""}
      />
      <Input
        required
        name="shipping_method_code"
        placeholder="Codigo do frete"
        defaultValue={defaultValues?.shipping_method_code || ""}
      />
      <Button disabled={isSubmitting} type="submit" className="w-full">
        {isSubmitting ? "Finalizando..." : "Finalizar pedido"}
      </Button>
    </form>
  );
}
