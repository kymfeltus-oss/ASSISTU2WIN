"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PresignedUploadPayload = {
  token: string;
  path: string;
  url: string;
};

function sanitizeFileName(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "attachment";
  const cleaned = base.replace(/[^\w.\-() ]+/g, "_").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : "attachment";
}

export async function getUploadPresignedUrl(
  fileName: string,
  opportunityId: string,
): Promise<PresignedUploadPayload> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("[STORAGE_ACTION_UNAUTHORIZED]: Must be signed in.");
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("id", opportunityId)
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    throw new Error(
      "[STORAGE_ACTION_FORBIDDEN]: Opportunity not found or access denied.",
    );
  }

  const safeName = sanitizeFileName(fileName);
  const filePath = `${user.id}/${opportunityId}/${Date.now()}_${safeName}`;

  try {
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUploadUrl(filePath);

    if (error) throw error;
    if (!data?.token || !data.path || !data.signedUrl) {
      throw new Error("Incomplete presigned upload response.");
    }

    return { token: data.token, path: data.path, url: data.signedUrl };
  } catch (err) {
    console.error("[STORAGE_UPLOAD_PREPARATION_FAILURE]:", err);
    throw new Error("Failed to initialize secure upload pipeline.");
  }
}

export async function attachFileToOpportunity(
  opportunityId: string,
  filePath: string,
  fileName: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("[STORAGE_ACTION_UNAUTHORIZED]");
  }

  const expectedPrefix = `${user.id}/${opportunityId}/`;
  if (!filePath.startsWith(expectedPrefix)) {
    throw new Error("[STORAGE_ACTION_FORBIDDEN]: Invalid file path scope.");
  }

  try {
    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      opportunity_id: opportunityId,
      action_type: "INGEST",
      description: `Uploaded and attached contract document: "${sanitizeFileName(fileName)}" onto the opportunity tracking record.`,
    });

    if (auditError) throw auditError;

    const { error: updateError } = await supabase
      .from("opportunities")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", opportunityId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;
  } catch (err) {
    console.error("[STORAGE_METADATA_LINK_FAILURE]:", err);
    throw new Error("Failed to link attachment metadata to opportunity.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}
