## PR Summary
<!-- 2-5 bullets: what changed and why -->

- 
- 

---

## Scope Classification (Required)
<!-- List only scopes that apply; check those boxes and omit non-applicable lines. -->

- [ ] Backend API
- [ ] Dashboard UI
- [ ] Database / Migration
- [ ] Realtime / Subscription
- [ ] CI / Tooling only

---

## Risk Level (Required)
<!-- Check exactly one. -->

- [ ] Low (isolated, reversible, no schema impact)
- [ ] Medium (cross-file behavior or user-facing flow)
- [ ] High (schema/auth/state-machine/critical path)

Mitigation:

- 

---

## Go-Live Surface Impact (Required)
<!-- Check each touched path. Do not use “No go-live surface touched” if any path below is checked. -->

- [ ] Touched `app/api/appointments/go-live/**`
- [ ] Touched `app/dashboard/leads/**`
- [ ] Touched `components/dashboard/ActionCenter.tsx`
- [ ] Touched `components/dashboard/LiveMeetingBadge.tsx`

If any box above is checked, `go-live-regression` CI must pass.

---

## Validation Checklist (Required)
- [ ] Local build succeeds (`npm run build`)
- [ ] API cert passes (`npm run cert:go-live`)
- [ ] UI cert passes (`npm run cert:go-live:ui`)
- [ ] Full cert (if applicable) passes (`npm run cert:go-live:all`)
- [ ] Fixtures reset/verified (`npm run fixtures:go-live`) when needed

Attach outputs/log links:

- 

---

## Database / Migration (Required if schema touched)
- [ ] Migration is idempotent
- [ ] Constraints/indexes reviewed
- [ ] RLS/policy impact reviewed
- [ ] Backfill/compatibility considered
- [ ] Roll-forward and rollback plan documented

Notes:

- 

---

## Auth & Security (Required)
- [ ] Auth behavior verified (401 vs 403 vs 404 semantics where applicable)
- [ ] No secrets exposed in logs/responses
- [ ] Ownership checks validated
- [ ] Middleware behavior reviewed for `/api/*` and pages

Notes:

- 

---

## UI Evidence (Required for UI changes)
- [ ] Screenshots/GIF attached
- [ ] Empty/loading/error/success states verified
- [ ] Console clean (no schema/runtime errors)

Evidence:

- 

---

## Regression Guardrails (Required)
- [ ] Existing certified flows still pass
- [ ] No new console errors introduced
- [ ] No broken deep links/routes
- [ ] Realtime subscriptions cleanup verified (if touched)

---

## Rollback Plan (Required)

If this PR causes issues, exact rollback steps:

1. 
2. 
3. 

---

## Post-Merge Actions (Optional)
- [ ] Update docs
- [ ] Notify stakeholders
- [ ] Create follow-up tasks
