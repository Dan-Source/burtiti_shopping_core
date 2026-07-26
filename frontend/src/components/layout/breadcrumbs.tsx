"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const routeLabelMap: Record<string, string> = {
  account: "Conta",
  cart: "Carrinho",
  checkout: "Checkout",
  login: "Entrar",
  orders: "Pedidos",
  products: "Produtos",
  register: "Criar conta",
  search: "Busca",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav className={cn("text-sm text-zinc-600", className)} aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-zinc-900">
            Inicio
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = routeLabelMap[segment] || decodeURIComponent(segment);

          return (
            <li key={href} className="flex items-center gap-2">
              <span aria-hidden>/</span>
              {isLast ? (
                <span className="font-medium text-zinc-900">{label}</span>
              ) : (
                <Link href={href} className="hover:text-zinc-900">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
