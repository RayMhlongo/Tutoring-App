# EduPulse by Ray

Offline-first multi-tenant tutoring SaaS platform by Data Insights by Ray.

Runs as:
- Web app
- Installable PWA
- Android app (Capacitor APK)

## Architecture
- Frontend shell: `index.html`, `src/app.js`, `src/ui.js`, `components/*`
- Data layer: `src/storage.js` (Dexie + IndexedDB)
- Sync engine: `src/sync.js` + `src/api.js`
- Auth: `src/auth.js` (local + Google login)
- Google OAuth token access for Drive/Sheets: `src/google.js`
- AI assistant: `src/ai.js` (Gemini via `@google/genai`)
- SaaS onboarding and billing: `src/onboarding.js`, `src/billing.js`
- Backend (Google Apps Script): `apps-script.gs`
- Offline runtime: `service-worker.js`

## Multi-Tenant Model
- All domain records include `tenantId` and `accountId`.
- Tenant context is selected by active sync profile (`settings.syncProfiles`).
- Sync payloads always send `tenantId`, `accountId`, and unique `changeId`.
- Tenant registry and status controls are managed in Settings (APP Developer lock).

## Features
- Authentication:
  - Local admin login (offline capable)
  - Google login (allowed email restriction)
  - Session caching for offline use
- Tutoring operations:
  - Students, tutors, lessons, schedule, attendance, payments, expenses
  - QR generation + scan check-in flow
  - Reports/export (CSV, Excel, PDF)
- SaaS:
  - Tenant onboarding flow
  - Super admin tenant controls and analytics rollup
  - Stripe subscription checkout support
- AI:
  - Gemini assistant (`gemini-2.0-flash` default)
  - Conversation history scoped per tenant/account/user
- Offline-first:
  - IndexedDB writes first
  - Sync queue retry/backoff
  - Service worker caching + background sync trigger

## Environment Variables
Create `.env` in project root:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_STRIPE_CHECKOUT_ENDPOINT=https://script.google.com/macros/s/.../exec
```

Notes:
- `.env` is ignored by git.
- `npm run prepare:env` generates `env.js` from `.env`.
- Do not commit real secrets.

## Setup
```bash
npm install
npm run prepare:web
npm run serve
```

Open `http://localhost:4173`.

## Google Cloud Configuration
1. Create OAuth Client ID in Google Cloud Console (Web application).
2. Add authorized origins (for local dev and production host).
3. Set `VITE_GOOGLE_CLIENT_ID`.
4. Create Gemini API key and set `VITE_GEMINI_API_KEY`.
5. Create a Google Sheet + Apps Script project.
6. Paste `apps-script.gs` and deploy as Web App.
7. Save endpoint in APP Developer settings or `VITE_STRIPE_CHECKOUT_ENDPOINT` for billing checkout action.

Apps Script actions implemented:
- `ping`
- `syncChange`
- `getAll`
- `exportSnapshot`
- `saveQr`
- `onboardTenant`
- `listTenants`
- `updateTenantStatus`
- `createStripeCheckout`

## Stripe Setup (Optional)
In Apps Script project properties, set:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`
- `STRIPE_PRICE_PRO`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

In app settings (APP Developer -> Billing), set:
- Stripe publishable key
- Checkout endpoint
- Plan price IDs (optional override)

## Tests
```bash
npm test
npm run stress:test
```

Stress profile:
- 1000 students
- 10000 attendance rows
- 5000 payments

## Build Android APK
```bash
npm run android:sync
cd android
gradlew assembleDebug
```

Generated APK:
- `android/app/build/outputs/apk/debug/app-debug.apk`

## GitHub Actions APK Workflow
Workflow: `.github/workflows/android-apk.yml`

Artifacts:
- `data-insights-debug-apk`
- `android-gradle-build-log`

## Deployment
- Web: static hosting (optional for browser use)
- PWA: same web build with manifest + service worker
- Android: Capacitor build from `www` assets

## AI/Developer Handoff
See: `docs/ai-handoff/README.md`
