"use client";

import { adminIntakeTheme } from "@/components/leads/intake/admin-intake-theme";
import { ReadinessRing } from "@/components/leads/spatial/ReadinessRing";

type Props = {
  readonly readiness: number;
  readonly buyerName: string;
  readonly loanType: string;
  readonly purchaseTimeline: string;
  readonly hasPreApproval: boolean;
};

function readinessHint(score: number): { readonly title: string; readonly body: string } {
  if (score >= 80) {
    return {
      title: "High intent",
      body: "Prioritize lender handoff and showing calendar while momentum is strong.",
    };
  }
  if (score >= 60) {
    return {
      title: "Active buyer",
      body: "Confirm budget, timeline, and pre-approval path in the next touchpoint.",
    };
  }
  return {
    title: "Nurture track",
    body: "Capture friction points and schedule a structured follow-up sequence.",
  };
}

export function AdminIntakeSidePanel({
  readiness,
  buyerName,
  loanType,
  purchaseTimeline,
  hasPreApproval,
}: Props) {
  const hint = readinessHint(readiness);
  const displayName = buyerName.trim() || "New buyer file";

  return (
    <aside className={adminIntakeTheme.sidePanel} aria-label="Intake intelligence">
      <p className={adminIntakeTheme.sectionTitle}>Live readiness</p>
      <div className="mt-3 flex flex-col items-center gap-3 lg:items-center">
        <ReadinessRing score={readiness} size={104} />
        <ScoreMeta
          displayName={displayName}
          loanType={loanType}
          purchaseTimeline={purchaseTimeline}
          hasPreApproval={hasPreApproval}
          readiness={readiness}
        />
      </div>

      <div className={`${adminIntakeTheme.innerWell} mt-4`}>
        <p className={`text-[11px] font-bold tracking-wide ${adminIntakeTheme.accentCyan}`}>
          {hint.title}
        </p>
        <p className={`mt-1 text-[11px] leading-snug ${adminIntakeTheme.sectionSubtitle}`}>
          {hint.body}
        </p>
      </div>

      <div className="mt-4">
        <p className={adminIntakeTheme.sectionTitle}>Intake checklist</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-[#94A3B8]">
          <li className="flex gap-2">
            <span className={`shrink-0 ${adminIntakeTheme.accentCyan}`}>•</span>
            Lead / Client Name and Source confirmed
          </li>
          <li className="flex gap-2">
            <span className={`shrink-0 ${adminIntakeTheme.accentCyan}`}>•</span>
            Co-buyer and address captured when applicable
          </li>
          <li className="flex gap-2">
            <span className={`shrink-0 ${adminIntakeTheme.accentCyan}`}>•</span>
            Finance friction logged for lender routing
          </li>
          <li className="flex gap-2">
            <span className={`shrink-0 ${adminIntakeTheme.accentCyan}`}>•</span>
            Communication plan toggles set before save
          </li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-[#00F2FE]/25 bg-[rgba(0,242,254,0.06)] p-3">
        <p
          className={`text-[9px] font-bold tracking-[0.16em] uppercase ${adminIntakeTheme.accentCyan}`}
        >
          Analytics-ready capture
        </p>
        <p className={`mt-1 text-[11px] leading-snug ${adminIntakeTheme.sectionSubtitle}`}>
          Extended fields save to your lead record for reporting and automated follow-up.
        </p>
      </div>
    </aside>
  );
}

function ScoreMeta({
  displayName,
  loanType,
  purchaseTimeline,
  hasPreApproval,
  readiness,
}: {
  readonly displayName: string;
  readonly loanType: string;
  readonly purchaseTimeline: string;
  readonly hasPreApproval: boolean;
  readonly readiness: number;
}) {
  return (
    <div className="min-w-0 w-full text-center">
      <p className="truncate text-sm font-semibold text-[#F8FAFC]">{displayName}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${adminIntakeTheme.accentCyan}`}>
        {readiness}%
      </p>
      <p className={`mt-1 text-[11px] leading-snug ${adminIntakeTheme.sectionSubtitle}`}>
        {loanType} · {purchaseTimeline}
        {hasPreApproval ? " · Pre-approved" : ""}
      </p>
    </div>
  );
}
