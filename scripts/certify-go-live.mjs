/**
 * Pass 2 certification — POST /api/appointments/go-live
 * Run: node scripts/certify-go-live.mjs
 * Requires: dev server, .env.local Supabase + LiveKit keys.
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { GO_LIVE_FIXTURES } from "./backfill-go-live-fixtures.mjs";
import { loadEnvLocal, requireEnv } from "./lib/load-env.mjs";

const BASE_URL = process.env.GO_LIVE_CERT_BASE_URL ?? "http://localhost:3000";
const SUCCESS_APPOINTMENT_ID = "6d09e212-a06c-4174-a1e0-008f0b1f10ed";
const SUCCESS_LEAD_ID = "7bac7806-260d-44c1-b5ff-f40c57e7e02b";
const FORBIDDEN_OWNER_ID = "e6f0d697-35a5-4da6-8229-c336dd78945e";

class CookieJar {
  constructor() {
    /** @type {Map<string, string>} */
    this.store = new Map();
  }
  getAll() {
    return [...this.store.entries()].map(([name, value]) => ({ name, value }));
  }
  setAll(cookies) {
    for (const { name, value } of cookies) {
      this.store.set(name, value);
    }
  }
  header() {
    return this.getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function postGoLive(jar, body) {
  const response = await fetch(`${BASE_URL}/api/appointments/go-live`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: jar.header(),
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  /** @type {Record<string, unknown>} */
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function createCertSession(supabaseUrl, anonKey) {
  const email =
    process.env.GO_LIVE_CERT_EMAIL?.trim() ??
    `go-live-cert-${Date.now()}@assistu2win.test`;
  const password =
    process.env.GO_LIVE_CERT_PASSWORD?.trim() ??
    `Cert-${randomUUID()}!Aa1`;

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jar = new CookieJar();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (cookies) => jar.setAll(cookies),
    },
  });

  if (!process.env.GO_LIVE_CERT_EMAIL) {
    const { data: signUpData, error: signUpError } = await anon.auth.signUp({
      email,
      password,
      options: { data: { full_name: "Go Live Cert Bot" } },
    });
    if (signUpError) {
      throw new Error(`signUp failed: ${signUpError.message}`);
    }
    if (!signUpData.user?.id) {
      throw new Error("signUp returned no user id");
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    throw new Error(`signIn failed: ${signInError.message}`);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    throw new Error("getUser after signIn failed");
  }

  return { jar, userId: user.id, email };
}

async function verifyDbLive(serviceUrl, serviceKey, appointmentId) {
  const admin = createClient(serviceUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from("appointments")
    .select("status, livekit_room_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) {
    throw new Error(`DB verify failed: ${error.message}`);
  }
  assert(data?.status === "live", `expected status live, got ${data?.status}`);
  assert(
    typeof data?.livekit_room_id === "string" && data.livekit_room_id.length > 0,
    "expected livekit_room_id set",
  );
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const livekitKey = requireEnv("LIVEKIT_API_KEY");
  const livekitSecret = requireEnv("LIVEKIT_API_SECRET");

  console.info(`[cert] baseUrl=${BASE_URL}`);

  const { jar, userId, email } = await createCertSession(supabaseUrl, anonKey);
  console.info(`[cert] session userId=${userId} email=${email}`);

  let forbiddenAppointmentId =
    process.env.GO_LIVE_FORBIDDEN_APPOINTMENT_ID?.trim() ??
    GO_LIVE_FIXTURES.forbiddenAppointmentId;

  if (serviceKey && serviceKey.length > 20) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await admin.from("profiles").upsert({ id: userId }, { onConflict: "id" });

    const { error: leadUpdateError } = await admin
      .from("leads")
      .update({ profile_id: userId })
      .eq("id", SUCCESS_LEAD_ID);
    if (leadUpdateError) {
      throw new Error(`align success lead: ${leadUpdateError.message}`);
    }

    const { error: resetError } = await admin
      .from("appointments")
      .update({ status: "scheduled", livekit_room_id: null })
      .eq("id", SUCCESS_APPOINTMENT_ID);
    if (resetError) {
      throw new Error(`reset success appointment: ${resetError.message}`);
    }

    if (!forbiddenAppointmentId) {
      const { data: forbiddenLead, error: forbiddenLeadError } = await admin
        .from("leads")
        .insert({
          profile_id: FORBIDDEN_OWNER_ID,
          lead_name: "Cert Forbidden Lead",
          lead_source: "Certification",
        })
        .select("id")
        .single();
      if (forbiddenLeadError) {
        throw new Error(`create forbidden lead: ${forbiddenLeadError.message}`);
      }

      const { data: forbiddenAppt, error: forbiddenApptError } = await admin
        .from("appointments")
        .insert({
          lead_id: forbiddenLead.id,
          title: "Cert Forbidden Session",
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        })
        .select("id")
        .single();
      if (forbiddenApptError) {
        throw new Error(
          `create forbidden appointment: ${forbiddenApptError.message}`,
        );
      }
      forbiddenAppointmentId = forbiddenAppt.id;
    }
  } else {
    console.warn(
      "[cert] SUPABASE_SERVICE_ROLE_KEY empty — using existing DB rows; forbidden test needs GO_LIVE_FORBIDDEN_APPOINTMENT_ID if missing",
    );
    assert(
      forbiddenAppointmentId,
      "Set GO_LIVE_FORBIDDEN_APPOINTMENT_ID or add SUPABASE_SERVICE_ROLE_KEY for fixture setup",
    );
  }

  const results = [];

  // 1) Success
  const success = await postGoLive(jar, {
    appointmentId: SUCCESS_APPOINTMENT_ID,
  });
  results.push({
    name: "success_go_live",
    status: success.status,
    code: success.json.code,
    hasToken:
      typeof success.json.token === "string" && success.json.token.length > 0,
  });
  assert(success.status === 200, `success expected 200, got ${success.status}`);
  assert(success.json.status === "live", "success payload status must be live");
  assert(
    typeof success.json.token === "string" && success.json.token.length > 0,
    "success payload must include token",
  );
  if (serviceKey && serviceKey.length > 20) {
    await verifyDbLive(supabaseUrl, serviceKey, SUCCESS_APPOINTMENT_ID);
  }

  // 2) Forbidden
  const forbidden = await postGoLive(jar, {
    appointmentId: forbiddenAppointmentId,
  });
  results.push({
    name: "forbidden_ownership",
    status: forbidden.status,
    code: forbidden.json.code,
  });
  assert(
    forbidden.status === 403 && forbidden.json.code === "FORBIDDEN",
    `forbidden expected 403 FORBIDDEN, got ${forbidden.status} ${forbidden.json.code}`,
  );

  // 3) Invalid payload
  const invalid = await postGoLive(jar, {});
  results.push({
    name: "invalid_payload",
    status: invalid.status,
    code: invalid.json.code,
  });
  assert(
    invalid.status === 400 && invalid.json.code === "INVALID_PAYLOAD",
    `invalid expected 400 INVALID_PAYLOAD, got ${invalid.status} ${invalid.json.code}`,
  );

  // 4) Transition conflict (already live)
  const conflict = await postGoLive(jar, {
    appointmentId: SUCCESS_APPOINTMENT_ID,
  });
  results.push({
    name: "transition_conflict",
    status: conflict.status,
    code: conflict.json.code,
  });
  assert(
    conflict.status === 409 && conflict.json.code === "TRANSITION_CONFLICT",
    `conflict expected 409 TRANSITION_CONFLICT, got ${conflict.status} ${conflict.json.code}`,
  );

  console.info("[cert] PASS 2 certified — all four scenarios passed");
  console.info(JSON.stringify({ results, userId, forbiddenAppointmentId }, null, 2));
}

main().catch((error) => {
  console.error("[cert] FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
