"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/products", label: "Produtos" },
    { href: "/search", label: "Busca" },
    { href: "/orders", label: "Pedidos" },
    { href: "/account", label: "Conta" },
  ];

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition hover:bg-gray-800 hover:text-white"
        aria-label="Menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {open && (
        <div className="navbar-mobile-menu absolute top-12 right-0 left-0 w-screen bg-black shadow-lg">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
