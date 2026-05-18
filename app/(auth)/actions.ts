"use server";

import { linkLeadToBuyerAccount } from "@/lib/leads/link-buyer-account";
import { CLIENT_INVITE_TARGET_SANCTUARY } from "@/lib/qr-service";
import { createClient } from "@/lib/supabase/server";
import { diagnoseSupabasePublicEnv } from "@/lib/supabase/public-env";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

function isAuthApiError(error: unknown): error is { message?: string } {
  return error !== null && typeof error === "object" && "message" in error;
}

function loginErrorRedirect(error: unknown): never {
  const message =
    isAuthApiError(error) && typeof error.message === "string"
      ? error.message
      : "";

  if (message.toLowerCase().includes("invalid api key")) {
    redirect(
      "/login?error=Supabase+API+key+is+invalid.+Update+NEXT_PUBLIC_SUPABASE_ANON_KEY+in+.env.local+from+Supabase+Settings+%E2%86%92+API.",
    );
  }

  if (
    message.toLowerCase().includes("invalid login credentials") ||
    message.toLowerCase().includes("invalid credentials")
  ) {
    redirect("/login?error=Invalid+email+or+password");
  }

  redirect("/login?error=Sign-in+failed.+Try+again.");
}

function getTrimmedEmail(formData: FormData): string | null {
  const raw = formData.get("email");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getPassword(formData: FormData): string | null {
  const raw = formData.get("password");
  if (typeof raw !== "string" || raw.length === 0) return null;
  return raw;
}

function getTrimmedFullName(formData: FormData): string | null {
  const raw = formData.get("fullName");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function login(formData: FormData): Promise<void> {
  const email = getTrimmedEmail(formData);
  const password = getPassword(formData);

  if (!email || !password) {
    redirect("/login?error=Invalid+email+or+password");
  }

  const envDiagnostic = diagnoseSupabasePublicEnv();
  // #region agent log
  fetch("http://127.0.0.1:7764/ingest/a95af5bd-0217-4f46-848b-1173c2c72d98", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "3fd78e",
    },
    body: JSON.stringify({
      sessionId: "3fd78e",
      runId: "post-fix",
      hypothesisId: "A,B",
      location: "app/(auth)/actions.ts:login",
      message: "supabase env diagnostic before signIn",
      data: {
        envOk: envDiagnostic.ok,
        issues: envDiagnostic.issues,
        urlHost: envDiagnostic.urlHost,
        keyFormat: envDiagnostic.keyFormat,
        keyLength: envDiagnostic.keyLength,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!envDiagnostic.ok) {
    redirect(
      "/login?error=Supabase+env+misconfigured.+Check+NEXT_PUBLIC_SUPABASE_URL+and+ANON_KEY+in+.env.local.",
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  } catch (error: unknown) {
    unstable_rethrow(error);
    console.error("[AUTH_LOGIN_FAILURE]", { error });
    loginErrorRedirect(error);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData): Promise<void> {
  const email = getTrimmedEmail(formData);
  const password = getPassword(formData);
  const fullName = getTrimmedFullName(formData);

  // Informative gate check for missing fields
  if (!email || !password || !fullName) {
    const missing = [];
    if (!fullName) missing.push("Full Name");
    if (!email) missing.push("Email");
    if (!password) missing.push("Password");
    redirect(`/login?error=${encodeURIComponent("Missing required fields: " + missing.join(", "))}`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          marketing_opt_in: true,
        },
      },
    });
    if (error) throw error;
  } catch (error: unknown) {
    unstable_rethrow(error);
    console.error("[AUTH_SIGNUP_FAILURE]", { error });
    
    // Extract dynamic message from Supabase response error
    const message = isAuthApiError(error) && error.message ? error.message : "Registration failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Check email to confirm registration");
}

function getHiddenField(formData: FormData, name: string): string | null {
  const raw = formData.get(name);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Buyer portal signup from a client-invite QR (`ref` = lead id). */
export async function signupClientPortalInvite(formData: FormData): Promise<void> {
  const email = getTrimmedEmail(formData);
  const password = getPassword(formData);
  const fullName = getTrimmedFullName(formData);
  const leadRef = getHiddenField(formData, "leadRef");
  const target = getHiddenField(formData, "target");

  if (!email || !password || !fullName) {
    const missing: string[] = [];
    if (!fullName) missing.push("Full Name");
    if (!email) missing.push("Email");
    if (!password) missing.push("Password");
    redirect(
      `/auth/signup?error=${encodeURIComponent(`Missing required fields: ${missing.join(", ")}`)}${leadRef ? `&ref=${encodeURIComponent(leadRef)}&type=client_invite&target=${encodeURIComponent(target ?? CLIENT_INVITE_TARGET_SANCTUARY)}` : ""}`,
    );
  }

  const envDiagnostic = diagnoseSupabasePublicEnv();
  if (!envDiagnostic.ok) {
    redirect(
      "/auth/signup?error=Supabase+env+misconfigured.+Check+NEXT_PUBLIC_SUPABASE_URL+and+ANON_KEY.",
    );
  }

  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          portal_invite: true,
        },
      },
    });
    if (error) throw error;
    userId = data.user?.id ?? null;
  } catch (error: unknown) {
    unstable_rethrow(error);
    console.error("[AUTH_CLIENT_INVITE_SIGNUP_FAILURE]", { error });
    const message =
      isAuthApiError(error) && error.message ? error.message : "Registration failed";
    redirect(`/auth/signup?error=${encodeURIComponent(message)}`);
  }

  if (userId && leadRef) {
    const linkResult = await linkLeadToBuyerAccount(leadRef, userId);
    if (!linkResult.ok) {
      redirect(`/auth/signup?error=${encodeURIComponent(linkResult.message)}`);
    }
  }

  revalidatePath("/", "layout");

  if (target === CLIENT_INVITE_TARGET_SANCTUARY) {
    redirect("/my-sanctuary");
  }

  redirect("/dashboard");
}