import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key, RLS enforced).
 * Use only in Client Components or client-side code paths.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
