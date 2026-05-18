import {
  handleLeadIntake,
  parsePublicLeadIntakeRequestBody,
  type PublicLeadIntakeFailure,
  type PublicLeadIntakeSuccess,
} from "@/lib/communication-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function jsonError(
  status: number,
  message: string,
): NextResponse<PublicLeadIntakeFailure> {
  return NextResponse.json({ ok: false, message }, { status });
}

/**
 * Public QR / landing-page intake.
 * Persists automation toggles on `public.leads.communication_preferences` (jsonb).
 */
export async function POST(
  request: Request,
): Promise<NextResponse<PublicLeadIntakeSuccess | PublicLeadIntakeFailure>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const formData = parsePublicLeadIntakeRequestBody(body);
  if (!formData) {
    return jsonError(
      400,
      "Name, email, phone, and preferred contact channel are required.",
    );
  }

  const result = await handleLeadIntake(formData);
  if (!result.ok) {
    return jsonError(500, result.message);
  }

  return NextResponse.json(result, { status: 201 });
}
