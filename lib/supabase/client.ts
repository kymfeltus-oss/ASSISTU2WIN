import { getSupabasePublicEnv } from "@/lib/supabase/public-env";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key, RLS enforced).
 * Use only in Client Components or client-side code paths.
 */
export function createClient() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
