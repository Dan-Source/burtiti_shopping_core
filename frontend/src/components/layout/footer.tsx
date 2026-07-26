import Link from "next/link";
import { Container } from "@/components/layout/container";

export function Footer() {
  return (
    <footer className="mt-14 border-t border-zinc-200 bg-zinc-50 py-8">
      <Container className="flex flex-col gap-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Buriti Shopping • Comercio digital moderno</p>
        <div className="flex gap-4">
          <Link href="/products" className="hover:text-zinc-900">
            Catalogo
          </Link>
          <Link href="/account" className="hover:text-zinc-900">
            Conta
          </Link>
        </div>
      </Container>
    </footer>
  );
}
