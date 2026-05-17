import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const LEADS_DASHBOARD_PAGE_KEY = "dashboard/leads" as const;

export type DashboardPageKey = typeof LEADS_DASHBOARD_PAGE_KEY;

export type WidgetKey =
  | "kpi"
  | "liveBadge"
  | "actionCenter"
  | "prospectingFunnel"
  | "mobileIntake"
  | "activityFeed";

export const ALL_WIDGET_KEYS: readonly WidgetKey[] = [
  "kpi",
  "liveBadge",
  "actionCenter",
  "prospectingFunnel",
  "mobileIntake",
  "activityFeed",
] as const;

export const HEADER_WIDGET_KEYS: readonly WidgetKey[] = [
  "kpi",
  "liveBadge",
  "actionCenter",
] as const;

export const SIDEBAR_WIDGET_KEYS: readonly WidgetKey[] = [
  "prospectingFunnel",
  "mobileIntake",
  "activityFeed",
] as const;

export type DashboardLayoutVersion = "v1";

export type DashboardLayoutConfig = {
  readonly version: DashboardLayoutVersion;
  readonly pageKey: DashboardPageKey;
  readonly order: readonly WidgetKey[];
  readonly hidden?: readonly WidgetKey[];
};

export type LayoutConfigSource = "saved" | "default";

export const DEFAULT_LAYOUT_CONFIG: DashboardLayoutConfig = {
  version: "v1",
  pageKey: LEADS_DASHBOARD_PAGE_KEY,
  order: [...ALL_WIDGET_KEYS],
  hidden: [],
};

const WIDGET_KEY_SET = new Set<string>(ALL_WIDGET_KEYS);

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  kpi: "KPI pulse",
  liveBadge: "Live meetings",
  actionCenter: "Action center",
  prospectingFunnel: "Prospecting funnel",
  mobileIntake: "Mobile intake",
  activityFeed: "Activity feed",
};

function isWidgetKey(value: string): value is WidgetKey {
  return WIDGET_KEY_SET.has(value);
}

function logLayoutFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`[DASHBOARD_LAYOUT] ${event} ${safeJsonStringify(context)}`);
}

export function isValidPageKey(value: string): value is DashboardPageKey {
  return value === LEADS_DASHBOARD_PAGE_KEY;
}

export function isValidLayoutConfig(input: unknown): input is DashboardLayoutConfig {
  if (input === null || typeof input !== "object") {
    return false;
  }

  const record = input as Record<string, unknown>;
  if (record.version !== "v1") {
    return false;
  }
  if (record.pageKey !== LEADS_DASHBOARD_PAGE_KEY) {
    return false;
  }
  if (!Array.isArray(record.order)) {
    return false;
  }

  const order = record.order.filter(
    (item): item is WidgetKey => typeof item === "string" && isWidgetKey(item),
  );

  if (order.length !== ALL_WIDGET_KEYS.length) {
    return false;
  }

  const unique = new Set(order);
  if (unique.size !== ALL_WIDGET_KEYS.length) {
    return false;
  }

  if (record.hidden !== undefined) {
    if (!Array.isArray(record.hidden)) {
      return false;
    }
    for (const item of record.hidden) {
      if (typeof item !== "string" || !isWidgetKey(item)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Merges partial/legacy saved JSON with defaults (deduped order, valid hidden keys).
 */
export function normalizeLayoutConfig(input: unknown): DashboardLayoutConfig {
  if (!isValidLayoutConfig(input)) {
    return DEFAULT_LAYOUT_CONFIG;
  }

  const hidden = [...new Set(input.hidden ?? [])].filter((key) =>
    isWidgetKey(key),
  );

  return {
    version: "v1",
    pageKey: LEADS_DASHBOARD_PAGE_KEY,
    order: [...input.order],
    hidden,
  };
}

export function getVisibleWidgetsForZone(
  config: DashboardLayoutConfig,
  zone: "header" | "sidebar",
): WidgetKey[] {
  const zoneKeys = zone === "header" ? HEADER_WIDGET_KEYS : SIDEBAR_WIDGET_KEYS;
  const hidden = new Set(config.hidden ?? []);
  const seen = new Set<WidgetKey>();
  const ordered: WidgetKey[] = [];

  for (const key of config.order) {
    if (!zoneKeys.includes(key) || hidden.has(key) || seen.has(key)) {
      continue;
    }
    ordered.push(key);
    seen.add(key);
  }

  for (const key of zoneKeys) {
    if (!hidden.has(key) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  return ordered;
}

export async function loadDashboardLayoutConfig(
  supabase: SupabaseServerClient,
  userId: string,
  pageKey: DashboardPageKey = LEADS_DASHBOARD_PAGE_KEY,
): Promise<{
  readonly config: DashboardLayoutConfig;
  readonly source: LayoutConfigSource;
}> {
  try {
    const { data, error } = await supabase
      .from("dashboard_layout_configs")
      .select("layout")
      .eq("user_id", userId)
      .eq("page_key", pageKey)
      .maybeSingle();

    if (error) {
      logLayoutFailure("load_failed", {
        userId,
        pageKey,
        ...serializeSupabaseError(error),
      });
      return { config: DEFAULT_LAYOUT_CONFIG, source: "default" };
    }

    if (!data?.layout) {
      return { config: DEFAULT_LAYOUT_CONFIG, source: "default" };
    }

    return {
      config: normalizeLayoutConfig(data.layout),
      source: "saved",
    };
  } catch (caught: unknown) {
    logLayoutFailure("load_exception", {
      userId,
      pageKey,
      ...serializeSupabaseError(caught),
    });
    return { config: DEFAULT_LAYOUT_CONFIG, source: "default" };
  }
}

export async function saveDashboardLayoutConfig(
  supabase: SupabaseServerClient,
  userId: string,
  pageKey: DashboardPageKey,
  config: DashboardLayoutConfig,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  const normalized = normalizeLayoutConfig(config);

  try {
    const { error } = await supabase.from("dashboard_layout_configs").upsert(
      {
        user_id: userId,
        page_key: pageKey,
        layout: normalized,
      },
      { onConflict: "user_id,page_key" },
    );

    if (error) {
      logLayoutFailure("save_failed", {
        userId,
        pageKey,
        ...serializeSupabaseError(error),
      });
      return { ok: false, message: "Unable to save dashboard layout." };
    }

    return { ok: true };
  } catch (caught: unknown) {
    logLayoutFailure("save_exception", {
      userId,
      pageKey,
      ...serializeSupabaseError(caught),
    });
    return { ok: false, message: "Unable to save dashboard layout." };
  }
}

export async function deleteDashboardLayoutConfig(
  supabase: SupabaseServerClient,
  userId: string,
  pageKey: DashboardPageKey,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  try {
    const { error } = await supabase
      .from("dashboard_layout_configs")
      .delete()
      .eq("user_id", userId)
      .eq("page_key", pageKey);

    if (error) {
      logLayoutFailure("delete_failed", {
        userId,
        pageKey,
        ...serializeSupabaseError(error),
      });
      return { ok: false, message: "Unable to reset dashboard layout." };
    }

    return { ok: true };
  } catch (caught: unknown) {
    logLayoutFailure("delete_exception", {
      userId,
      pageKey,
      ...serializeSupabaseError(caught),
    });
    return { ok: false, message: "Unable to reset dashboard layout." };
  }
}
