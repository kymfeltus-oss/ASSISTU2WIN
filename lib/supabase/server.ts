import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client (anon key + user session from cookies, RLS enforced).
 * Use in Server Components, Route Handlers, and Server Actions — never import from client components.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const emptyUrl = supabaseUrl === "";
    const emptyKey = supabaseAnonKey === "";
    throw new Error(
      emptyUrl || emptyKey
        ? "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is set but empty in .env.local. Paste values from Supabase → Settings → API, or fix Vercel env vars (vercel env pull currently returns empty strings)."
        : "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  try {
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component where cookies are not mutable; middleware may refresh the session.
          }
        },
      },
    });
  } catch (error) {
    console.error("supabase_server_client_init_failed", { error });
    throw error;
  }
}
