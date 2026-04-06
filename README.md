# EduPulse by Ray

EduPulse by Ray is an offline-first tutoring operations app rebuilt for a single tutoring business instance (not SaaS), with mobile-first UX, filter-first data views, safe local backup/restore, and Android-ready packaging.

## What This Build Delivers
- Single-business architecture with local admin lock/login.
- Filter-first workflows for Students, Tutors, Schedule, Lessons, Attendance, Payments, and Expenses.
- Balanced dashboard with KPIs, upcoming sessions, and recent activity.
- Reports with summary + overdue analysis, CSV exports, and A4 print/PDF-ready layout.
- Smart rule-based insights (works fully offline; AI is optional extension).
- Safe backup/restore with metadata envelope and overwrite confirmation.
- PWA + Capacitor Android build flow.
- Custom branded app icons (using your provided logo).

## Current Architecture
```text
src/
  core/
    constants.js
    helpers.js
    store.js
  features/
    pages.js
  ui/
    render.js
  main.js
styles/
  main.css
icons/
  *.png
```

## Setup
```bash
npm install
npm run serve
```
Open `http://localhost:4173`.

Default access:
- Username: `admin`
- Passcode: `1234`

## Build and Android
```bash
npm run prepare:web
npm run android:sync
npm run android:build:debug
```
APK output:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- mirrored to `release/app-debug.apk`

## Backup and Restore
1. Open `Backup` tab.
2. Click `Back Up Now` to export JSON (includes version, timestamp, business name, counts).
3. For restore, choose backup file, tick overwrite confirmation, then restore.

## Reports
Reports tab includes:
- Business summary metrics
- Overdue payment report
- CSV exports
- A4 print layout suitable for PDF export

## PWA and Cache Safety
- Service worker enabled for web only (disabled on native Capacitor runtime).
- Startup cache reset guard in `index.html` to avoid stale module mismatches.

## Client Handoff Notes
- App is fully usable offline.
- Keep periodic backup files safely stored.
- Change default passcode in Settings immediately.
- Use Reports -> A4 Print/PDF for printable summaries.

## Developer Handoff Notes
- Keep module boundaries: `core` (state/data), `features` (domain screens), `ui` (shared rendering).
- Avoid reintroducing SaaS/Stripe/tenant complexity.
- Keep list-heavy screens filter-first to prevent overload on mobile.
- Test dark mode and mobile widths before release.
