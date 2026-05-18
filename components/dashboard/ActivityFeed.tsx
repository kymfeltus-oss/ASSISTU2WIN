"use client";

import { CARD_NORMAL, MUTED } from "@/components/dashboard/AgentCommandShell";
import { Eye, FileText, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type ActivityType = "feedback" | "offer" | "listing" | "showing" | "update";

export type Activity = {
  readonly id: string;
  readonly type: ActivityType;
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
  readonly property?: string;
};

const TYPE_META: Record<
  ActivityType,
  { readonly Icon: LucideIcon; readonly color: string; readonly bg: string }
> = {
  feedback: {
    Icon: MessageSquare,
    color: "var(--violet)",
    bg: "rgba(167, 139, 250, 0.15)",
  },
  offer: {
    Icon: FileText,
    color: "var(--gold)",
    bg: "rgba(251, 191, 36, 0.15)",
  },
  listing: {
    Icon: Star,
    color: "var(--cyan)",
    bg: "rgba(0, 242, 254, 0.12)",
  },
  showing: {
    Icon: Eye,
    color: "var(--cyan)",
    bg: "rgba(0, 242, 254, 0.12)",
  },
  update: {
    Icon: MessageSquare,
    color: "var(--violet)",
    bg: "rgba(167, 139, 250, 0.15)",
  },
};

const CARD_SHADOW =
  "0 4px 16px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

type ActivityFeedProps = {
  readonly activities: readonly Activity[];
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <section className={`${CARD_NORMAL} p-4 sm:p-5`} style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[color:var(--cyan)]"
          aria-hidden
        />
        <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase">
          Live activity
        </p>
      </div>
      <h2 className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
        MLS &amp; showing alerts
      </h2>
      <ul className="app-panel-scroll mt-4 space-y-2 pr-1">
        {activities.map((item) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.Icon;
          return (
            <li key={item.id}>
              <Link
                href={`/dashboard/activity/${item.id}`}
                className="flex gap-3 rounded-xl border border-[color:var(--line)] bg-[#0b1020]/50 p-3 transition duration-300 hover:border-[color:var(--cyan)]/30"
                style={{ boxShadow: CARD_SHADOW }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[color:var(--text-primary)]">
                    {item.title}
                  </span>
                  {item.property ? (
                    <span className={`mt-0.5 block text-[11px] ${MUTED}`}>{item.property}</span>
                  ) : null}
                  <span className={`mt-1 block text-[11px] leading-snug ${MUTED}`}>
                    {item.description}
                  </span>
                  <span className={`mt-1 block text-[10px] ${MUTED}`}>{item.timestamp}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
