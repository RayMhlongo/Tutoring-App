# Tutoring Business Platform Template

Reusable white-label tutoring management template.

## Included
- Setup Wizard on first run
- Config-driven branding and fields (`config/defaultConfig.json`)
- Offline IndexedDB storage (Dexie)
- Modular source/components structure
- PWA manifest + service worker
- Starter modules for auth, backup, scheduler, analytics, students, lessons, payments, attendance

## Structure
See `/src`, `/components`, `/styles`, `/assets`, `/config/defaultConfig.json`.

## Run
Use a static server from this folder:

```bash
npx serve .
```

## Notes
- This template is intentionally configurable-first and ready for client-specific extension.
- Reuse business logic from the production X-Factor app modules for full deployment builds.
