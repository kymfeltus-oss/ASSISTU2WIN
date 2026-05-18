import { parseCommunicationPreferences } from "@/lib/leads/admin-intake-fields";
import { createServiceClient } from "@/lib/supabase/service";

export type ExecutiveLeadRow = {
  readonly id: string;
  readonly lead_name: string;
  readonly email_address: string | null;
  readonly lead_source: string;
  readonly rep_agreement_pending: boolean;
  readonly hasCommunicationPreferences: boolean;
  readonly created_at: string;
};

function hasCapturedPreferences(raw: unknown): boolean {
  const prefs = parseCommunicationPreferences(raw);
  return Object.values(prefs).some(Boolean);
}

/**
 * Server-only: full pipeline for executive admin (service role; call only after auth).
 */
export async function fetchExecutiveLeads(): Promise<{
  readonly leads: readonly ExecutiveLeadRow[];
  readonly errorMessage: string | null;
}> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, lead_name, email_address, lead_source, rep_agreement_pending, communication_preferences, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[EXECUTIVE_LEADS_FETCH]", { message: error.message });
      return { leads: [], errorMessage: error.message };
    }

    const leads: ExecutiveLeadRow[] = (data ?? []).map((row) => ({
      id: String(row.id),
      lead_name: String(row.lead_name ?? ""),
      email_address:
        typeof row.email_address === "string" ? row.email_address : null,
      lead_source:
        typeof row.lead_source === "string" && row.lead_source.trim().length > 0
          ? row.lead_source.trim()
          : "Direct",
      rep_agreement_pending: row.rep_agreement_pending === true,
      hasCommunicationPreferences: hasCapturedPreferences(
        row.communication_preferences,
      ),
      created_at: String(row.created_at ?? new Date().toISOString()),
    }));

    return { leads, errorMessage: null };
  } catch (error: unknown) {
    console.error("[EXECUTIVE_LEADS_FETCH_EXCEPTION]", { error });
    return {
      leads: [],
      errorMessage: "Unable to load the recruitment pipeline.",
    };
  }
}
