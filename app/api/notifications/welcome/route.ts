import { sendWelcomeEmail } from "@/lib/notifications/welcome-email";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type WelcomeRequestBody = {
  readonly email?: string;
  readonly name?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  let body: WelcomeRequestBody;
  try {
    body = (await request.json()) as WelcomeRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (email.length === 0) {
    return NextResponse.json(
      { ok: false, message: "email is required." },
      { status: 400 },
    );
  }

  const result = await sendWelcomeEmail({ email, name });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
