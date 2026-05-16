"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return redirect("/login?error=Session expired. Please sign in again.");
  }

  const fullName =
    typeof formData.get("fullName") === "string"
      ? (formData.get("fullName") as string).trim()
      : "";
  const companyName =
    typeof formData.get("companyName") === "string"
      ? (formData.get("companyName") as string).trim()
      : "";
  const industry =
    typeof formData.get("industry") === "string"
      ? (formData.get("industry") as string).trim()
      : "";
  const roleTitle =
    typeof formData.get("roleTitle") === "string"
      ? (formData.get("roleTitle") as string).trim()
      : "";

  if (!fullName || !companyName || !industry || !roleTitle) {
    return redirect(
      "/onboarding?error=All workspace profiling fields are required.",
    );
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        company_name: companyName,
        industry,
        role_title: roleTitle,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action_type: "AUTH",
      description: `User completed profiling matrix setup. Context locked to [${industry}] Market as a [${roleTitle}].`,
    });
  } catch (error) {
    console.error("[ONBOARDING_SUBMISSION_FAILURE]:", error);
    return redirect(
      "/onboarding?error=Database synchronization failed. Please retry.",
    );
  }

  revalidatePath("/", "layout");
  return redirect("/dashboard");
}
