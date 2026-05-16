"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

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
    redirect("/login?error=Invalid credentials");
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
    redirect("/login?error=Invalid credentials");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData): Promise<void> {
  const email = getTrimmedEmail(formData);
  const password = getPassword(formData);
  const fullName = getTrimmedFullName(formData);

  if (!email || !password || !fullName) {
    redirect("/login?error=Registration failed");
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
    redirect("/login?error=Registration failed");
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Check email to confirm registration");
}
