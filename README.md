# EduPulse by Ray

EduPulse by Ray is a premium offline-first tutoring management app for small tutoring businesses.

## What this rebuild changed
- Removed SaaS complexity: no Stripe, subscriptions, tenant billing, plan limits, or super-admin tenant registry.
- Rebuilt architecture into modular domain features with a clean local-first data layer.
- Added robust local backup/restore, optional Google Drive backup queue, and rule-based insights with optional AI summaries.
- Kept Android-ready Capacitor workflow and installable PWA behavior.

## Stack
- Plain modern JavaScript modules (no frontend framework lock-in)
- IndexedDB via Dexie (local-first persistence)
- PWA service worker with selective static caching
- Capacitor for Android packaging
- Optional integrations:
  - Google Drive backup (OAuth client ID required)
  - AI summaries (OpenAI-compatible endpoint + API key)
  - QR generation and lightweight QR attendance check-in

## Project Structure
```text
src/
  app/              bootstrap, route, app state
  core/             constants, validation
  data/             db schema/client, repositories, seed/reset
  features/         dashboard, students, tutors, schedule, lessons, attendance,
                    payments, expenses, reports, insights, backup, settings, auth
  integrations/     google-drive, ai, qr
  ui/               reusable UI primitives, shell layout, theme handler
  pwa/              service worker registration
  utils/            shared helpers + crypto
```

## Setup
```bash
npm install
npm run serve
```
Open `http://localhost:4173`.

Default login:
- Username: `admin`
- Passcode: `1234`

Change passcode in Settings immediately for production use.

## Build and Android
```bash
npm run prepare:web
npm run android:sync
npm run android:open
```
For debug APK:
```bash
npm run android:build:debug
```

## Backup and Restore
### Local backup
1. Open `Backup`.
2. Click `Back Up Now` to export JSON.
3. Optional: enable encryption + passphrase.

### Restore
1. Select backup file in `Backup`.
2. Click `Preview restore` and review metadata.
3. Confirm overwrite checkbox.
4. Restore.

### Google Drive backup (optional)
1. Open `Settings -> Backup Integrations`.
2. Enable Google Drive backup.
3. Set Google OAuth Client ID.
4. In `Backup`, click `Queue Cloud Backup` and then `Run Queue` when online.`r`n5. Use `Restore Latest From Drive` to recover newest cloud backup (overwrite confirmation required).

## AI Insights (optional)
Rule-based insights always work offline.

To enable AI summaries:
1. Open `Settings -> AI Integrations`.
2. Enable AI and set endpoint, API key, and model.
3. Use `Insights` page to generate narrative summaries.

## Data model highlights
Core entities include:
- students
- tutors
- lessons
- attendance
- payments
- expenses
- scheduleEvents
- notes
- reports
- activityLog
- backupJobs
- settings

Each business entity uses:
- `id`
- `createdAt`
- `updatedAt`
- `archivedAt`
- `status`
- `version`

## Client Handoff
- The app works fully offline after install.
- Data saves locally first and is immediately available.
- Cloud backup is optional and safe to skip.
- If internet drops, continue working; run cloud backup queue later.
- Keep encrypted backup files and passphrases safely.

## Developer Handoff
- Routing is hash-based and feature modules are isolated under `src/features/*`.
- Repository contract supports `create`, `update`, `archive`, `getById`, `list`, `search`, `stats`.
- Avoid adding SaaS/tenant abstractions unless product direction changes.
- Keep runtime-critical libraries local (avoid fragile CDN dependencies for core flow).

## Optional Integrations
- Google Drive backup adapter (`src/integrations/google-drive/driveAdapter.js`)
- AI adapter (`src/integrations/ai/aiAdapter.js`)
- QR adapter (`src/integrations/qr/qr.js`)

## Seed and Reset
- Demo data seeds automatically on first launch.
- Full reset utility available in `src/data/seed/demo.js` via `resetAllData()`.

## Quality Notes
- Mobile-first styles and touch targets
- Dark mode with readable contrast
- Overflow-safe cards/tables/forms
- Restore safeguards with preview + overwrite confirmation