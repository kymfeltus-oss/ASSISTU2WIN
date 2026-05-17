/**
 * Idempotent Supabase fixtures for go-live API/UI certification.
 *
 * Usage:
 *   node scripts/backfill-go-live-fixtures.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY plus public Supabase URL/anon key.
 * Set GO_LIVE_CERT_EMAIL + GO_LIVE_CERT_PASSWORD for a stable cert user (recommended in CI).
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { loadEnvLocal, requireEnv } from "./lib/load-env.mjs";

/** Stable IDs — keep in sync with certify-go-live.mjs / ui-cert-go-live.mjs */
export const GO_LIVE_FIXTURES = {
  successAppointmentId: "6d09e212-a06c-4174-a1e0-008f0b1f10ed",
  successLeadId: "7bac7806-260d-44c1-b5ff-f40c57e7e02b",
  forbiddenAppointmentId: "cdc0a18e-b8de-4266-895c-5f6fea9614de",
  forbiddenLeadId: "04969172-62f6-41d3-83f0-cba2961efc26",
  forbiddenOwnerId: "e6f0d697-35a5-4da6-8229-c336dd78945e",
};

async function ensureCertUser(admin, supabaseUrl, anonKey) {
  const email =
    process.env.GO_LIVE_CERT_EMAIL?.trim() ??
    `go-live-cert-${GO_LIVE_FIXTURES.successAppointmentId.slice(0, 8)}@assistu2win.test`;
  const password =
    process.env.GO_LIVE_CERT_PASSWORD?.trim() ??
    `Cert-${randomUUID()}!Aa1`;

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!process.env.GO_LIVE_CERT_EMAIL) {
    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: { data: { full_name: "Go Live Cert Bot" } },
    });
    if (error && !error.message.toLowerCase().includes("already")) {
      throw new Error(`cert signUp failed: ${error.message}`);
    }
    if (!data.user?.id) {
      throw new Error("cert signUp returned no user id");
    }
    console.info(
      "[fixtures] Created cert user — store in CI secrets:\n" +
        `  GO_LIVE_CERT_EMAIL=${email}\n` +
        `  GO_LIVE_CERT_PASSWORD=${password}`,
    );
    return { userId: data.user.id, email, password, created: true };
  }

  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword(
    { email, password },
  );
  if (signInError || !signInData.user?.id) {
    throw new Error(`cert signIn failed: ${signInError?.message ?? "no user"}`);
  }

  return {
    userId: signInData.user.id,
    email,
    password,
    created: false,
  };
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const certUser = await ensureCertUser(admin, supabaseUrl, anonKey);
  const nowIso = new Date().toISOString();

  const { error: profileError } = await admin.from("profiles").upsert(
    { id: certUser.userId, is_admin: true },
    { onConflict: "id" },
  );
  if (profileError) {
    throw new Error(`profiles upsert: ${profileError.message}`);
  }

  const { error: successLeadError } = await admin.from("leads").upsert(
    {
      id: GO_LIVE_FIXTURES.successLeadId,
      profile_id: certUser.userId,
      lead_name: "John & Mary Smith",
      lead_source: "Certification",
    },
    { onConflict: "id" },
  );
  if (successLeadError) {
    throw new Error(`success lead upsert: ${successLeadError.message}`);
  }

  const { error: forbiddenLeadError } = await admin.from("leads").upsert(
    {
      id: GO_LIVE_FIXTURES.forbiddenLeadId,
      profile_id: GO_LIVE_FIXTURES.forbiddenOwnerId,
      lead_name: "Cert Forbidden Lead",
      lead_source: "Certification",
    },
    { onConflict: "id" },
  );
  if (forbiddenLeadError) {
    throw new Error(`forbidden lead upsert: ${forbiddenLeadError.message}`);
  }

  const { error: successApptError } = await admin.from("appointments").upsert(
    {
      id: GO_LIVE_FIXTURES.successAppointmentId,
      lead_id: GO_LIVE_FIXTURES.successLeadId,
      title: "Smoke Test Appointment",
      scheduled_at: nowIso,
      status: "scheduled",
      livekit_room_id: null,
    },
    { onConflict: "id" },
  );
  if (successApptError) {
    throw new Error(`success appointment upsert: ${successApptError.message}`);
  }

  const { error: forbiddenApptError } = await admin.from("appointments").upsert(
    {
      id: GO_LIVE_FIXTURES.forbiddenAppointmentId,
      lead_id: GO_LIVE_FIXTURES.forbiddenLeadId,
      title: "Cert Forbidden Session",
      scheduled_at: nowIso,
      status: "scheduled",
      livekit_room_id: null,
    },
    { onConflict: "id" },
  );
  if (forbiddenApptError) {
    throw new Error(`forbidden appointment upsert: ${forbiddenApptError.message}`);
  }

  console.info("[fixtures] Go-live fixtures ready");
  console.info(
    JSON.stringify(
      {
        certUserId: certUser.userId,
        certEmail: certUser.email,
        ...GO_LIVE_FIXTURES,
        scheduled_at: nowIso,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "[fixtures] FAILED",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
