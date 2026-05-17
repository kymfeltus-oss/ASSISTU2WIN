"use client";

import { createClient } from "@/lib/supabase/client";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import {
  coerceActivityEvent,
  DEFAULT_ACTIVITY_FEED_MAX_ITEMS,
  formatActivityTimestamp,
  formatActivityTypeLabel,
  formatLeadDisplayName,
  hasActivityMetadata,
  mergeActivityEvents,
  type ActivityEvent,
} from "@/lib/leads/activity-feed";
import { useCallback, useEffect, useRef, useState } from "react";

export type ActivityFeedProps = {
  readonly initialEvents: readonly ActivityEvent[];
  readonly maxItems?: number;
};

function logActivityFeedWarning(
  event: string,
  context: Record<string, unknown>,
): void {
  console.warn(`[LEADS_ACTIVITY_FEED] ${event} ${safeJsonStringify(context)}`);
}

type ActivityFeedRowProps = {
  readonly event: ActivityEvent;
};

function ActivityFeedRow({ event }: ActivityFeedRowProps) {
  const leadLabel = formatLeadDisplayName(event.lead_name);
  const typeLabel = formatActivityTypeLabel(event.activity_type);
  const timestamp = formatActivityTimestamp(event.created_at);
  const showMetadata = hasActivityMetadata(event.metadata);

  return (
    <li className="border-b border-slate-800/50 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-slate-100">
            <span>{typeLabel}</span>
            <span className="text-slate-500"> · </span>
            <span className="text-slate-300">{leadLabel}</span>
          </p>
          {event.description ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
              {event.description}
            </p>
          ) : null}
          {showMetadata ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Details
              </summary>
              <pre className="mt-2 max-h-28 overflow-auto rounded-md border border-slate-800/80 bg-slate-950/60 p-2 text-[10px] leading-relaxed text-slate-400">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
        <time
          dateTime={event.created_at}
          className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500"
        >
          {timestamp}
        </time>
      </div>
    </li>
  );
}

export function ActivityFeed({
  initialEvents,
  maxItems = DEFAULT_ACTIVITY_FEED_MAX_ITEMS,
}: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(() => [...initialEvents]);
  const leadNamesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setEvents(mergeActivityEvents([], [...initialEvents], maxItems));
  }, [initialEvents, maxItems]);

  const enrichLeadName = useCallback(
    async (event: ActivityEvent): Promise<ActivityEvent> => {
      if (event.lead_name?.trim() || !event.lead_id) {
        return event;
      }

      const cached = leadNamesRef.current.get(event.lead_id);
      if (cached) {
        return { ...event, lead_name: cached };
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("leads")
          .select("lead_name")
          .eq("id", event.lead_id)
          .maybeSingle();

        if (error) {
          logActivityFeedWarning("lead_name_lookup_failed", {
            leadId: event.lead_id,
            activityId: event.id,
            ...serializeSupabaseError(error),
          });
          return event;
        }

        const name =
          typeof data?.lead_name === "string" && data.lead_name.trim().length > 0
            ? data.lead_name.trim()
            : null;

        if (name) {
          leadNamesRef.current.set(event.lead_id, name);
        }

        return { ...event, lead_name: name };
      } catch (caught: unknown) {
        logActivityFeedWarning("lead_name_lookup_exception", {
          leadId: event.lead_id,
          activityId: event.id,
          ...serializeSupabaseError(caught),
        });
        return event;
      }
    },
    [],
  );

  const applyIncoming = useCallback(
    (incoming: ActivityEvent) => {
      void enrichLeadName(incoming).then((enriched) => {
        setEvents((current) => mergeActivityEvents(current, [enriched], maxItems));
      });
    },
    [enrichLeadName, maxItems],
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("activity-logs-leads-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const parsed = coerceActivityEvent(payload.new);
          if (parsed) {
            applyIncoming(parsed);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "activity_logs" },
        (payload) => {
          const parsed = coerceActivityEvent(payload.new);
          if (parsed) {
            applyIncoming(parsed);
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          logActivityFeedWarning("realtime_subscription_degraded", {
            status,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyIncoming]);

  return (
    <section
      aria-label="Recent activity"
      className="rounded-2xl border border-slate-800/60 bg-slate-950/30"
    >
      <div className="border-b border-slate-800/60 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Activity feed
        </h3>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          No recent activity.
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto px-4 custom-scrollbar">
          {events.map((event) => (
            <ActivityFeedRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
