# X-Factor Tutoring App - AI Handoff

## 1) Purpose
X-Factor Tutoring is an offline-first tutoring business management app for:
- Student registration and flexible profiles
- Lesson planning and lesson records
- QR-based attendance check-in
- Weekly diary/schedule management
- Payments and expenses tracking
- Reports and exports (CSV, Excel, PDF)
- Google Sheets sync and Google Drive backup
- Android APK distribution via GitHub Actions

The app is designed for tutor-first mobile usage during live sessions.

## 2) Tech Stack
- Frontend: Vanilla JS modules + HTML/CSS
- Local database: IndexedDB via Dexie
- Sync backend: Google Apps Script Web App + Google Sheets
- PWA: Service Worker + Manifest
- Android packaging: Capacitor
- APK CI/CD: GitHub Actions

## 3) Runtime Architecture
- Entry point: `src/app.js`
- UI orchestration: `src/ui.js`
- Data persistence: `src/storage.js`
- Sync engine: `src/sync.js`
- Google API transport: `src/api.js`
- Authentication/session: `src/auth.js`
- Feature domains:
  - `src/students.js`
  - `src/lessons.js`
  - `src/attendance.js`
  - `src/payments.js`
  - `src/scheduler.js`
  - `src/reports.js`
  - `src/backup.js`
  - `src/analytics.js`
  - `src/qr.js`

## 4) Data Model (IndexedDB)
Configured in `src/storage.js`:
- `students`
- `lessons`
- `attendance`
- `payments`
- `expenses`
- `schedule`
- `reports`
- `syncQueue`
- `settings`

All writes go to IndexedDB first, then queue a sync item in `syncQueue`.

## 5) Sync Design
`src/sync.js`:
- Queue-first model with retry/backoff.
- Sync requires network and endpoint.
- Endpoint resolution order:
  1. Active sync profile endpoint
  2. `settings.auth.googleSheetsEndpoint` fallback
- Manual sync button now shows specific reason on failure.

`src/api.js`:
- Endpoint validation accepts:
  - `https://script.google.com/...`
  - `https://script.googleusercontent.com/...`
- Actions supported:
  - `ping`
  - `syncChange`
  - `getAll`
  - `exportSnapshot`

Apps Script backend file: `apps-script.gs`.

## 6) Authentication Model
`src/auth.js`:
- Local admin login (username + hashed password with salt)
- Google sign-in (Google Identity Services ID token)
- Allowed Google email restriction supported
- Session stored in app settings DB
- Google session auto-links to sync profile by Gmail

Important:
- For Google login to work, `googleClientId` must be a valid OAuth web client ID for app origin(s).
- Default allowed Gmail prewired: `xfactortutoring2@gmail.com`.

## 7) Developer Lock (APP Developer)
Sensitive settings are protected by a separate developer password in Settings:
- Developer lock state is handled in `src/ui.js`.
- UI rendering is in `components/settings.js`.
- Stored hashed values in settings:
  - `settings.developer.passwordSalt`
  - `settings.developer.passwordHash`

When locked:
- Authentication controls are hidden.
- Google Sync account configuration is hidden.

## 8) QR and Attendance
`src/qr.js`:
- Primary scanner: `html5-qrcode`
- Fallback scanner: native `BarcodeDetector` + `getUserMedia`
- Multi-strategy camera startup:
  - exact environment camera
  - ideal environment camera
  - enumerate cameras and pick rear camera

Flow from `src/ui.js`:
1. Open scanner modal
2. Scan QR
3. Parse student ID
4. Log attendance
5. Auto-create in-progress lesson context
6. Navigate to Lessons

Student registration now auto-opens a QR modal after save, with Download/Print actions.

## 9) Schedule/Diary
`src/scheduler.js` + `components/calendar.js`:
- Daily / Weekly / Monthly views
- Export schedule as PNG/JPEG
- Student names now shown in diary views (instead of raw student IDs)

## 10) Branding and Icons
- Brand/logo asset: `assets/logo/xfactor-logo.svg`
- Manifest icon sources include brand logo and PNG icon set.
- Android workflow now applies branded launcher icons from `icons/` and sets launcher background to brand blue.

## 11) Android Build Pipeline
Workflow: `.github/workflows/android-apk.yml`
- Builds APK on push and manual dispatch
- Prepares Capacitor web assets
- Adds Android platform if needed
- Applies:
  - Camera permission in AndroidManifest
  - Branded launcher icon assets
- Installs Android SDK packages
- Builds debug APK
- Uploads artifacts:
  - `xfactor-tutoring-debug-apk`
  - `android-gradle-build-log`

## 12) Service Worker / Offline
`service-worker.js`:
- App shell caching
- Runtime caching for CDN assets
- Offline fallback
- Background sync trigger messaging

## 13) Settings Behavior Split
Tutor-facing settings remain accessible:
- Business/platform configuration
- Student fields
- Subjects/grades
- Lesson/payment/schedule custom fields
- Backup/export operations

Developer-only settings behind APP Developer lock:
- Authentication setup
- Google OAuth fields
- Google sync profile endpoint configuration

## 14) Known External Dependencies Required
For full Google integration:
1. Google Apps Script Web App endpoint (deployed)
2. Google OAuth client ID (for Google sign-in button)
3. Allowed Google Gmail configured (default prefilled)

## 15) Stress/Quality Checks Performed
- Syntax validation (`node --check`) on changed JS modules
- Sync engine fallback/path checks
- QR scanner startup hardening and fallback implementation
- Android APK CI workflow executed successfully with artifact output

## 16) Suggested Next Enhancements
- Add automated Playwright UI smoke tests for critical flows
- Add Cypress/PWA offline scenario tests
- Add migration script for future schema version upgrades
- Add structured logging view for sync failures in UI

