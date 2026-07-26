"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/products", label: "Produtos" },
  { href: "/search", label: "Busca" },
  { href: "/orders", label: "Pedidos" },
];

export function NavbarMenu() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-8 md:flex">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition duration-150 ${
              isActive ? "border-b-2 border-red-600 text-white" : "text-gray-300 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
