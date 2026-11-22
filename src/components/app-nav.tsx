"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { focusRing } from "@/components/ui/controls";
import { ROUTES } from "@/lib/constants";

// Order follows the cycle on Home: Self (Profile) -> Direction -> Review.
export const NAV = [
  { href: ROUTES.home, label: "Home" },
  { href: ROUTES.profile, label: "Profile" },
  { href: ROUTES.direction, label: "Direction" },
  { href: ROUTES.community, label: "Community" },
  { href: ROUTES.reviews, label: "Reviews" },
  { href: ROUTES.settings, label: "Settings" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ account }: { account: ReactNode }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  return (
    <div className="sky-solid px-3 pt-3">
      <div className="glass mx-auto w-full max-w-5xl rounded-[28px] px-2 py-1.5 sm:rounded-full">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={ROUTES.home}
            aria-label="Swervly home"
            className={`inline-flex min-h-12 items-center rounded-full px-3 ${focusRing}`}
          >
            {/* on-light wordmark for glass; h-6 mobile / h-8 desktop (~140×32) */}
            <BrandLogo
              variant="light"
              wordmark
              size={32}
              sizeClassName="h-6 sm:h-8"
              decorative
            />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} />
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`inline-flex min-h-12 items-center rounded-full px-4 text-base font-semibold text-ink md:hidden ${focusRing}`}
              aria-expanded={open}
              aria-controls="main-menu"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Close" : "Menu"}
            </button>
            <div className="flex min-h-12 items-center px-2">{account}</div>
          </div>
        </div>

        {open ? (
          <nav id="main-menu" aria-label="Main" className="grid gap-1 px-1 pb-2 pt-1 md:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
                block
                onNavigate={() => setOpen(false)}
              />
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  block = false,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  block?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${block ? "flex w-full" : "inline-flex"} min-h-12 items-center rounded-full px-4 text-base font-medium transition-colors ${focusRing} ${
        active ? "bg-white text-ink shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-ink-2 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
