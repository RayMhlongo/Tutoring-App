# EduPulse by Ray

EduPulse by Ray is a mobile-first, offline-first tutoring business app for a single business instance. It is optimized for real owner workflows (daily operations, payments, attendance, schedule, reports, and backup).

## Final Architecture
- `src/main.js`: bootstrap, routing, lifecycle, service worker registration
- `src/core/store.js`: IndexedDB-first persistence with safe localStorage migration
- `src/features/pages.js`: business modules + filter-first pages + reports/insights logic
- `src/ui/render.js`: shared shell and UI primitives
- `styles/main.css`: design system tokens + responsive/mobile styles

## Storage Layer
Primary storage is now IndexedDB (Dexie runtime from local vendor asset), with fallback safety for localStorage-only environments.

Migration behavior:
1. On startup, app reads IndexedDB state.
2. If not found, it reads legacy localStorage data and migrates it into IndexedDB.
3. If nothing exists, it seeds demo data.

## Run and Test
```bash
npm install
npm run serve
npm test
```

## Web/PWA Build
```bash
npm run prepare:web
```

## Android Build
```bash
npm run android:sync
npm run android:build:debug
```
APK paths:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- mirrored to `release/app-debug.apk`

## Key Product Behaviors
- Compact top navigation with mobile-safe horizontal scroll and active-tab centering
- Filter-first records pages (lists appear only after narrowing/filtering)
- Reports by category with date/student/tutor/status filters
- A4 print/PDF-friendly report output with branding header
- Rule-based insights grounded in actual app data
- Optional AI narrative enhancement using report context data

## Backup/Restore
- Export: `Backup -> Back Up Now` (JSON envelope with metadata)
- Restore: select JSON file + explicit overwrite confirmation
- Backup metadata includes app version, business name, timestamp, and record counts

## Client Handoff Notes
- Change default login passcode immediately after installation
- Run a backup after initial setup and save it securely
- Use Reports tab for owner reviews and A4 printouts
- App works offline; reconnect for web updates/cloud integrations

## Developer Handoff Notes
- Keep runtime dependencies local and deterministic
- Preserve filter-first UX in all list-heavy modules
- Keep reports and insights data-grounded (no generic narratives)
- Avoid reintroducing SaaS/subscription complexity

## Optional Integrations
- AI endpoint (settings): optional and safe-fallback to rule-based summaries
- Google Drive backup adapter: reserved path for optional future extension
