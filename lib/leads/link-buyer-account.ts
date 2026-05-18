import { createServiceClient } from "@/lib/supabase/service";

const ACTIVE_CLIENT_STATUS = "Active Client" as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export type LinkBuyerAccountResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/**
 * After client portal signup, attach the auth user to the lead record (service role).
 */
export async function linkLeadToBuyerAccount(
  leadId: string,
  buyerUserId: string,
): Promise<LinkBuyerAccountResult> {
  const trimmedLeadId = leadId.trim();
  const trimmedUserId = buyerUserId.trim();

  if (!isUuid(trimmedLeadId) || !isUuid(trimmedUserId)) {
    return { ok: false, message: "Invalid lead or user reference." };
  }

  try {
    const supabase = createServiceClient();
    const { data: existing, error: fetchError } = await supabase
      .from("leads")
      .select("id, buyer_user_id")
      .eq("id", trimmedLeadId)
      .maybeSingle();

    if (fetchError) {
      console.error("[LINK_BUYER_ACCOUNT_FETCH]", {
        leadId: trimmedLeadId,
        message: fetchError.message,
      });
      return { ok: false, message: "Unable to verify lead record." };
    }

    if (!existing) {
      return { ok: false, message: "Lead not found." };
    }

    if (
      existing.buyer_user_id &&
      String(existing.buyer_user_id) !== trimmedUserId
    ) {
      return { ok: false, message: "This lead is already linked to another account." };
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        buyer_user_id: trimmedUserId,
        current_status: ACTIVE_CLIENT_STATUS,
      })
      .eq("id", trimmedLeadId);

    if (updateError) {
      console.error("[LINK_BUYER_ACCOUNT_UPDATE]", {
        leadId: trimmedLeadId,
        message: updateError.message,
      });
      return { ok: false, message: "Unable to link account to lead." };
    }

    return { ok: true };
  } catch (error: unknown) {
    console.error("[LINK_BUYER_ACCOUNT_EXCEPTION]", { leadId: trimmedLeadId, error });
    return { ok: false, message: "Unable to link account to lead." };
  }
}
