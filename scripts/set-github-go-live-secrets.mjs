/**
 * Push go-live CI secrets to GitHub (repository secrets).
 * Requires: `gh auth login` and values in .env.local (or process env).
 *
 * Usage: node scripts/set-github-go-live-secrets.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./lib/load-env.mjs";
import { resolveServiceRoleKey } from "./lib/resolve-service-role.mjs";

const SECRET_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "GO_LIVE_CERT_EMAIL",
  "GO_LIVE_CERT_PASSWORD",
];

function ghAvailable() {
  try {
    execSync("gh auth status", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function setSecret(name, value) {
  execSync(`gh secret set ${name}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });
  console.info(`[secrets] set ${name} (len=${value.length})`);
}

function main() {
  loadEnvLocal();

  const serviceRole = resolveServiceRoleKey();
  if (serviceRole) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole;
  }

  if (!ghAvailable()) {
    console.error(
      "[secrets] gh CLI not authenticated. Run: gh auth login",
    );
    process.exit(1);
  }

  const missing = [];
  for (const key of SECRET_KEYS) {
    const value = process.env[key]?.trim() ?? "";
    if (!value) {
      missing.push(key);
      continue;
    }
    setSecret(key, value);
  }

  if (missing.length > 0) {
    console.error(
      `[secrets] Missing values for: ${missing.join(", ")}\n` +
        "Add them to .env.local, then re-run.\n" +
        "For cert user: npm run fixtures:go-live (prints GO_LIVE_CERT_* when created).",
    );
    process.exit(1);
  }

  console.info("[secrets] All go-live CI secrets uploaded.");
}

main();
