# Deployment Checklist

1. Confirm default passcode has been changed from `1234`.
2. Set business branding (name, accent color, logo assets if customized).
3. Validate backup settings and run a test backup + restore preview.
4. If using Drive backup, configure OAuth Client ID and test upload.
5. If using AI, configure endpoint/key and validate response handling.
6. Run `npm test` and ensure all tests pass.
7. Run `npm run prepare:web` before Capacitor sync.
8. Run `npm run android:sync` and verify Android assets updated.
9. Build debug APK and run smoke test on target Android device.
10. Confirm PWA install prompt and offline launch behavior.
11. Verify no hardcoded secrets are committed.
12. Hand over encrypted backup policy and passphrase management notes.