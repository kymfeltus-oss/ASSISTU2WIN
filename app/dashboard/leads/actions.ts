"use server";

import { analyzeOpportunityNotes } from "@/lib/ai-engine";
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
    throw new Error("[LEAD_ACTION_UNAUTHORIZED]: Must be signed in.");
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

  const aiInsights = await analyzeOpportunityNotes(notes);

  try {
    const { data: opt, error } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        title,
        company,
        estimated_value,
        stage,
        notes,
        ai_insights: aiInsights,
      })
      .select("id")
      .single();

    if (error) throw error;

    const ingestDescription = `Ingested new opportunity pipeline record: "${title}" for ${company}.${aiInsights ? " Automated AI matrix suggestions indexed successfully." : ""}`;

    const { error: auditIngestError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: user.id,
        opportunity_id: opt?.id ?? null,
        action_type: "INGEST",
        description: ingestDescription,
      });

    if (auditIngestError) {
      console.error("[AUDIT_LOG_INGEST_FAILURE]", {
        message: auditIngestError.message,
        opportunityId: opt?.id,
      });
    }

    if (aiInsights) {
      const { error: auditAiError } = await supabase.from("audit_logs").insert({
        user_id: user.id,
        opportunity_id: opt?.id ?? null,
        action_type: "AI_ANALYSIS",
        description: `AI recommended stage trajectory: "${aiInsights.suggestedStage}" with a confidence metric of ${(aiInsights.confidenceScore * 100).toFixed(0)}%. Next step: ${aiInsights.nextStepAction}`,
      });

      if (auditAiError) {
        console.error("[AUDIT_LOG_AI_ANALYSIS_FAILURE]", {
          message: auditAiError.message,
          opportunityId: opt?.id,
        });
      }
    }
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
    const { data: currentOpt, error: fetchError } = await supabase
      .from("opportunities")
      .select("title, stage")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("[LEAD_STAGE_PREFETCH]", { message: fetchError.message });
    }

    const { error } = await supabase
      .from("opportunities")
      .update({
        stage: targetStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    const priorStageLabel =
      typeof currentOpt?.stage === "string" ? currentOpt.stage : "UNKNOWN";

    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      opportunity_id: id,
      action_type: "STAGE_TRANSITION",
      description: `Evolved "${currentOpt?.title ?? "Opportunity"}" stage matrix from ${priorStageLabel} to ${targetStage}.`,
    });

    if (auditError) {
      console.error("[AUDIT_LOG_STAGE_FAILURE]", {
        message: auditError.message,
        opportunityId: id,
      });
    }
  } catch (error: unknown) {
    console.error("[LEAD_STAGE_UPDATE_FAILURE]", { error });
    throw new Error("Failed to transition opportunity pipeline stage.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}
