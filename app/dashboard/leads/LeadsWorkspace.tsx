"use client";

import type { LeadRecord, LoanType } from "@/lib/leads/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopilotIntakeForm } from "./CopilotIntakeForm";

type Props = {
  readonly leads: readonly LeadRecord[];
  readonly selectedLeadId: string | null;
};

function formatBudget(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function loanTypeBadgeClass(loanType: LoanType): string {
  switch (loanType) {
    case "FHA":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "VA":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
    case "USDA":
      return "border-lime-500/30 bg-lime-500/10 text-lime-300";
    case "Conventional":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "Cash":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Pre-Approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "Cash":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "Denied":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "No Pre-Approval":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "Active Searching":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "Under Contract":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    case "Closed":
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
    default:
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
}

export function LeadsWorkspace({ leads, selectedLeadId }: Props) {
  const router = useRouter();
  const [rawExpanded, setRawExpanded] = useState(false);

  const selectedLead =
    leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null;

  const selectLead = (leadId: string) => {
    setRawExpanded(false);
    router.push(`/dashboard/leads?lead=${leadId}`, { scroll: false });
  };

  return (
    <div className="grid min-h-[560px] grid-cols-1 gap-6 lg:grid-cols-5">
      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-md lg:col-span-3">
        <div className="border-b border-slate-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Admin Lead Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            {leads.length} active buyer record{leads.length === 1 ? "" : "s"}
          </p>
        </div>

        {leads.length === 0 ? (
          <CopilotIntakeForm />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-900/60 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Lead / Client Name</th>
                  <th className="px-4 py-2.5">Lead Source</th>
                  <th className="px-4 py-2.5">Target Budget</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => selectLead(lead.id)}
                      className={`cursor-pointer border-t border-slate-700/60 transition-colors ${
                        isSelected
                          ? "bg-blue-500/10 hover:bg-blue-500/15"
                          : "hover:bg-slate-700/30"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {lead.lead_name}
                        {lead.is_ai_parsed ? (
                          <span className="ml-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 uppercase">
                            AI
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {lead.lead_source}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400">
                        {formatBudget(lead.target_budget)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(lead.current_status)}`}
                        >
                          {lead.current_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col rounded-xl border border-slate-700 bg-slate-800 shadow-md lg:col-span-2">
        <div className="border-b border-slate-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">AI Copilot Insight</h2>
          <p className="text-xs text-slate-400">
            Parsed buyer intelligence and source verification
          </p>
        </div>

        {!selectedLead ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
            Select a lead from the pipeline table to inspect AI output.
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Summary
              </p>
              <p className="text-sm leading-relaxed text-slate-200">
                {selectedLead.ai_summary ??
                  "No AI summary available for this record yet."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <PreferenceCard
                label="Neighborhoods"
                value={
                  selectedLead.ai_extracted_preferences.target_neighborhoods
                    .length > 0
                    ? selectedLead.ai_extracted_preferences.target_neighborhoods.join(
                        ", ",
                      )
                    : "Not specified"
                }
              />
              <PreferenceCard
                label="Beds"
                value={
                  selectedLead.ai_extracted_preferences.min_bedrooms !== null
                    ? String(selectedLead.ai_extracted_preferences.min_bedrooms)
                    : "Not specified"
                }
              />
              <div className="rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
                <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  Financing
                </p>
                <p className="mt-1 text-xs leading-snug text-slate-200">
                  {selectedLead.ai_extracted_preferences.pre_approval_status ??
                    "Not specified"}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${loanTypeBadgeClass(selectedLead.ai_extracted_preferences.loan_type)}`}
                >
                  {selectedLead.ai_extracted_preferences.loan_type}
                </span>
              </div>
            </div>

            {(selectedLead.phone_number || selectedLead.email_address) && (
              <div className="rounded-lg border border-slate-700/80 bg-slate-900/50 p-3 text-xs text-slate-300">
                {selectedLead.phone_number ? (
                  <p>
                    <span className="font-semibold text-slate-500">Phone:</span>{" "}
                    {selectedLead.phone_number}
                  </p>
                ) : null}
                {selectedLead.email_address ? (
                  <p className={selectedLead.phone_number ? "mt-1" : ""}>
                    <span className="font-semibold text-slate-500">Email:</span>{" "}
                    {selectedLead.email_address}
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-auto rounded-lg border border-slate-700/80 bg-slate-900/40">
              <button
                type="button"
                onClick={() => setRawExpanded((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:text-white"
              >
                <span>Original raw input</span>
                <span className="text-slate-500">{rawExpanded ? "▾" : "▸"}</span>
              </button>
              {rawExpanded ? (
                <pre className="max-h-48 overflow-auto border-t border-slate-700/60 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-400">
                  {selectedLead.raw_transcript ?? "No raw transcript stored."}
                </pre>
              ) : null}
            </div>

            <p className="text-[10px] text-slate-500">
              Ingested{" "}
              {new Date(selectedLead.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function PreferenceCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
      <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xs leading-snug text-slate-200">{value}</p>
    </div>
  );
}
