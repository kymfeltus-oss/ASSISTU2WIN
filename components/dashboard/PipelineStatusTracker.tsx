"use client";

import { CARD_NORMAL } from "@/components/dashboard/AgentCommandShell";
import Link from "next/link";

type PipelineStageVisual = {
  readonly label: string;
  readonly count: number;
  readonly percent: number;
  readonly href: string;
  readonly gradient: string;
  readonly borderColor: string;
  readonly textGradient: string;
};

const STAGES: readonly PipelineStageVisual[] = [
  {
    label: "Leads",
    count: 24,
    percent: 100,
    href: "/dashboard/pipeline/leads",
    gradient: "linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(14, 165, 233, 0.08) 100%)",
    borderColor: "rgba(0, 242, 254, 0.4)",
    textGradient: "linear-gradient(135deg, #00F2FE 0%, #0EA5E9 100%)",
  },
  {
    label: "Active Clients",
    count: 12,
    percent: 72,
    href: "/dashboard/pipeline/active",
    gradient:
      "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)",
    borderColor: "rgba(167, 139, 250, 0.4)",
    textGradient: "linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)",
  },
  {
    label: "Under Contract",
    count: 5,
    percent: 45,
    href: "/dashboard/pipeline/contracts",
    gradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%)",
    borderColor: "rgba(251, 191, 36, 0.4)",
    textGradient: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
  },
  {
    label: "Closed This Month",
    count: 8,
    percent: 58,
    href: "/dashboard/pipeline/closed",
    gradient:
      "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)",
    borderColor: "rgba(167, 139, 250, 0.4)",
    textGradient: "linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)",
  },
] as const;

const CARD_SHADOW =
  "0 4px 16px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

export function PipelineStatusTracker() {
  return (
    <section className={`${CARD_NORMAL} overflow-hidden p-4 sm:p-5`} style={{ boxShadow: CARD_SHADOW }}>
      <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase">
        Pipeline status
      </p>
      <h2 className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
        Buyer funnel
      </h2>
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage) => (
          <Link
            key={stage.label}
            href={stage.href}
            className="flex min-w-0 flex-col rounded-xl border p-4 transition duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02]"
            style={{
              background: stage.gradient,
              borderColor: stage.borderColor,
              boxShadow: CARD_SHADOW,
            }}
          >
            <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase">
              {stage.label}
            </p>
            <p
              className="mt-2 text-[clamp(1.5rem,4vw,2rem)] leading-none font-extrabold"
              style={{
                background: stage.textGradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {stage.count}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20" aria-hidden>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${stage.percent}%`,
                  background: stage.textGradient,
                }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
