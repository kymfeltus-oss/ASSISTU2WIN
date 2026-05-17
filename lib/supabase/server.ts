import { getSupabasePublicEnv } from "@/lib/supabase/public-env";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client (anon key + user session from cookies, RLS enforced).
 * Use in Server Components, Route Handlers, and Server Actions — never import from client components.
 */
export async function createClient() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicEnv();

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
