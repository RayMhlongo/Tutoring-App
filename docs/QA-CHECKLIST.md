# QA Checklist

## Core flows
1. Login succeeds with valid credentials; fails with invalid credentials.
2. Students CRUD + archive works.
3. Tutors CRUD + archive works.
4. Schedule create and listing works on mobile widths.
5. Lessons create and status changes work.
6. Attendance manual mark works.
7. QR check-in starts/stops and marks attendance.
8. Payments and balances compute correctly.
9. Expenses totals render correctly.
10. Reports export CSV files with readable values.

## Backup and restore
1. Local backup JSON exports successfully.
2. Encrypted backup requires passphrase.
3. Restore preview shows metadata and counts.
4. Restore requires overwrite confirmation.
5. Cloud backup queue can enqueue while offline.
6. Queue processing reports success/failure clearly.

## Offline and PWA
1. App starts offline after initial load.
2. New records save while offline and remain after reload.
3. Online/offline indicator updates correctly.
4. Service worker update message appears when new version is available.

## UI/UX and accessibility
1. No horizontal overflow on common phone widths.
2. Dark mode text remains legible in all major views.
3. Buttons and controls meet touch target size.
4. Long names wrap without card or table breakage.
5. Empty states and error toasts display clearly.