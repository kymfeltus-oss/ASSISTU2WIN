"use server";

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