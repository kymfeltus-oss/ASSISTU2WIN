import { execSync } from "node:child_process";

const PROJECT_REF = "izecrfmbcfyuzxoywioa";

/**
 * Resolves service role from env or Supabase CLI (never logs the key).
 */
export function resolveServiceRoleKey() {
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv && fromEnv.length > 20) {
    return fromEnv;
  }

  try {
    const output = execSync(
      `npx supabase projects api-keys --project-ref ${PROJECT_REF}`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const match = output.match(
      /service_role\s*\|\s*(eyJ[a-zA-Z0-9._-]+)/,
    );
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    // fall through
  }

  return null;
}
