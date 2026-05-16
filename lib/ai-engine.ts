import { parseDealStage, type DealStage } from "@/lib/deal-stage";

export interface AIAnalysisResult {
  suggestedStage: DealStage;
  nextStepAction: string;
  confidenceScore: number;
}

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type OpenAIChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function parseModelJsonContent(content: string): unknown {
  return JSON.parse(content) as unknown;
}

function coerceAnalysisResult(parsed: unknown): AIAnalysisResult | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  const suggestedStage = parseDealStage(record.suggestedStage) ?? "INTAKE";
  const nextStepAction =
    typeof record.nextStepAction === "string" && record.nextStepAction.trim()
      ? record.nextStepAction.trim()
      : "Review manual adjustments.";

  const rawScore = record.confidenceScore;
  const confidenceScore =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? clampConfidence(rawScore)
      : 0.5;

  return {
    suggestedStage,
    nextStepAction,
    confidenceScore,
  };
}

export async function analyzeOpportunityNotes(
  notes: string | null,
): Promise<AIAnalysisResult | null> {
  if (!notes || notes.trim() === "") return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[AI_ENGINE_WARNING]: OPENAI_API_KEY is missing. Skipping analysis.",
    );
    return null;
  }

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an expert CRM automation analyst. Analyze the user's deal notes and return a strict JSON object with these keys:
            - "suggestedStage": Must match exactly one of these tokens based on context: "INTAKE", "PRE_APPROVAL", "HOME_SHOPPING", "UNDER_CONTRACT", "CLOSING_ROOM".
            - "nextStepAction": A concrete, short action item (under 10 words).
            - "confidenceScore": A decimal number between 0.0 and 1.0.`,
          },
          {
            role: "user",
            content: JSON.stringify({ deal_notes: notes }),
          },
        ],
        temperature: 0.2,
      }),
    });

    const data = (await response.json()) as OpenAIChatCompletionResponse;

    if (!response.ok) {
      const msg = data.error?.message ?? response.statusText;
      throw new Error(`OpenAI error: ${msg}`);
    }

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsed = parseModelJsonContent(rawContent);
    return coerceAnalysisResult(parsed);
  } catch (error: unknown) {
    console.error("[AI_ENGINE_FAILURE]", { error });
    return null;
  }
}

export function parseStoredAiInsights(raw: unknown): AIAnalysisResult | null {
  return coerceAnalysisResult(raw);
}

export async function generateOutreachDraft(
  stage: string,
  company: string,
  notes: string | null,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[AI_ENGINE_WARNING]: OPENAI_API_KEY is missing. Skipping outreach generation.",
    );
    return null;
  }

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an elite, highly professional executive communications assistant.
Generate a concise, impactful follow-up email draft to an account based on their current workspace pipeline state.
- Maintain a confident, supportive, and non-salesy tone.
- Keep the entire body under 75 words.
- Do not include subject lines or placeholders like [Your Name]. Use generic professional sign-offs.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              account: company,
              current_stage_trajectory: stage,
              operational_notes: notes?.trim() || "No recent notes logged.",
            }),
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = (await response.json()) as OpenAIChatCompletionResponse;

    if (!response.ok) {
      const msg = data.error?.message ?? response.statusText;
      throw new Error(`OpenAI response failure: ${msg}`);
    }

    const raw = data.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error: unknown) {
    console.error("[AI_OUTREACH_ENGINE_FAILURE]", { error });
    return null;
  }
}
