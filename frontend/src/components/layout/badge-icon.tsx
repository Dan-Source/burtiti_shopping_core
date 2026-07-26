import Link from "next/link";

type BadgeIconProps = {
  href: string;
  icon: "heart" | "cart";
  count: number;
  label: string;
};

export function BadgeIcon({ href, icon, count, label }: BadgeIconProps) {
  const isHeart = icon === "heart";
  const showBadge = count > 0;

  return (
    <Link
      href={href}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition duration-150 hover:bg-gray-800 hover:text-white"
      aria-label={label}
    >
      {isHeart ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8m10 0l2-8m0 0h2.71c1.05 0 1.905-.888 1.905-1.973V4.027c0-1.085-.855-1.973-1.905-1.973H17.71c-1.05 0-1.905.888-1.905 1.973v.506m3.81 6.427L9 5"
          />
        </svg>
      )}

      {showBadge && (
        <span className="navbar-badge-update absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
