"use client";

import { createClient } from "@/lib/supabase/client";
import { coerceLeadRow, type LeadRecord } from "@/lib/leads/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LeadsContextValue = {
  readonly leads: readonly LeadRecord[];
  readonly loading: boolean;
  readonly statusMessage: string | null;
  readonly setStatusMessage: (message: string | null) => void;
  readonly refreshLeads: () => Promise<void>;
  readonly selectedLead: LeadRecord | null;
  readonly setSelectedLead: (lead: LeadRecord | null) => void;
};

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { readonly children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [leads, setLeads] = useState<readonly LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  const refreshLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[LEADS_FETCH_FAILURE]", { message: error.message });
        setStatusMessage("Unable to load buyers.");
        // #region agent log
        fetch("http://127.0.0.1:7764/ingest/a95af5bd-0217-4f46-848b-1173c2c72d98", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3fd78e" },
          body: JSON.stringify({
            sessionId: "3fd78e",
            hypothesisId: "D",
            location: "LeadsProvider.tsx:refreshLeads",
            message: "leads_fetch_error",
            data: { errorMessage: error.message },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return;
      }

      const mapped = (data ?? []).map((row) =>
        coerceLeadRow(row as Record<string, unknown>),
      );
      setLeads(mapped);
      // #region agent log
      fetch("http://127.0.0.1:7764/ingest/a95af5bd-0217-4f46-848b-1173c2c72d98", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3fd78e" },
        body: JSON.stringify({
          sessionId: "3fd78e",
          hypothesisId: "D",
          location: "LeadsProvider.tsx:refreshLeads",
          message: "leads_fetch_ok",
          data: { leadCount: mapped.length },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setSelectedLead((prev) => {
        if (prev) return mapped.find((l) => l.id === prev.id) ?? mapped[0] ?? null;
        return mapped[0] ?? null;
      });
    } catch (error: unknown) {
      console.error("[LEADS_FETCH_EXCEPTION]", { error });
      setStatusMessage("Unable to load buyers.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  const value = useMemo(
    (): LeadsContextValue => ({
      leads,
      loading,
      statusMessage,
      setStatusMessage,
      refreshLeads,
      selectedLead,
      setSelectedLead,
    }),
    [leads, loading, statusMessage, refreshLeads, selectedLead],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) {
    throw new Error("useLeads must be used within LeadsProvider");
  }
  return ctx;
}
