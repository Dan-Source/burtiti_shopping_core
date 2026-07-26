"use client";

import Link from "next/link";
import { useLogout, useProfile } from "@/hooks";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export function UserMenu({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const profile = useProfile(isAuthenticated);
  const logout = useLogout();
  const router = useRouter();

  function closeMenu() {
    setOpen(false);
    setAnchorEl(null);
  }

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      closeMenu();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [open]);

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="flex h-10 items-center justify-center rounded-lg border border-gray-600 px-4 text-sm font-medium text-white transition hover:border-red-600 hover:text-red-600"
      >
        Entrar
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        type="button"
        onClick={(event) => {
          setAnchorEl(event.currentTarget);
          setOpen((currentOpen) => !currentOpen);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white transition hover:bg-gray-600"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {profile.isLoading ? (
          <span className="navbar-avatar-loading">...</span>
        ) : (
          profile.data?.email?.[0]?.toUpperCase() || "U"
        )}
      </button>

      {open && (
        <div
          className="navbar-dropdown absolute right-0 z-[60] w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
          style={{ top: anchorEl ? anchorEl.offsetHeight + 8 : 48 }}
        >
          <div className="border-b border-gray-200 px-3 py-2 pb-3">
            {profile.isLoading ? (
              <p className="text-xs text-gray-500">Carregando perfil...</p>
            ) : profile.isError ? (
              <p className="text-xs text-red-600">Nao foi possivel carregar o perfil.</p>
            ) : (
              <>
                <p className="truncate text-sm font-medium text-zinc-900">
                  {profile.data?.email || "Email nao disponivel"}
                </p>
                <p className="text-xs text-gray-600">
                  {profile.data?.first_name || "Usuario"} {profile.data?.last_name || ""}
                </p>
              </>
            )}
          </div>

          <nav className="space-y-1 py-2">
            <Link
              href="/account"
              onClick={closeMenu}
              className="block rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-gray-100"
            >
              Gerenciar Conta
            </Link>
            <Link
              href="/orders"
              onClick={closeMenu}
              className="block rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-gray-100"
            >
              Meus Pedidos
            </Link>
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="w-full rounded border-t border-gray-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            {logout.isPending ? "Saindo..." : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
