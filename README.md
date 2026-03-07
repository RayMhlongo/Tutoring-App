# X-Factor Tutoring Management App

Offline-first tutoring business platform, optimized for Android APK distribution and zero monthly platform cost.

## Core Capabilities
- Secure authentication gate:
  - Local admin login (offline capable)
  - Optional Google login with allowed-email restriction
  - Cached session for offline reuse
- Full tutoring workflows:
  - Students (dynamic profile fields)
  - Lessons (PDF summaries + parent communication generator)
  - Attendance (including QR check-in)
  - Payments + expenses
  - Reports/exports (CSV, Excel, PDF)
- Weekly scheduler:
  - Daily / weekly / monthly views
  - Configurable schedule fields
  - Schedule export as PNG or JPEG
- Dashboard analytics:
  - Top improving students
  - Students needing help
  - Weak subjects
  - Most studied subjects
  - Filter support (student, subject, grade, date range)
- Backup/restore:
  - Local JSON/CSV backup
  - Encrypted backup option
  - Restore prompt on fresh install
  - Optional Google Drive backup/restore path
- Sync architecture:
  - IndexedDB-first writes via Dexie
  - Sync queue with retries and duplicate-safe `changeId`
  - Google Apps Script endpoints: `ping`, `syncChange`, `getAll`, `exportSnapshot`
  - Schedule table added to sync
- PWA + APK readiness:
  - Service worker app-shell/runtime caching
  - Manifest + icons
  - Capacitor config
  - GitHub Actions APK workflow artifact

## Project Structure
```text
xfactor-tutoring
  /src
    app.js
    api.js
    auth.js
    analytics.js
    backup.js
    config.js
    storage.js
    sync.js
    scheduler.js
    qr.js
    students.js
    lessons.js
    attendance.js
    payments.js
    reports.js
    ui.js
    theme.js
    utils.js
    view-utils.js
  /components
    auth.js
    dashboard.js
    studentProfile.js
    lessonEditor.js
    calendar.js
    qrScanner.js
    settings.js
  /styles
  /assets
  /icons
  /config
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

Open the local URL in Chrome/Edge.

## Google Sheets Backend Setup
1. Open your Google Sheet.
2. Go to **Extensions -> Apps Script**.
3. Paste `apps-script.gs`.
4. Deploy as Web App:
   - Execute as: `Me`
   - Access: `Anyone`
5. Copy the deployment URL.
6. In app settings, add a sync profile with Gmail label + endpoint URL.

Auto-managed sheet tabs include:
- `Students`
- `Lessons`
- `Attendance`
- `Payments`
- `Schedule`
- `Expenses`
- `Reports`
- `SyncLog`

## Authentication Notes
- First launch requires local admin setup if no local password exists.
- Optional Google login requires:
  - Google OAuth Client ID
  - Allowed Gmail address configured in settings
- Offline login works via cached valid session.

## Android APK Pipeline
Workflow file: `.github/workflows/android-apk.yml`

It will:
1. Install Node, Java, Android SDK
2. Install Capacitor dependencies
3. Add/sync Android platform
4. Build debug APK
5. Upload APK as GitHub Actions artifact

Download path:
- GitHub -> **Actions** -> select run -> **Artifacts** -> `xfactor-tutoring-debug-apk`

## Capacitor Commands
```bash
npm install @capacitor/core @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

## Template Repository
A second reusable scaffold has been created at:

`tutoring-business-platform-template/`

It includes setup wizard + configurable architecture for multi-client white-label tutoring deployments.
