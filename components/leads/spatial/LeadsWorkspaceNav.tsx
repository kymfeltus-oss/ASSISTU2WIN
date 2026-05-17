"use client";

import { AppBrand } from "@/components/AppBrand";
import { spatial } from "@/components/leads/spatial/spatial-styles";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/leads", label: "Directory" },
  { href: "/dashboard/leads/command", label: "Command" },
  { href: "/dashboard/leads/pipeline", label: "Pipeline" },
  { href: "/dashboard/leads/analytics", label: "Analytics" },
] as const;

export function LeadsWorkspaceNav() {
  const pathname = usePathname();

  if (pathname === "/dashboard/leads" || pathname.startsWith("/dashboard/leads/analytics")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-5 pb-3 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <AppBrand variant="compact" />
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-slate-300 uppercase transition-colors hover:text-white sm:hidden"
          >
            Exit
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-1 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard/leads"
                ? pathname === "/dashboard/leads"
                : item.href === "/dashboard/leads/command"
                  ? pathname === "/dashboard/leads/command"
                  : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${spatial.navLink} ${
                  isActive ? spatial.navActive : spatial.navIdle
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard/leads/intake"
            className="ml-1 rounded-full bg-cyan-500/90 px-4 py-2 text-xs font-semibold tracking-wide text-[#060a14] transition-all hover:bg-cyan-400"
          >
            Add buyer
          </Link>
        </nav>

        <Link
          href="/dashboard"
          className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-slate-300 uppercase transition-colors hover:text-white sm:inline-block"
        >
          Exit
        </Link>
      </div>
    </header>
  );
}
