# Deployment Checklist

1. Install dependencies: `npm install`.
2. Run tests: `npm test`.
3. Build web assets: `npm run prepare:web`.
4. Validate PWA shell loads offline once after an online load.
5. Validate navigation on 320px width (no overlap/wrap).
6. Validate report print preview in A4 mode.
7. Run Android sync: `npm run android:sync`.
8. Build debug APK: `npm run android:build:debug`.
9. Install APK and verify icon + status bar spacing on device.
10. Perform a backup + restore dry run before client handoff.
11. Change default admin passcode before production handoff.
