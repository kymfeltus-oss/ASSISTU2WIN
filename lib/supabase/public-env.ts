export type SupabasePublicEnvIssue =
  | "missing_url"
  | "missing_key"
  | "invalid_url"
  | "invalid_key_format"
  | "key_length_suspicious";

export type SupabasePublicEnvDiagnostic = {
  readonly ok: boolean;
  readonly issues: readonly SupabasePublicEnvIssue[];
  readonly urlHost: string | null;
  readonly keyFormat: "jwt" | "publishable" | "unknown";
  readonly keyLength: number;
};

function trimEnv(value: string | undefined): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function diagnoseSupabasePublicEnv(): SupabasePublicEnvDiagnostic {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const issues: SupabasePublicEnvIssue[] = [];

  if (!url) {
    issues.push("missing_url");
  } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    issues.push("invalid_url");
  }

  if (!key) {
    issues.push("missing_key");
  } else if (key.startsWith("sb_publishable_")) {
    if (key.length < 20) {
      issues.push("key_length_suspicious");
    }
  } else if (key.startsWith("eyJ")) {
    if (key.length < 100 || key.length > 512) {
      issues.push("key_length_suspicious");
    }
  } else {
    issues.push("invalid_key_format");
  }

  let urlHost: string | null = null;
  if (url) {
    try {
      urlHost = new URL(url).host;
    } catch {
      issues.push("invalid_url");
    }
  }

  const keyFormat: SupabasePublicEnvDiagnostic["keyFormat"] = key.startsWith(
    "sb_publishable_",
  )
    ? "publishable"
    : key.startsWith("eyJ")
      ? "jwt"
      : "unknown";

  return {
    ok: issues.length === 0,
    issues,
    urlHost,
    keyFormat,
    keyLength: key.length,
  };
}

export function getSupabasePublicEnv(): {
  readonly url: string;
  readonly anonKey: string;
} {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const diagnostic = diagnoseSupabasePublicEnv();

  if (!diagnostic.ok) {
    throw new Error(
      "Supabase env misconfigured. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local from Supabase → Project Settings → API (anon / publishable key).",
    );
  }

  return { url, anonKey };
}
