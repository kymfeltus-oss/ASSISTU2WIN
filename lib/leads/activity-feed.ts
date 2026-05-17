import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ActivityType =
  | "qr_scan"
  | "link_click"
  | "video_join"
  | "note_added"
  | string;

export type ActivityEvent = {
  readonly id: string;
  readonly lead_id: string | null;
  readonly lead_name: string | null;
  readonly activity_type: ActivityType;
  readonly description: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
};

export const DEFAULT_ACTIVITY_FEED_MAX_ITEMS = 50;

const ACTIVITY_LOG_SELECT = `
  id,
  lead_id,
  activity_type,
  description,
  metadata,
  created_at,
  leads (
    lead_name
  )
`;

const ACTIVITY_TYPE_LABELS: Readonly<Record<string, string>> = {
  qr_scan: "QR scan",
  link_click: "Link click",
  video_join: "Video join",
  note_added: "Note added",
};

function logActivityFeedFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`[LEADS_ACTIVITY_FEED] ${event} ${safeJsonStringify(context)}`);
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readLeadNameFromRow(row: Record<string, unknown>): string | null {
  const leads = row.leads;
  if (leads === null || leads === undefined) {
    return null;
  }

  const record = Array.isArray(leads)
    ? (leads[0] as Record<string, unknown> | undefined)
    : (leads as Record<string, unknown>);

  if (!record) {
    return null;
  }

  const name = record.lead_name;
  if (typeof name === "string") {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

/** Coerces a PostgREST row (optionally joined with `leads.lead_name`). */
export function coerceActivityEvent(row: unknown): ActivityEvent | null {
  if (row === null || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const activityType =
    typeof record.activity_type === "string" ? record.activity_type : null;
  const createdAt =
    typeof record.created_at === "string" ? record.created_at : null;

  if (!id || !activityType || !createdAt) {
    return null;
  }

  const leadId =
    typeof record.lead_id === "string"
      ? record.lead_id
      : record.lead_id === null
        ? null
        : null;

  const description =
    typeof record.description === "string"
      ? record.description
      : record.description === null
        ? null
        : null;

  return {
    id,
    lead_id: leadId,
    lead_name: readLeadNameFromRow(record),
    activity_type: activityType,
    description,
    metadata: parseMetadata(record.metadata),
    created_at: createdAt,
  };
}

export function formatActivityTypeLabel(activityType: ActivityType): string {
  const known = ACTIVITY_TYPE_LABELS[activityType];
  if (known) {
    return known;
  }

  return activityType
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatLeadDisplayName(leadName: string | null): string {
  if (leadName && leadName.trim().length > 0) {
    return leadName.trim();
  }
  return "Lead";
}

/**
 * Relative time when recent; otherwise absolute local datetime.
 */
export function formatActivityTimestamp(
  createdAt: string,
  nowMs: number = Date.now(),
): string {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) {
    return "—";
  }

  const diffSec = Math.max(0, Math.floor((nowMs - createdMs) / 1000));

  if (diffSec < 45) {
    return "just now";
  }
  if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)}m ago`;
  }
  if (diffSec < 86_400) {
    return `${Math.floor(diffSec / 3600)}h ago`;
  }
  if (diffSec < 604_800) {
    return `${Math.floor(diffSec / 86_400)}d ago`;
  }

  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hasActivityMetadata(
  metadata: Record<string, unknown> | null,
): boolean {
  return metadata !== null && Object.keys(metadata).length > 0;
}

/** Dedupe by `id`, newest-first, capped to `maxItems`. Later rows win on id collision. */
export function mergeActivityEvents(
  current: readonly ActivityEvent[],
  incoming: readonly ActivityEvent[],
  maxItems: number,
): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();

  for (const event of current) {
    byId.set(event.id, event);
  }
  for (const event of incoming) {
    byId.set(event.id, event);
  }

  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, maxItems);
}

/**
 * Latest engagement events for the leads dashboard (newest first).
 * Joins `leads.lead_name` via `lead_id` — never `leads.name`.
 */
export async function fetchInitialActivityEvents(
  supabase: SupabaseServerClient,
  maxItems: number = DEFAULT_ACTIVITY_FEED_MAX_ITEMS,
): Promise<ActivityEvent[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select(ACTIVITY_LOG_SELECT)
      .order("created_at", { ascending: false })
      .limit(maxItems);

    if (error) {
      logActivityFeedFailure("initial_load_failed", {
        maxItems,
        ...serializeSupabaseError(error),
      });
      return [];
    }

    return (data ?? [])
      .map((row) => coerceActivityEvent(row))
      .filter((row): row is ActivityEvent => row !== null);
  } catch (caught: unknown) {
    logActivityFeedFailure("initial_load_exception", {
      maxItems,
      ...serializeSupabaseError(caught),
    });
    return [];
  }
}
