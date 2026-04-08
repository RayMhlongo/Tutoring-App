# Changelog

## 4.1.0 - 2026-04-08
- Hardened mobile navigation: compact horizontal tab rail with stable no-wrap behavior and active-tab centering.
- Reduced global UI bulk (spacing, controls, card density) for small Android screens.
- Enforced filter-first data presentation across heavy list modules.
- Upgraded Reports with stronger category flow and added `expense` summary category.
- Added report filtering by date, student, tutor, and status with safer default preview limits.
- Improved insights with real-data week-vs-week trend logic.
- Replaced localStorage-primary persistence with IndexedDB-first storage via Dexie runtime and migration path.
- Removed startup cache-reset hack and introduced safer PWA service worker update strategy.
- Improved offline fallback page and native status-bar fit behavior in Android MainActivity.
- Updated handoff documentation and QA checklist for final client readiness.
