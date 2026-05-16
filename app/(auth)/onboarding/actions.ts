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

  if (!fullName || !companyName) {
    return redirect(
      "/onboarding?error=Full Name and Company Name are required fields.",
    );
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action_type: "AUTH",
      description: `User completed onboarding system matrix setup. Workspace configured for "${companyName}".`,
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
