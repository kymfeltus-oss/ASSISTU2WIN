## PR Summary

- Adds **go-live-regression** GitHub Actions workflow (path-filtered PRs) with fixture backfill, Playwright UI cert, and API Pass 2 cert.
- Introduces `scripts/backfill-go-live-fixtures.mjs`, `scripts/set-github-go-live-secrets.mjs`, and npm scripts (`fixtures:go-live`, `cert:go-live`, `cert:go-live:ui`, `secrets:go-live`).
- Fixes production-build blockers discovered during CI (missing lead libs, `ActionCenter` type guards, `AppBrand` compact variant, leads sub-routes).
- Reorders CI so **UI cert runs before API cert**, with fixture reset between steps (API cert leaves success appointment `live`).
- **Green CI run:** https://github.com/kymfeltus-oss/ASSISTU2WIN/actions/runs/25977204420

---

## Scope Classification (Required)

Applies to this PR:

- [x] Dashboard UI
- [x] CI / Tooling only

---

## Risk Level (Required)

- [ ] Low (isolated, reversible, no schema impact)
- [x] Medium (cross-file behavior or user-facing flow)
- [ ] High (schema/auth/state-machine/critical path)

Mitigation:

- Mitigated by fixture reset + UI/API certs in CI.

---

## Go-Live Surface Impact (Required)

- [ ] Touched `app/api/appointments/go-live/**`
- [x] Touched `app/dashboard/leads/**`
- [x] Touched `components/dashboard/ActionCenter.tsx`
- [ ] Touched `components/dashboard/LiveMeetingBadge.tsx`

`go-live-regression` CI must pass when any go-live surface above is checked.

**Result:** `go-live-regression` **passed** on this PR.

---

## Validation Checklist (Required)
- [x] Local build succeeds (`npm run build`)
- [x] API cert passes (`npm run cert:go-live`) — via CI
- [x] UI cert passes (`npm run cert:go-live:ui`) — via CI
- [ ] Full cert (if applicable) passes (`npm run cert:go-live:all`) — not run locally on this branch
- [x] Fixtures reset/verified (`npm run fixtures:go-live`) when needed — via CI (initial + pre-UI reset)

Attach outputs/log links:
- https://github.com/kymfeltus-oss/ASSISTU2WIN/actions/runs/25977204420
- Fixtures: `[fixtures] Go-live fixtures ready`
- UI: `[ui-cert] PASS — all UI checks succeeded`
- API: `[cert] PASS 2 certified — all four scenarios passed`

---

## Database / Migration (Required if schema touched)

Notes:

- No schema changes in this PR. Fixture script upserts test rows only (cert user, success/forbidden appointments).

---

## Auth & Security (Required)
- [x] Auth behavior verified (401 vs 403 vs 404 semantics where applicable) — API cert in CI
- [x] No secrets exposed in logs/responses
- [x] Ownership checks validated — forbidden fixture returns 403 in API + UI
- [ ] Middleware behavior reviewed for `/api/*` and pages

Notes:

- GitHub repo secrets configured for CI (7 keys). `set-github-go-live-secrets.mjs` never prints secret values.

---

## UI Evidence (Required for UI changes)
- [ ] Screenshots/GIF attached
- [x] Empty/loading/error/success states verified — Playwright UI cert
- [x] Console clean (no schema/runtime errors) — UI cert guards `leads_1.name` and empty `[LEADS_DASHBOARD_APPOINTMENTS] {}`

Evidence:

- CI Playwright run (link above)

---

## Regression Guardrails (Required)
- [x] Existing certified flows still pass
- [x] No new console errors introduced
- [x] No broken deep links/routes
- [ ] Realtime subscriptions cleanup verified (if touched)

---

## Rollback Plan (Required)

If this PR causes issues, exact rollback steps:

1. Revert merge commit on `main` (or close without merging).
2. Disable/delete `.github/workflows/go-live-regression.yml` if CI noise is unwanted.
3. Remove GitHub secrets only if retiring automated go-live regression entirely.

---

## Post-Merge Actions (Optional)
- [x] Update docs — PR template seeded (`.github/pull_request_template.md`)
- [ ] Notify stakeholders
- [ ] Create follow-up tasks
