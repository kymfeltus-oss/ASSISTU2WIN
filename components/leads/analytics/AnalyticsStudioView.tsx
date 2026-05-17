"use client";

import {
  LeadAnalysisReportAssistant,
  LeadAnalysisWorkspace,
  useLeadAnalysisMetrics,
} from "@/app/dashboard/leads/LeadAnalysisView";
import { APP_MAIN_GRID, MUTED } from "@/components/dashboard/AgentCommandShell";
import { useLeads } from "@/components/leads/LeadsProvider";
import { useState } from "react";

export function AnalyticsStudioView() {
  const { leads, loading } = useLeads();
  const [selectedZipCode, setSelectedZipCode] = useState("75024");
  const [generatedReportLink, setGeneratedReportLink] = useState<string | null>(null);

  const metrics = useLeadAnalysisMetrics(leads);

  const handleGenerateReport = () => {
    const zip = selectedZipCode.trim() || "75024";
    setGeneratedReportLink(
      `https://www.google.com/search?q=${encodeURIComponent(`DFW housing market report ${zip}`)}`,
    );
  };

  const reportProps = {
    metrics,
    leads,
    selectedZipCode,
    onZipCodeChange: setSelectedZipCode,
    generatedReportLink,
    onGenerateReport: handleGenerateReport,
  };

  if (loading) {
    return <p className={`py-6 text-sm ${MUTED}`}>Preparing analytics...</p>;
  }

  return (
    <div className="analytics-app-print min-w-0">
      <div className={APP_MAIN_GRID}>
        <main className="min-w-0">
          <div className="flex min-w-0 flex-col gap-2">
            <header className="flex min-w-0 items-center justify-between gap-2 border-b border-[#1E2A44] pb-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.2em] text-[#00F2FE]/80 uppercase">
                  Analytics
                </p>
                <h1 className="truncate text-base font-bold tracking-tight text-[#F8FAFC] sm:text-lg">
                  Executive command
                </h1>
              </div>
              <span
                className={`shrink-0 rounded-lg border border-[#1E2A44] bg-[#111827]/80 px-2 py-1 text-[10px] font-semibold ${MUTED}`}
              >
                {metrics.totalLeadsCount} buyers
              </span>
            </header>

            <div className="lg:hidden print:hidden">
              <LeadAnalysisReportAssistant {...reportProps} compact />
            </div>

            <LeadAnalysisWorkspace metrics={metrics} />
          </div>
        </main>

        <div className="hidden min-w-0 lg:block">
          <LeadAnalysisReportAssistant {...reportProps} />
        </div>
      </div>
    </div>
  );
}
