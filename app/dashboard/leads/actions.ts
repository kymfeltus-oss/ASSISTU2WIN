"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { type DealStage, parseDealStage } from "@/lib/deal-stage";

function getTrimmedString(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getOptionalTrimmedString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function parseEstimatedValue(raw: string | null): number {
  if (raw === null || raw.trim() === "") return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function resolveStage(formData: FormData): DealStage {
  const raw = formData.get("stage");
  const parsed = parseDealStage(raw);
  return parsed ?? "INTAKE";
}

export async function createOpportunity(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error(
      "[LEAD_ACTION_UNAUTHORIZED]: Must be signed in to log pipeline leads.",
    );
  }

  const title = getTrimmedString(formData, "title");
  const company = getTrimmedString(formData, "company");
  const estimatedField = formData.get("estimated_value");
  const rawValue =
    typeof estimatedField === "string" ? estimatedField : null;
  const stage: DealStage = resolveStage(formData);
  const notesRaw = getOptionalTrimmedString(formData, "notes");
  const notes = notesRaw.length > 0 ? notesRaw : null;

  if (!title || !company) {
    throw new Error("Title and company are required.");
  }

  const estimated_value = parseEstimatedValue(rawValue);

  try {
    const { error } = await supabase.from("opportunities").insert({
      user_id: user.id,
      title,
      company,
      estimated_value,
      stage,
      notes,
    });

    if (error) throw error;
  } catch (error: unknown) {
    console.error("[LEAD_CREATION_FAILURE]", { error });
    throw new Error("Failed to create opportunity entry.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}

export async function updateOpportunityStage(
  id: string,
  targetStage: DealStage,
  ..._args: unknown[]
) {
  void _args;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error(
      "[LEAD_ACTION_UNAUTHORIZED]: Must be authenticated.",
    );
  }

  try {
    const { error } = await supabase
      .from("opportunities")
      .update({
        stage: targetStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  } catch (error: unknown) {
    console.error("[LEAD_STAGE_UPDATE_FAILURE]", { error });
    throw new Error("Failed to transition opportunity pipeline stage.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}
