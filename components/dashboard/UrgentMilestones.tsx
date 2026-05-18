"use client";

import { CARD_NORMAL, MUTED } from "@/components/dashboard/AgentCommandShell";
import { AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

export type MilestoneUrgency = "critical" | "warning" | "normal";

export type Milestone = {
  readonly id: string;
  readonly title: string;
  readonly property: string;
  readonly dueTime: string;
  readonly urgency: MilestoneUrgency;
};

const CARD_SHADOW =
  "0 4px 16px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

const URGENCY_STYLES: Record<
  MilestoneUrgency,
  { readonly border: string; readonly iconBg: string; readonly badge: string }
> = {
  critical: {
    border: "var(--coral)",
    iconBg: "rgba(251, 113, 133, 0.2)",
    badge: "Critical",
  },
  warning: {
    border: "var(--gold)",
    iconBg: "rgba(251, 191, 36, 0.2)",
    badge: "Warning",
  },
  normal: {
    border: "var(--violet)",
    iconBg: "rgba(167, 139, 250, 0.2)",
    badge: "Scheduled",
  },
};

type UrgentMilestonesProps = {
  readonly milestones: readonly Milestone[];
};

export function UrgentMilestones({ milestones }: UrgentMilestonesProps) {
  return (
    <section className={`${CARD_NORMAL} p-4 sm:p-5`} style={{ boxShadow: CARD_SHADOW }}>
      <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase">
        Critical deadlines
      </p>
      <h2 className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
        Urgent milestones
      </h2>
      <ul className="mt-4 space-y-2">
        {milestones.map((item) => {
          const style = URGENCY_STYLES[item.urgency];
          const Icon = item.urgency === "critical" ? AlertCircle : Clock;
          return (
            <li key={item.id}>
              <Link
                href={`/dashboard/milestones/${item.id}`}
                className="flex items-start gap-3 rounded-xl border border-[color:var(--line)] bg-[#0b1020]/60 p-3 transition duration-300 ease-in-out hover:translate-x-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: style.border,
                  boxShadow: CARD_SHADOW,
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: style.iconBg }}
                >
                  <Icon className="h-4 w-4" style={{ color: style.border }} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[color:var(--text-primary)]">
                      {item.title}
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                      style={{
                        background: style.iconBg,
                        color: style.border,
                      }}
                    >
                      {style.badge}
                    </span>
                  </span>
                  <span className={`mt-0.5 block text-[11px] ${MUTED}`}>{item.property}</span>
                  <span className={`mt-1 block text-[10px] font-medium ${MUTED}`}>
                    {item.dueTime}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
