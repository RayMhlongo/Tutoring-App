# Changelog

## 3.0.0 - 2026-04-06
- Full architectural rebuild to single-business offline-first model.
- Removed Stripe/subscription/tenant SaaS logic and related modules.
- Introduced modular feature folders and repository-based data access.
- Added local JSON backup/restore with encrypted backup option.
- Added optional Google Drive backup queue adapter.
- Added rule-based insights engine and optional AI summary adapter.
- Replaced monolithic UI with mobile-first modular shell and feature views.
- Hardened PWA caching strategy and update signaling.
- Updated docs with client/developer handoff and operational checklists.