# Midad 0.1.0 local reliability release

The previous snapshot could write demo notes over existing storage after a failed startup read, hide save errors, and replace the workspace on import without confirmation. This release preserves unreadable storage, reports completed saves accurately, blocks stale-tab overwrites, and makes restore reversible.

## Runtime and delivery

- React/TypeScript/Zustand UI with Arabic RTL, lesson/concept templates, math, images, tables, search, and manual review.
- IndexedDB database `midad`, store `kv`: existing `state` plus `revision` and `rollback` keys.
- Compare-and-write revision checking and replacement/rollback are inside single transactions.
- A stale tab becomes read-only after its first conflicting save and can export its in-memory edits.
- The local build is a browser SPA. The original TanStack/Nitro build remains available.
- Ubuntu package runs with Python 3.10+ and a modern browser at `http://127.0.0.1:8765/`. No npm, service account, cloud server, or GPU is needed for the packaged app.
- Browser storage belongs to the exact origin and browser profile. Transfer from any online version using JSON export/import.

## Additional behavior

Backup validation rejects unknown versions/types, duplicate identities, invalid parent ownership, malformed tables/tasks, and broken explicit links. It does not silently drop records.

Restore previews workspace counts and requires confirmation. The old workspace is stored in the same transaction as replacement. Rollback swaps snapshots and survives reopening.

Typed paragraph links keep readable text and store resolved page IDs separately. Renaming the target preserves resolution. Ambiguous titles remain unresolved; use the relationship picker, which shows notebook/section context. Explicit relationships already use IDs.

Study dates use local calendar components. Paragraphs support keyboard editing with focus. Selected toolbars overlay the block instead of moving a link during a mouse click. One deletion can be undone until the next content edit or reload.

## Verification performed on 29 October 2026

- Typecheck, lint, original build, and local build passed.
- 282 existing/new tests passed: 193 script, 59 TypeScript scaffold, 30 notebook-domain.
- Four generator-documentation assertions referencing absent OG skill/agent files were removed. Runtime CLI tests remain. Auth-default assertions now pass using tracked local app defaults.
- Notebook tests cover failed initial reads, corrupt data/revisions, aborted writes, retry, serial ordering, conflicts, strict imports, restore/rollback, undo, references, dates, and HTTP-compatible IDs.
- Browser checks passed for lesson creation, Arabic/English text, inline math, keyboard focus, reopening, rename/navigation, JSON download, restore confirmation, rollback, and a real two-tab conflict.
- The extracted package passed loopback HTTP/asset checks, repeated launch detection, and an isolated application-menu install.

## Boundaries

This is a personal-pilot local browser edition, not an Android APK or native Electron package. Ubuntu GUI menu launch on the user's actual machine, Android, and large-workspace performance remain unverified. No AI, account sync, automatic cloud backup, or permanent trash was added.

The app bundles its scripts/styles/fonts. Imported remote image URLs may still need network access. Normal JSON exports embed uploaded images. Keep periodic exported backups; clearing browser site data removes notebook storage.

## Reproduce

```bash
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run build
npm run package:local
```

The package is produced under `release/`; generated output is ignored by Git. The source branch is intended for review before merge.
