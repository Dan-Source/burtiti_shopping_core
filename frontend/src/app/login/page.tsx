"use client";

import { useLogin } from "@/hooks";
import { Button, Card, Input, Section } from "@/components";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginPageContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const login = useLogin();
  const router = useRouter();
  const searchParams = useSearchParams();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login.mutateAsync({ username, password });
      const nextRoute = searchParams.get("next") || "/account";
      router.replace(nextRoute);
    } catch {
      setErrorMessage("Nao foi possivel autenticar com as credenciais informadas.");
    }
  }

  return (
    <Section className="mx-auto max-w-md py-6">
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900">Entrar</h1>
          <p className="text-sm text-zinc-600">Use seu usuario e senha para acessar sua conta.</p>

          <label className="block space-y-1 text-sm text-zinc-700">
            <span>Usuario</span>
            <Input
              required
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="block space-y-1 text-sm text-zinc-700">
            <span>Senha</span>
            <Input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <Button disabled={login.isPending} type="submit" className="w-full">
            {login.isPending ? "Entrando..." : "Entrar"}
          </Button>

          <p className="text-sm text-zinc-600">
            Nao possui conta?{" "}
            <Link href="/register" className="font-medium text-zinc-900 underline">
              Criar conta
            </Link>
          </p>
        </form>
      </Card>
    </Section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Section className="py-6">Carregando...</Section>}>
      <LoginPageContent />
    </Suspense>
  );
}
