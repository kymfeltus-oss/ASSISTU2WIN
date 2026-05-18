import { fetchExecutiveLeads } from "@/lib/admin/executive-leads";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Command Center — Leads",
  description: "Executive recruitment intelligence and lead tracking.",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default async function AdminLeadsPage() {
  const { leads, errorMessage } = await fetchExecutiveLeads();

  return (
    <div className="min-h-dvh w-full min-w-0 app-overflow-x-clip bg-slate-950 text-slate-200">
      <div className="app-page space-y-8 py-[var(--app-content-pad-block)]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#00F2FE] uppercase">
              AssistU2Win
            </p>
            <h1 className="text-4xl font-bold tracking-tighter text-white">
              Command Center
            </h1>
            <p className="font-medium text-[#00F2FE]">
              Recruitment Intelligence &amp; Lead Tracking
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-right text-xs tracking-widest text-slate-500 uppercase">
              Live Pipeline Status
            </p>
            <p className="text-sm font-semibold text-white">
              {leads.length} active buyer{leads.length === 1 ? "" : "s"}
            </p>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#00F2FE] hover:text-[#00F2FE]/80"
            >
              ← Agent dashboard
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-800/50 text-xs tracking-widest text-slate-400 uppercase">
                  <th className="p-4">Lead / Client Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Agreement</th>
                  <th className="p-4">Preferences</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-sm text-slate-500"
                    >
                      No leads in the pipeline yet. QR intake submissions will
                      appear here in real time.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="group transition-colors hover:bg-[#00F2FE]/5"
                    >
                      <td className="p-4 font-semibold text-white">
                        {lead.lead_name}
                      </td>
                      <td className="p-4 text-slate-400">
                        {lead.email_address ?? "—"}
                      </td>
                      <td className="p-4">
                        <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
                          {lead.lead_source}
                        </span>
                      </td>
                      <td className="p-4">
                        {lead.rep_agreement_pending ? (
                          <span className="text-xs text-amber-400">● Pending</span>
                        ) : (
                          <span className="text-xs text-[#00F2FE]">● Signed</span>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        {lead.hasCommunicationPreferences ? (
                          <span className="text-[#00F2FE]">✅ Captured</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 text-right text-xs text-slate-500">
                        {formatTimestamp(lead.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

