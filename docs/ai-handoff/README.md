# EduPulse by Ray - AI Handoff

## Purpose
EduPulse by Ray is a multi-tenant tutoring SaaS platform (offline-first) with Google-backed sync, tenant onboarding, QR attendance, AI assistant, and Android APK distribution.

## Runtime Map
- Bootstrap and session gate: `src/app.js`
- Main controller/UI orchestration: `src/ui.js`
- Storage: `src/storage.js` (Dexie IndexedDB)
- Sync queue/worker events: `src/sync.js`
- API transport: `src/api.js`
- Auth: `src/auth.js`
- Google Drive/Sheets OAuth token flow: `src/google.js`
- Tenant onboarding: `src/onboarding.js`
- Billing checkout: `src/billing.js`
- AI assistant: `src/ai.js`
- Dashboard analytics/charts: `src/analytics.js`, `src/charts.js`, `src/reports.js`
- Domain modules: `src/students.js`, `src/tutors.js`, `src/lessons.js`, `src/scheduler.js`, `src/attendance.js`, `src/payments.js`, `src/backup.js`, `src/qr.js`

## Multi-Tenant Data Rules
- Every domain row is normalized with:
  - `tenantId`
  - `accountId`
- Isolation happens via active account/profile context.
- Cross-tenant visibility exists only in super-admin rollup logic.
- Sync payloads include unique `changeId` to prevent duplicates.

## IndexedDB Tables
- students
- tutors
- lessons
- assignments
- attendance
- payments
- expenses
- schedule
- messages
- notifications
- performanceMetrics
- businessMetrics
- reports
- syncQueue
- settings

## Google Backend
File: `apps-script.gs`

Actions:
- `ping`
- `syncChange`
- `getAll`
- `exportSnapshot`
- `saveQr`
- `onboardTenant`
- `listTenants`
- `updateTenantStatus`
- `createStripeCheckout`

Data row schema in Sheets:
- `id, tenantId, accountId, createdAt, updatedAt, deleted, payload`

Tenant registry schema:
- `tenantId, tenantName, adminEmail, plan, status, driveFolderId, sheetId, createdAt, updatedAt`

## Env and Secrets
- Runtime env access: `src/env.js`
- Generated file: `env.js` via `scripts/build-env.mjs`
- Required keys:
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_GEMINI_API_KEY`
- Optional:
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_STRIPE_CHECKOUT_ENDPOINT`
- `.env` is ignored in git.

## Auth/OAuth
- Local auth and Google auth configurable in Settings (APP Developer lock).
- Google login allowed email restriction enforced in `authenticateGoogleCredential`.
- Google Drive/Sheets token flow via GIS token client (`connectGoogleWorkspace`).

## AI Assistant
- SDK: `@google/genai`
- Default model: `gemini-2.0-flash`
- `askGemini()` stores both user and assistant messages in `messages` table.
- History is scoped by `accountId`, `tenantId`, and `userId`.

## Billing
- Checkout API call: `createStripeCheckout` (Apps Script proxy).
- UI supports URL-based checkout or Stripe.js redirect by `sessionId`.
- Subscription gating blocks non-settings/dashboard views if inactive and required.

## Onboarding
- Modal-driven onboarding (first run):
  - tenant record creation
  - tenant id generation
  - remote onboarding via Apps Script (if endpoint exists)
  - local profile activation fallback when remote unavailable

## Offline and PWA
- Service worker: `service-worker.js` (`data-insights-v2.2.0`)
- Caches app shell, runtime assets, and offline fallback page.
- Sync resumes automatically on reconnect and can be triggered manually.

## Testing
- Unit/integration tests:
  - student registration + validation
  - payments/auth/attendance
  - QR parsing and QR attendance flow
  - tenant isolation
  - Google auth allow-list
  - Gemini assistant with mocked SDK client
- Stress:
  - 1000 students
  - 10000 attendance rows
  - 5000 payments

## Commands
```bash
npm test
npm run stress:test
npm run prepare:web
npm run android:sync
```
