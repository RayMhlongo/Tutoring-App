# Data Insights by Ray Platform - AI Handoff

## Purpose
Data Insights by Ray Platform is an offline-first tutoring and analytics system with SaaS-ready tenant separation.

## Runtime Architecture
- App bootstrap: `src/app.js`
- UI orchestration: `src/ui.js`
- Theming: `src/theme.js`
- Local DB: `src/storage.js` (Dexie, IndexedDB)
- Sync engine: `src/sync.js`
- Google API transport: `src/api.js`
- Auth/session: `src/auth.js`
- AI assistant: `src/ai.js`
- Charts: `src/charts.js`
- Domains:
  - `src/tutors.js`
  - `src/students.js`
  - `src/scheduler.js`
  - `src/lessons.js`
  - `src/attendance.js`
  - `src/payments.js`
  - `src/reports.js`
  - `src/backup.js`
  - `src/analytics.js`
  - `src/qr.js`

## Multi-Tenant Model
- All records are normalized with `tenantId` and `accountId` in `saveRecord()`.
- Active profile (`settings.syncProfiles`) controls tenant context.
- Sync payloads include `tenantId` and `changeId`.

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

## Google Apps Script Backend
File: `apps-script.gs`

Supports:
- `ping`
- `syncChange`
- `getAll`
- `exportSnapshot`
- `saveQr` (stores student QR images in tenant Drive folder)

Sheets include tenant-aware row headers:
- `id, tenantId, accountId, createdAt, updatedAt, deleted, payload`

## QR System
- QR value format default: `DIR:{tenantId}:{id}`
- Student registration:
  - creates student ID
  - creates QR value
  - stores QR image data URL
  - opens QR modal (download/print)
  - optional Drive upload via `saveQr`
- Scanner:
  - local vendored `html5-qrcode`
  - permission preflight + normalized errors
  - tenant mismatch protection
  - on scan: load student, log attendance, open lesson flow

## AI Assistant (Gemini)
- View: nav `AI Assistant`
- Settings: APP Developer -> AI Assistant
- Uses Gemini `generateContent` API from client
- Stores conversation history in `messages` table per account/user/tenant

## Dashboard Analytics
- KPI cards + super admin rollup
- Google Charts widgets:
  - Subject popularity
  - Attendance trend
  - Revenue trend
  - Tutor effectiveness
- Filters: student, subject, grade, date range

## Settings Split
- Tutor-facing config remains accessible.
- Sensitive config under APP Developer lock:
  - auth/OAuth
  - Google sync profiles
  - Gemini API

## Branding
- Brand: Data Insights by Ray
- Logo: `assets/logo/data-insights-logo.svg`
- PWA/app icons: `icons/*`
- Capacitor config name/id updated.

## Build/Distribution
- Workflow: `.github/workflows/android-apk.yml`
- Artifact: `data-insights-debug-apk`

## Validation Commands
```bash
npm test
npm run stress:test
npm run android:sync
```
