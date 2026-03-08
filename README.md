# Data Insights by Ray Platform

Offline-first, multi-tenant tutoring operations platform that runs as:
- Web app
- Progressive Web App (installable)
- Android APK (Capacitor)

## Core Features
- Secure auth:
  - Local admin login (offline-capable)
  - Optional Google login (allowed-email restriction)
  - Cached sessions for offline reuse
- Multi-tenant data model:
  - `tenantId` on all runtime records
  - Per-account/tenant isolation
  - SuperAdmin cross-tenant dashboard rollup
- Tutoring operations:
  - Tutors
  - Students (dynamic custom profile fields)
  - Schedule (daily/weekly/monthly)
  - QR check-in attendance
  - Lessons and parent communication
  - Payments and expenses
  - Reports and exports (CSV/Excel/PDF)
- AI Assistant:
  - Gemini integration
  - Tenant-scoped conversation history
- Sync and backup:
  - IndexedDB-first writes (Dexie)
  - Sync queue to Google Apps Script + Google Sheets
  - Google Drive backup/restore support
- Performance and reliability:
  - Runtime logger
  - Input validation
  - Retry/backoff on sync API calls
  - Offline service worker with background sync triggers

## Project Layout
```text
data-insights-by-ray-platform
  /src
  /components
  /styles
  /assets
  /icons
  /docs/ai-handoff
  service-worker.js
  manifest.json
  index.html
  apps-script.gs
  capacitor.config.json
  .github/workflows/android-apk.yml
```

## Local Development
```bash
npm install
npm run serve
```

## Tests
```bash
npm test
npm run stress:test
```

## Google Backend Setup (Free)
1. Open Google Sheet.
2. Extensions -> Apps Script.
3. Paste `apps-script.gs`.
4. Deploy Web App (Execute as Me, Access Anyone).
5. Copy deployment URL.
6. In app Settings -> APP Developer -> Google Sync Accounts, save endpoint.

Supported Apps Script actions:
- `ping`
- `syncChange`
- `getAll`
- `exportSnapshot`
- `saveQr`

## PWA
- `manifest.json` includes standalone install metadata.
- `service-worker.js` caches app shell + runtime assets.

## Android (Capacitor)
```bash
npm install @capacitor/core @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

## GitHub Actions APK
Workflow: `.github/workflows/android-apk.yml`

Outputs:
- APK artifact: `data-insights-debug-apk`
- Build log artifact: `android-gradle-build-log`

Download path:
- GitHub -> Actions -> choose run -> Artifacts -> `data-insights-debug-apk`

## Brand Assets
- Logo: `assets/logo/data-insights-logo.svg`
- App icons: `icons/*`

## AI Handoff
Architecture and implementation summary for other AI tools:
- `docs/ai-handoff/README.md`
