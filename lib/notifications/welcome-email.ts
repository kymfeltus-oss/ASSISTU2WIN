import { Resend } from "resend";

export type WelcomeEmailPayload = {
  readonly email: string;
  readonly name: string;
};

export type WelcomeEmailResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

function getResendFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from && from.length > 0
    ? from
    : "Assist U 2 Win <onboarding@assistu2win.com>";
}

function buildWelcomeHtml(name: string): string {
  const safeName = name.trim().length > 0 ? name.trim() : "there";
  const lines = [
    'font-family: Inter, system-ui, sans-serif; color: #0f172a; line-height: 1.6;',
  ];
  return [
    `<div style="${lines[0]}">`,
    "<h1 style=\"color: #0f172a; font-size: 22px;\">Welcome to Assist U 2 Win</h1>",
    `<p>Hi ${safeName},</p>`,
    "<p>Thank you for connecting with us. Your buyer profile is saved and your agent can follow up on next steps for your home search.</p>",
    "<p>Download the mobile app to track milestones, documents, and updates in one place.</p>",
    '<p style="color: #64748b; font-size: 13px;">Assist U 2 Win — The Home Buying Collective</p>',
    "</div>",
  ].join("");
}

/**
 * Server-only: send post-intake welcome email via Resend.
 */
export async function sendWelcomeEmail(
  payload: WelcomeEmailPayload,
): Promise<WelcomeEmailResult> {
  const email = payload.email.trim();
  const name = payload.name.trim();

  if (email.length === 0) {
    return { ok: false, message: "Recipient email is required." };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[WELCOME_EMAIL_MISSING_RESEND_KEY]");
    return { ok: false, message: "Email service is not configured." };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: email,
      subject: "Welcome to Assist U 2 Win",
      html: buildWelcomeHtml(name),
    });

    if (error) {
      console.error("[WELCOME_EMAIL_RESEND]", { message: error.message });
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (error: unknown) {
    console.error("[WELCOME_EMAIL_EXCEPTION]", { error });
    return { ok: false, message: "Unable to send welcome email." };
  }
}
