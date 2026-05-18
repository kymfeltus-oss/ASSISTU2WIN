"use client";

import { AssistU2WinBottomNav } from "@/components/navigation/AssistU2WinBottomNav";
import { shouldShowBottomNav } from "@/lib/navigation/bottom-nav";
import { usePathname } from "next/navigation";

type AppBottomNavGateProps = {
  readonly children: React.ReactNode;
};

/**
 * Wraps app content with bottom safe-area padding when the global dashbar is visible.
 */
export function AppBottomNavGate({ children }: AppBottomNavGateProps) {
  const pathname = usePathname();
  const showNav = shouldShowBottomNav(pathname);

  return (
    <>
      <div className={showNav ? "app-shell-pad-bottom app-min-w-0" : "app-min-w-0"}>
        {children}
      </div>
      {showNav ? <AssistU2WinBottomNav /> : null}
    </>
  );
}
