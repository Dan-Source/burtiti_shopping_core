"use client";

import { Button, Card, Input, Section, toast } from "@/components";
import { FormEvent } from "react";

export default function ForgotPasswordPage() {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.success(
      "Solicitacao recebida",
      "Se o email existir, enviaremos instrucoes de recuperacao.",
    );
  }

  return (
    <Section className="mx-auto max-w-md py-6">
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900">Recuperar senha</h1>
          <p className="text-sm text-zinc-600">
            Informe seu email para receber instrucoes de redefinicao.
          </p>
          <Input required type="email" name="email" placeholder="seu-email@exemplo.com" />
          <Button type="submit" className="w-full">
            Enviar instrucoes
          </Button>
        </form>
      </Card>
    </Section>
  );
}
