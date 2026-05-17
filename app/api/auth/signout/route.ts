import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AUTH_SIGNOUT]", { message: error.message });
      }
    }
  } catch (error: unknown) {
    console.error("[AUTH_SIGNOUT_FAILURE]", { error });
  }

  const url = new URL("/login", request.url);
  revalidatePath("/", "layout");
  return NextResponse.redirect(url, { status: 302 });
}
