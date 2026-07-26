"use client";

import { useCart } from "@/hooks";
import { useAuthStore } from "@/store";
import { useEffect } from "react";
import { NavbarLogo } from "@/components/layout/navbar-logo";
import { SearchBar } from "@/components/layout/search-bar";
import { BadgeIcon } from "@/components/layout/badge-icon";
import { UserMenu } from "@/components/layout/user-menu";
import { Container } from "@/components/layout/container";

export function HeaderContent() {
  const cart = useCart();
  const { isAuthenticated, hydrateFromSession } = useAuthStore();

  useEffect(() => {
    hydrateFromSession();
  }, [hydrateFromSession]);

  const cartItemCount = Array.isArray(cart.data?.lines)
    ? cart.data.lines.reduce((total, line) => total + line.quantity, 0)
    : 0;

  return (
    <header className="sticky top-0 z-40 bg-black shadow-lg">
      <Container className="flex h-16 items-center gap-2 sm:gap-4 md:h-[70px]">
        <NavbarLogo />
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <BadgeIcon href="/cart" icon="cart" count={cartItemCount} label="Carrinho" />
          <UserMenu isAuthenticated={isAuthenticated} />
        </div>
      </Container>
    </header>
  );
}
