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
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#0B1020] via-[#080C1A] to-[#050713]"
        aria-hidden
      />
      <div className={PAGE_CONTAINER}>
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <div className="print:hidden">
            <AppRail pathname={pathname} />
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
