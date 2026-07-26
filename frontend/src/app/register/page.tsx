"use client";

import { useRegister } from "@/hooks";
import { Button, Card, Input, Section } from "@/components";
import { isAuthenticated } from "@/lib/api/auth-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const register = useRegister();
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password1 !== password2) {
      setErrorMessage("As senhas precisam ser iguais.");
      return;
    }

    try {
      await register.mutateAsync({
        email,
        password1,
        password2,
      });
      router.replace(isAuthenticated() ? "/account" : "/login");
    } catch {
      setErrorMessage("Nao foi possivel criar sua conta com os dados informados.");
    }
  }

  return (
    <Section className="mx-auto max-w-md py-6">
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900">Criar conta</h1>
          <p className="text-sm text-zinc-600">Cadastro com autenticacao JWT.</p>

          <label className="block space-y-1 text-sm text-zinc-700">
            <span>Email</span>
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block space-y-1 text-sm text-zinc-700">
            <span>Senha</span>
            <Input
              required
              minLength={6}
              type="password"
              value={password1}
              onChange={(event) => setPassword1(event.target.value)}
            />
          </label>

          <label className="block space-y-1 text-sm text-zinc-700">
            <span>Confirmar senha</span>
            <Input
              required
              minLength={6}
              type="password"
              value={password2}
              onChange={(event) => setPassword2(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <Button disabled={register.isPending} type="submit" className="w-full">
            {register.isPending ? "Criando conta..." : "Criar conta"}
          </Button>

          <p className="text-sm text-zinc-600">
            Ja possui conta?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline">
              Entrar
            </Link>
          </p>
        </form>
      </Card>
    </Section>
  );
}
