"use client";

import { BottomNavIcon } from "@/components/navigation/BottomNavIcon";
import {
  ASSISTU2WIN_BOTTOM_NAV,
  isBottomNavItemActive,
} from "@/lib/navigation/bottom-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AssistU2WinBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1E2A44] bg-[#030712]/98 backdrop-blur-xl print:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="AssistU2Win navigation"
    >
      <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-1 pt-2 sm:max-w-3xl sm:px-2">
        {ASSISTU2WIN_BOTTOM_NAV.map((item) => {
          const active = isBottomNavItemActive(pathname, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 transition active:scale-95 ${
                active ? "text-[#00F2FE]" : "text-[#94A3B8]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <BottomNavIcon kind={item.icon} className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate text-[9px] font-semibold tracking-[0.06em] uppercase sm:text-[10px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
