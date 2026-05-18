"use client";

import { BottomNavIcon } from "@/components/navigation/BottomNavIcon";
import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";
import {
  ASSISTU2WIN_BOTTOM_NAV,
  isBottomNavItemActive,
  type BottomNavItem,
} from "@/lib/navigation/bottom-nav";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const CARD_NORMAL =
  "rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel-alpha)] shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-xl";

export const CARD_FEATURED =
  "rounded-2xl border-t-2 border-b border-r border-l-0 border-[color:var(--cyan)] bg-[color:var(--panel-featured)] shadow-[0_-10px_30px_-18px_rgba(0,242,254,0.75),_10px_0_30px_-20px_rgba(0,242,254,0.45),_0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-xl";

/** Transparent shell so root `body` gradient (--bg-canvas) shows through. */
export const APP_SHELL_BG =
  "relative min-h-0 w-full min-w-0 app-overflow-x-clip bg-transparent text-[color:var(--text-primary)]";

export const MUTED = "text-[color:var(--text-muted)]";

export const SECTION_HEADING =
  "text-[10px] font-semibold tracking-[0.18em] text-[color:var(--text-muted)] uppercase sm:text-[11px]";

export const PAGE_CONTAINER =
  "app-page box-border w-full min-w-0 pt-[var(--app-content-pad-block)] pb-[var(--app-content-pad-block)]";

export const APP_GRID =
  "grid w-full min-w-0 grid-cols-1 gap-[var(--app-gap-lg)] lg:grid-cols-[var(--app-rail-width)_minmax(0,1fr)_minmax(0,min(100%,var(--app-right-rail-width)))] lg:items-start";

/** Main + right rail only — use inside `DashboardAppShell` (left app rail is in the layout). */
export const APP_MAIN_GRID =
  "grid w-full min-w-0 grid-cols-1 gap-[var(--app-gap-lg)] lg:grid-cols-[minmax(0,1fr)_minmax(0,min(100%,var(--app-right-rail-width)))] lg:items-start";

export const SECTION_GRID =
  "grid min-w-0 grid-cols-1 gap-[var(--app-gap)] sm:grid-cols-2 md:gap-[var(--app-gap-lg)]";

export const PANEL =
  "panel min-w-0 overflow-visible rounded-2xl p-4 sm:p-5";

export const TOUCH_TARGET =
  "min-h-11 min-w-11 touch-manipulation";

type QuickAction = {
  readonly label: string;
  readonly href: string;
  readonly icon: "intake" | "score" | "follow" | "lender";
};

/** @deprecated Use ASSISTU2WIN_BOTTOM_NAV — kept for AppRail sidebar parity. */
export const DASHBOARD_BOTTOM_NAV = ASSISTU2WIN_BOTTOM_NAV;

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "Intake", href: "/dashboard/leads/intake", icon: "intake" },
  { label: "Score", href: "/dashboard/analytics", icon: "score" },
  { label: "Follow Up", href: "/dashboard/leads/pipeline", icon: "follow" },
  { label: "Lender", href: "/dashboard/lender", icon: "lender" },
] as const;

export function isNavActive(pathname: string, item: BottomNavItem): boolean {
  return isBottomNavItemActive(pathname, item);
}

function IconGlyph({
  kind,
  className = "h-5 w-5",
}: {
  readonly kind: BottomNavItem["icon"] | QuickAction["icon"];
  readonly className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    intake: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    ),
    score: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
    follow: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
    lender: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-6.75 4.5h6.75m-6.75 4.5h6.75m-6.75 4.5h6.75"
      />
    ),
    home: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    ),
    leads: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    ),
    pipeline: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    ),
    analytics: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  };

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      {paths[kind]}
    </svg>
  );
}

export function AppRail({ pathname }: { readonly pathname: string }) {
  return (
    <aside
      className="hidden min-w-0 flex-col rounded-2xl border border-[#1E2A44] bg-[#050713]/95 px-3 py-4 backdrop-blur-xl sm:px-4 lg:flex lg:sticky lg:top-[var(--app-sticky-offset)] lg:max-h-[var(--app-sticky-max-height)] lg:self-start lg:overflow-y-auto lg:overflow-x-clip"
      aria-label="App navigation"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#1E2A44]">
          <Image
            src={BRAND_LOGO_SRC}
            alt={BRAND_LOGO_ALT}
            fill
            className="object-cover"
            sizes="40px"
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.2em] text-[#00F2FE]/80 uppercase">
            Assist U2 Win
          </p>
          <p className="text-sm font-bold text-[#F8FAFC]">Agent Command</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Primary">
        {DASHBOARD_BOTTOM_NAV.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border border-[#00F2FE]/35 bg-[#161C31] text-[#00F2FE]"
                  : "text-[#94A3B8] hover:bg-[#111827] hover:text-[#F8FAFC]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <BottomNavIcon kind={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 border-t border-[#1E2A44] pt-4">
        <p className={`mb-2 px-1 text-[9px] font-bold tracking-[0.16em] uppercase ${MUTED}`}>
          Quick launch
        </p>
        <div className="flex flex-col gap-1">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-[#94A3B8] transition hover:bg-[#111827] hover:text-[#F8FAFC]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E2A44] bg-[#0B1020] text-[#00F2FE]">
                <IconGlyph kind={action.icon} className="h-4 w-4" />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <form action="/api/auth/signout" method="POST" className="mt-5">
        <button
          type="submit"
          className={`w-full rounded-xl border border-[#1E2A44] bg-[#111827] px-3 py-2.5 text-xs font-semibold text-[#94A3B8] transition hover:text-[#F8FAFC] ${TOUCH_TARGET}`}
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}

export function SectionTitle({
  title,
  actionHref,
  actionLabel,
}: {
  readonly title: string;
  readonly actionHref?: string;
  readonly actionLabel?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className={SECTION_HEADING}>{title}</h2>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="shrink-0 py-1 text-[10px] font-semibold text-[#00F2FE] sm:text-xs"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
