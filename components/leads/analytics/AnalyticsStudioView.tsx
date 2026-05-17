"use client";

import { LeadAnalysisView } from "@/app/dashboard/leads/LeadAnalysisView";
import { useLeads } from "@/components/leads/LeadsProvider";
import { spatial } from "@/components/leads/spatial/spatial-styles";
import { useState } from "react";

export function AnalyticsStudioView() {
  const { leads, loading } = useLeads();
  const [selectedZipCode, setSelectedZipCode] = useState("75024");
  const [generatedReportLink, setGeneratedReportLink] = useState<string | null>(null);

  const handleGenerateReport = () => {
    const zip = selectedZipCode.trim() || "75024";
    setGeneratedReportLink(
      `https://www.google.com/search?q=${encodeURIComponent(`DFW housing market report ${zip}`)}`,
    );
  };

  if (loading) {
    return (
      <p className="px-8 py-16 text-sm text-[var(--spatial-text-secondary)]">
        Preparing analytics…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-8">
      <section className="mb-10 space-y-3 pt-2">
        <p className={spatial.label}>Revenue intelligence</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          How do I make more money?
        </h1>
        <p className={`max-w-2xl ${spatial.body}`}>
          Strategic, editorial analytics — separate from your daily command center.
        </p>
      </section>
      <LeadAnalysisView
        leads={leads}
        selectedZipCode={selectedZipCode}
        onZipCodeChange={setSelectedZipCode}
        generatedReportLink={generatedReportLink}
        onGenerateReport={handleGenerateReport}
      />
    </div>
  );
}
