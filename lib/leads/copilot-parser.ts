import {
  parseLoanType,
  type CopilotParseResult,
  type LeadExtractedPreferences,
} from "@/lib/leads/types";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const LEAD_COPILOT_JSON_SCHEMA = {
  name: "lead_copilot_parse",
  strict: true,
  schema: {
    type: "object",
    properties: {
      lead_name: { type: ["string", "null"] },
      target_budget: { type: ["number", "null"] },
      ai_summary: { type: "string" },
      phone_number: { type: ["string", "null"] },
      email_address: { type: ["string", "null"] },
      preferences: {
        type: "object",
        properties: {
          target_neighborhoods: {
            type: "array",
            items: { type: "string" },
          },
          min_bedrooms: { type: ["integer", "null"] },
          pre_approval_status: { type: ["string", "null"] },
          loan_type: {
            type: "string",
            enum: ["Conventional", "FHA", "VA", "USDA", "Cash", "Unknown"],
            description:
              "Identify if the buyer mentions using an FHA, Conventional, VA, USDA, or Cash offer.",
          },
        },
        required: [
          "target_neighborhoods",
          "min_bedrooms",
          "pre_approval_status",
          "loan_type",
        ],
        additionalProperties: false,
      },
    },
    required: [
      "lead_name",
      "target_budget",
      "ai_summary",
      "phone_number",
      "email_address",
      "preferences",
    ],
    additionalProperties: false,
  },
} as const;

type OpenAIChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function coercePreferences(raw: unknown): LeadExtractedPreferences {
  if (typeof raw !== "object" || raw === null) {
    return {
      target_neighborhoods: [],
      min_bedrooms: null,
      pre_approval_status: null,
      loan_type: "Unknown",
      hurdle_lender: false,
      hurdle_home_sale: false,
      hurdle_down_payment: false,
    };
  }
  const record = raw as Record<string, unknown>;
  const neighborhoods = Array.isArray(record.target_neighborhoods)
    ? record.target_neighborhoods.filter(
        (n): n is string => typeof n === "string" && n.trim().length > 0,
      )
    : [];
  const minBedrooms =
    typeof record.min_bedrooms === "number" && Number.isFinite(record.min_bedrooms)
      ? Math.max(0, Math.floor(record.min_bedrooms))
      : null;
  const preApproval =
    typeof record.pre_approval_status === "string" &&
    record.pre_approval_status.trim().length > 0
      ? record.pre_approval_status.trim()
      : null;

  return {
    target_neighborhoods: neighborhoods,
    min_bedrooms: minBedrooms,
    pre_approval_status: preApproval,
    loan_type: parseLoanType(record.loan_type),
    hurdle_lender: record.hurdle_lender === true,
    hurdle_home_sale: record.hurdle_home_sale === true,
    hurdle_down_payment: record.hurdle_down_payment === true,
  };
}

function coerceParseResult(parsed: unknown): CopilotParseResult | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  const aiSummary =
    typeof record.ai_summary === "string" && record.ai_summary.trim()
      ? record.ai_summary.trim()
      : null;
  if (!aiSummary) return null;

  const leadName =
    typeof record.lead_name === "string" && record.lead_name.trim()
      ? record.lead_name.trim()
      : null;

  const rawBudget = record.target_budget;
  const targetBudget =
    typeof rawBudget === "number" && Number.isFinite(rawBudget) && rawBudget > 0
      ? rawBudget
      : null;

  const phoneNumber =
    typeof record.phone_number === "string" && record.phone_number.trim()
      ? record.phone_number.trim()
      : null;

  const emailAddress =
    typeof record.email_address === "string" && record.email_address.trim()
      ? record.email_address.trim()
      : null;

  return {
    lead_name: leadName,
    target_budget: targetBudget,
    ai_summary: aiSummary,
    phone_number: phoneNumber,
    email_address: emailAddress,
    preferences: coercePreferences(record.preferences),
  };
}

export async function parseLeadTranscript(
  leadSource: string,
  rawContent: string,
): Promise<CopilotParseResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[COPILOT_PARSER_CONFIG]", {
      message: "OPENAI_API_KEY is missing",
    });
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
        temperature: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: LEAD_COPILOT_JSON_SCHEMA,
        },
        messages: [
          {
            role: "system",
            content: `You are a licensed real estate transaction coordinator assistant.
Parse unstructured buyer conversations into structured lead data for an admin intake pipeline.
Use residential real estate language only — never B2B CRM terms like "opportunity", "account", or "deal value".
Explicitly identify loan_type when the buyer mentions Conventional, FHA, VA, USDA, or Cash financing; use Unknown if not stated.
Lead source context: ${leadSource}.`,
          },
          {
            role: "user",
            content: rawContent,
          },
        ],
      }),
    });

    const data = (await response.json()) as OpenAIChatCompletionResponse;

    if (!response.ok) {
      const msg = data.error?.message ?? response.statusText;
      throw new Error(`OpenAI error: ${msg}`);
    }

    const rawContentJson = data.choices?.[0]?.message?.content;
    if (!rawContentJson) return null;

    const parsed = JSON.parse(rawContentJson) as unknown;
    return coerceParseResult(parsed);
  } catch (error: unknown) {
    console.error("[COPILOT_PARSER_FAILURE]", { error });
    return null;
  }
}
