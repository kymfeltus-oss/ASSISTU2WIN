import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  readonly userId: string;
  readonly isAdmin: boolean;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[ADMIN_SESSION_PROFILE_ERROR]", {
      message: profileError.message,
    });
    return { userId: user.id, isAdmin: false };
  }

  return {
    userId: user.id,
    isAdmin: profile?.is_admin === true,
  };
}
