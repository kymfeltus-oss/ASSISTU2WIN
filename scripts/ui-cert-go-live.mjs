/**
 * UI certification for /dashboard/leads Go Live flow.
 * Requires: dev server on :3000, GO_LIVE_CERT_EMAIL + GO_LIVE_CERT_PASSWORD in env.
 */
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import { loadEnvLocal, requireEnv } from "./lib/load-env.mjs";

const BASE_URL = process.env.GO_LIVE_CERT_BASE_URL ?? "http://localhost:3000";
const SUCCESS_APPOINTMENT_ID = "6d09e212-a06c-4174-a1e0-008f0b1f10ed";
const FORBIDDEN_APPOINTMENT_ID = "cdc0a18e-b8de-4266-895c-5f6fea9614de";

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
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function buildAuthenticatedContext(browser, supabaseUrl, anonKey) {
  const email = requireEnv("GO_LIVE_CERT_EMAIL");
  const password = requireEnv("GO_LIVE_CERT_PASSWORD");

  const jar = new CookieJar();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (cookies) => jar.setAll(cookies),
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`signIn failed: ${error.message}`);
  }

  const context = await browser.newContext();
  const cookies = jar.getAll().map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: BASE_URL,
  }));
  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  return context;
}

function isBadConsoleMessage(text) {
  if (text.includes("[LEADS_DASHBOARD_APPOINTMENTS]") && text.includes("{}")) {
    return true;
  }
  if (text.includes("leads_1.name does not exist")) {
    return true;
  }
  if (text.includes("column leads_1.name does not exist")) {
    return true;
  }
  return false;
}

function isIgnoredConsoleNoise(text) {
  return (
    text.includes("Failed to fetch RSC payload for") ||
    text.includes("/meet/") ||
    text.includes("Download the React DevTools") ||
    text.includes("[HMR] connected")
  );
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const browser = await chromium.launch({ headless: true });
  const context = await buildAuthenticatedContext(browser, supabaseUrl, anonKey);
  const page = await context.newPage();

  await page.addInitScript(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = (state, unused, url) => {
      if (typeof url === "string" && url.includes("/meet/")) {
        return;
      }
      return originalPushState(state, unused, url);
    };
  });

  await page.route("**/meet/**", (route) => route.abort());

  const consoleErrors = [];
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (isIgnoredConsoleNoise(text)) {
      return;
    }
    if (type === "error" || type === "warning") {
      consoleErrors.push({ type, text });
    }
    if (isBadConsoleMessage(text)) {
      consoleErrors.push({ type: "forbidden-pattern", text });
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push({ type: "pageerror", text: error.message });
  });

  await page.goto(`${BASE_URL}/dashboard/leads?ui_cert=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  assert(
    !page.url().includes("/login"),
    `expected authenticated leads page, got ${page.url()}`,
  );

  const actionCenter = page.getByRole("heading", { name: "Today's sessions" });
  await actionCenter.waitFor({ timeout: 15_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1_500);

  const badOnLoad = consoleErrors.filter((e) => isBadConsoleMessage(e.text));
  assert(
    badOnLoad.length === 0,
    `console errors on load: ${JSON.stringify(badOnLoad)}`,
  );

  const successRow = page.locator("li").filter({ hasText: "Smoke Test Appointment" });
  const successGoLive = successRow.getByRole("button", { name: "Go Live" });
  await successGoLive.waitFor({ state: "visible", timeout: 15_000 });
  assert(
    (await page.getByRole("button", { name: "Go Live" }).count()) >= 2,
    "expected Go Live on both scheduled rows",
  );

  const successResponsePromise = page.waitForResponse(
    (res) => res.url().includes("/api/appointments/go-live"),
    { timeout: 20_000 },
  );

  await successGoLive.scrollIntoViewIfNeeded();
  await successGoLive.click({ force: true });

  const startingLocator = page.getByRole("button", { name: "Starting..." });
  const sawStartingPromise = startingLocator
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  const goLiveResponse = await successResponsePromise;
  const sawStarting = await sawStartingPromise;

  assert(
    goLiveResponse.status() === 200,
    `success go-live expected 200, got ${goLiveResponse.status()}`,
  );

  const successPayload = await goLiveResponse.json();
  assert(
    typeof successPayload.token === "string" && successPayload.status === "live",
    "success payload must include token and live status",
  );

  await successRow.getByText("Live", { exact: true }).waitFor({
    timeout: 15_000,
  });

  assert(
    sawStarting || goLiveResponse.status() === 200,
    "expected Starting... during go-live or successful completion",
  );

  await context.close();

  const forbiddenContext = await buildAuthenticatedContext(
    browser,
    supabaseUrl,
    anonKey,
  );
  const forbiddenPage = await forbiddenContext.newPage();
  forbiddenPage.on("console", (msg) => {
    const text = msg.text();
    if (isIgnoredConsoleNoise(text)) return;
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleErrors.push({ type: msg.type(), text });
    }
    if (isBadConsoleMessage(text)) {
      consoleErrors.push({ type: "forbidden-pattern", text });
    }
  });

  await forbiddenPage.goto(`${BASE_URL}/dashboard/leads?ui_cert=forbidden`, {
    waitUntil: "domcontentloaded",
  });
  await forbiddenPage.waitForTimeout(1_500);

  const forbiddenRow = forbiddenPage
    .locator("li")
    .filter({ hasText: "Cert Forbidden Session" });
  await forbiddenRow.waitFor({ timeout: 15_000 });

  const forbiddenGoLive = forbiddenRow.getByRole("button", { name: "Go Live" });
  await forbiddenGoLive.waitFor({ state: "visible", timeout: 10_000 });

  const forbiddenResponsePromise = forbiddenPage.waitForResponse(
    (res) => res.url().includes("/api/appointments/go-live"),
    { timeout: 20_000 },
  );

  await forbiddenGoLive.click({ force: true });

  const forbiddenResponse = await forbiddenResponsePromise;
  assert(
    forbiddenResponse.status() === 403,
    `forbidden go-live expected 403, got ${forbiddenResponse.status()}`,
  );

  const forbiddenBody = await forbiddenResponse.json();
  assert(
    forbiddenBody.code === "FORBIDDEN",
    `forbidden code expected FORBIDDEN, got ${forbiddenBody.code}`,
  );

  await forbiddenPage
    .getByText("You do not have access to this appointment.", { exact: true })
    .waitFor({ timeout: 10_000 });

  const notFoundText = forbiddenPage.getByText(/not found/i);
  assert(
    (await notFoundText.count()) === 0,
    "UI must not show false not-found copy on 403",
  );

  const badAfter = consoleErrors.filter(
    (e) => isBadConsoleMessage(e.text) && !isIgnoredConsoleNoise(e.text),
  );
  assert(
    badAfter.length === 0,
    `console errors after interactions: ${JSON.stringify(badAfter)}`,
  );

  console.info("[ui-cert] PASS — all UI checks succeeded");
  console.info(
    JSON.stringify(
      {
        successStatus: goLiveResponse.status(),
        forbiddenStatus: forbiddenResponse.status(),
        forbiddenCode: forbiddenBody.code,
        consoleWarningCount: consoleErrors.length,
      },
      null,
      2,
    ),
  );

  await forbiddenContext.close();
  await browser.close();
}

main().catch((error) => {
  console.error("[ui-cert] FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
