"use client";

import { LeadDetailSlideOver } from "@/components/leads/pipeline/LeadDetailSlideOver";
import { LeadGalleryCard } from "@/components/leads/pipeline/LeadGalleryCard";
import { useLeads } from "@/components/leads/LeadsProvider";
import { spatial } from "@/components/leads/spatial/spatial-styles";
import type { LeadRecord } from "@/lib/leads/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function PipelineView() {
  const {
    leads,
    loading,
    selectedLead,
    setSelectedLead,
    statusMessage,
    setStatusMessage,
    refreshLeads,
  } = useLeads();
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (selectedLead) {
      setPanelOpen(true);
    }
  }, [selectedLead?.id]);

  const openLead = (lead: LeadRecord) => {
    setSelectedLead(lead);
    setPanelOpen(true);
  };

  const handleSaved = async (updated: LeadRecord) => {
    setSelectedLead(updated);
    await refreshLeads();
  };

  if (loading) {
    return (
      <p className="px-8 py-16 text-sm text-[var(--spatial-text-secondary)]">
        Loading pipeline…
      </p>
    );
  }

  return (
    <div className="app-page pb-24">
      <section className="mb-8 space-y-2">
        <p className={spatial.label}>Leads pipeline</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Active buyer gallery
        </h1>
        <p className={`max-w-2xl ${spatial.body}`}>
          Card-first workspace with slide-over detail — no spreadsheets, no noise.
        </p>
      </section>

      {leads.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-[var(--spatial-text-secondary)]">No active buyers.</p>
          <Link
            href="/dashboard/leads/intake"
            className="mt-4 text-xs font-semibold tracking-wide text-cyan-400 uppercase"
          >
            Add buyer
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {leads.map((lead) => (
            <LeadGalleryCard
              key={lead.id}
              lead={lead}
              selected={selectedLead?.id === lead.id}
              onSelect={() => openLead(lead)}
            />
          ))}
        </div>
      )}

      {selectedLead ? (
        <LeadDetailSlideOver
          lead={selectedLead}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSaved={handleSaved}
          statusMessage={statusMessage}
          setStatusMessage={setStatusMessage}
        />
      ) : null}
    </div>
  );
}
