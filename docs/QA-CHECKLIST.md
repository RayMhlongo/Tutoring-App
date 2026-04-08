# QA Checklist

## Navigation and Mobile UX
1. Top tab rail scrolls horizontally with no overlap and no wrapping on 320-430px widths.
2. Active tab is always visible and auto-centered after route changes.
3. Header + nav do not collide with Android status bar area.
4. No clipped labels or horizontal overflow in top navigation.

## Core Module Flows
1. Login success/failure behavior works correctly.
2. Student/Tutor/Schedule/Lesson/Attendance/Payment/Expense create flows persist after reload.
3. Records are not dumped by default; filters/search/category selection are required first.
4. Archive actions keep records out of active views.

## Reports and Insights
1. Report categories render correctly (business, payments, overdue, attendance, students, tutors, lessons, expenses).
2. Filters (date, student, tutor, status) apply correctly.
3. CSV export reflects current filtered report.
4. A4 print layout has readable tables and no cut-off content.
5. Smart summary text is grounded in current app data.
6. AI summary fallback path works when AI config is missing.

## Storage and Backup
1. First launch seeds demo data when no data exists.
2. Legacy localStorage data migrates into IndexedDB on startup.
3. Backup export JSON includes metadata and record counts.
4. Restore requires explicit overwrite confirmation.

## PWA and Offline
1. App loads offline after prior online install.
2. Service worker update prompt appears when a new version is installed.
3. Offline navigation fallback page appears for failed navigations.

## Android
1. `npm run android:sync` succeeds.
2. `npm run android:build:debug` succeeds.
3. Home-screen icon is correct branded icon.
4. App content respects system bars (time/status area stays visible).
