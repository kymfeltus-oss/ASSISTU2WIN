/** Routes where the global realtor bottom nav must not render. */
export const BOTTOM_NAV_EXCLUDED_PATHS = [
  "/",
  "/login",
  "/auth/signup",
  "/onboarding",
  "/intake",
  "/scan",
  "/download-app",
  "/my-sanctuary",
  "/admin",
] as const;

export function shouldShowBottomNav(pathname: string): boolean {
  if (!pathname) return false;
  return !BOTTOM_NAV_EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export type BottomNavIconKind =
  | "home"
  | "clients"
  | "leads"
  | "closing"
  | "pipeline"
  | "winmeeting";

export type BottomNavMatch = "exact" | "prefix" | "leads-hub";

export type BottomNavItem = {
  readonly label: string;
  readonly href: string;
  readonly icon: BottomNavIconKind;
  readonly match: BottomNavMatch;
};

const LEADS_ROOT = "/dashboard/leads";
const PIPELINE_ROOT = "/dashboard/leads/pipeline";

export const ASSISTU2WIN_BOTTOM_NAV: readonly BottomNavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home", match: "exact" },
  {
    label: "Clients",
    href: "/dashboard/pipeline/active",
    icon: "clients",
    match: "prefix",
  },
  { label: "Leads", href: LEADS_ROOT, icon: "leads", match: "leads-hub" },
  {
    label: "Closing",
    href: "/dashboard/pipeline/closed",
    icon: "closing",
    match: "prefix",
  },
  { label: "Pipeline", href: PIPELINE_ROOT, icon: "pipeline", match: "prefix" },
  {
    label: "WinMeeting",
    href: "/dashboard/winmeeting",
    icon: "winmeeting",
    match: "prefix",
  },
] as const;

/** Leads tab: hub + intake/command/qr, not pipeline sub-routes. */
export function isLeadsHubActive(pathname: string): boolean {
  if (!pathname.startsWith(LEADS_ROOT)) return false;
  if (pathname.startsWith(PIPELINE_ROOT)) return false;
  if (pathname.startsWith(`${LEADS_ROOT}/analytics`)) return false;
  return true;
}

export function isBottomNavItemActive(pathname: string, item: BottomNavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.match === "leads-hub") return isLeadsHubActive(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
