"use client";

import { adminIntakeTheme } from "@/components/leads/intake/admin-intake-theme";
import {
  generateClientInviteUrl,
  generateLeadQRUrl,
} from "@/lib/qr-service";
import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export type QrGeneratorLeadOption = {
  readonly id: string;
  readonly lead_name: string;
};

type GeneratorMode = "marketing" | "client";

type AdminQRGeneratorProps = {
  readonly leads: readonly QrGeneratorLeadOption[];
};

export default function AdminQRGenerator({ leads }: AdminQRGeneratorProps) {
  const [mode, setMode] = useState<GeneratorMode>("marketing");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [campaign, setCampaign] = useState("");
  const [location, setLocation] = useState("");

  const marketingUrl = useMemo(() => {
    if (campaign.trim().length === 0 || location.trim().length === 0) return null;
    try {
      return generateLeadQRUrl(campaign, location);
    } catch {
      return null;
    }
  }, [campaign, location]);

  const clientInviteUrl = useMemo(() => {
    if (selectedLeadId.trim().length === 0) return null;
    try {
      return generateClientInviteUrl(selectedLeadId);
    } catch {
      return null;
    }
  }, [selectedLeadId]);

  const activeUrl = mode === "marketing" ? marketingUrl : clientInviteUrl;

  return (
    <div className={`${adminIntakeTheme.panel} max-w-xl p-4 text-[#F8FAFC] sm:p-5`}>
      <header className={adminIntakeTheme.sectionHeader}>
        <h2 className={adminIntakeTheme.sectionTitle}>QR generator</h2>
        <p className={adminIntakeTheme.sectionSubtitle}>
          Marketing scan for lead intake, or client invite for My Sanctuary.
        </p>
      </header>

      <div className="mb-5 flex gap-2 border-b border-[#1E2A44] pb-3">
        <button
          type="button"
          onClick={() => setMode("marketing")}
          className={`rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase transition ${
            mode === "marketing"
              ? "bg-[rgba(0,242,254,0.12)] text-[#00F2FE] ring-1 ring-[#00F2FE]/35"
              : "text-[#94A3B8] hover:text-[#F8FAFC]"
          }`}
        >
          Marketing intake
        </button>
        <button
          type="button"
          onClick={() => setMode("client")}
          className={`rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase transition ${
            mode === "client"
              ? "bg-[rgba(0,242,254,0.12)] text-[#00F2FE] ring-1 ring-[#00F2FE]/35"
              : "text-[#94A3B8] hover:text-[#F8FAFC]"
          }`}
        >
          Client portal invite
        </button>
      </div>

      {mode === "marketing" ? (
        <div className="space-y-3">
          <label className="block min-w-0">
            <span className={adminIntakeTheme.label}>Campaign name</span>
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="Open House, Facebook Ad…"
              className={adminIntakeTheme.input}
            />
          </label>
          <label className="block min-w-0">
            <span className={adminIntakeTheme.label}>Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Frisco Town Square"
              className={adminIntakeTheme.input}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block min-w-0">
            <span className={adminIntakeTheme.label}>Active buyer</span>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className={adminIntakeTheme.select}
            >
              <option value="">Select a lead to invite…</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.lead_name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] leading-snug text-[#94A3B8]">
            Links the new account to home-buying milestones in My Sanctuary.
          </p>
        </div>
      )}

      {activeUrl ? (
        <div className="mt-6 flex flex-col items-center rounded-xl bg-white p-4">
          <QRCodeCanvas value={activeUrl} size={180} level="M" includeMargin />
          <p className="mt-3 max-w-full font-mono text-[10px] leading-snug break-all text-center text-[#0B1020]">
            {activeUrl}
          </p>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(activeUrl)}
            className="mt-3 rounded-lg border border-[#1E2A44] px-3 py-1.5 text-xs font-semibold text-[#0B1020] hover:bg-[#F1F5F9]"
          >
            Copy URL
          </button>
        </div>
      ) : (
        <p className="mt-6 text-xs text-[#94A3B8]">
          {mode === "marketing"
            ? "Enter campaign and location to generate a marketing QR."
            : "Select a lead to generate a client portal invite QR."}
        </p>
      )}
    </div>
  );
}
