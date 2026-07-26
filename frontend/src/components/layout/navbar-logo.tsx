import Link from "next/link";

export function NavbarLogo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 text-xl font-bold text-white transition duration-150 hover:opacity-80"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-sm font-bold text-white">
        B
      </div>
      <span className="hidden text-base sm:inline">BuritiShop</span>
    </Link>
  );
}
