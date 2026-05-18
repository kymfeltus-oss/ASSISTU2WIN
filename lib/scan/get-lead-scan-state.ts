import { createServiceClient } from "@/lib/supabase/service";
import { isLeadIdUuid } from "@/lib/scan/lead-cookie";

const ACTIVE_CLIENT_STATUS = "Active Client" as const;

export type LeadScanState = {
  readonly leadId: string;
  readonly isActiveClient: boolean;
};

/**
 * Server-only: resolve whether the scanned lead is an Active Client (buyer portal).
 */
export async function getLeadScanState(leadId: string): Promise<LeadScanState | null> {
  const trimmed = leadId.trim();
  if (!isLeadIdUuid(trimmed)) {
    return null;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select("id, current_status")
      .eq("id", trimmed)
      .maybeSingle();

    if (error) {
      console.error("[SCAN_LEAD_FETCH]", { leadId: trimmed, message: error.message });
      return null;
    }

    if (!data?.id) {
      return null;
    }

    return {
      leadId: String(data.id),
      isActiveClient: data.current_status === ACTIVE_CLIENT_STATUS,
    };
  } catch (error: unknown) {
    console.error("[SCAN_LEAD_FETCH_EXCEPTION]", { leadId: trimmed, error });
    return null;
  }
}
