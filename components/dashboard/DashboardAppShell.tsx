"use client";

import {
  APP_SHELL_BG,
  AppRail,
  PAGE_CONTAINER,
} from "@/components/dashboard/AgentCommandShell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type DashboardAppShellProps = {
  readonly children: ReactNode;
};

/** Shared chrome for all /dashboard routes — left rail (bottom nav is global in root layout). */
export function DashboardAppShell({ children }: DashboardAppShellProps) {
  const pathname = usePathname();

  return (
    <div className={APP_SHELL_BG}>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(0,242,254,.10), transparent 32%), radial-gradient(circle at top right, rgba(167,139,250,.08), transparent 28%), linear-gradient(180deg, #020617 0%, #07111d 25%, #0b1524 55%, #0f172a 100%)",
        }}
        aria-hidden
      />
      <div className={PAGE_CONTAINER}>
        <div className="grid w-full min-w-0 grid-cols-1 gap-[var(--app-gap-lg)] lg:grid-cols-[var(--app-rail-width)_minmax(0,1fr)] lg:items-start">
          <div className="print:hidden">
            <AppRail pathname={pathname} />
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
