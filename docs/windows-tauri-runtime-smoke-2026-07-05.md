# Windows Tauri Runtime Smoke Evidence - 2026-07-05

## Current Context

- Frontend base before this branch: `2f0933e1`
- Backend verified during this run: local dev backend at `http://localhost:8080`
- Branch: `codex/tauri-runtime-smoke-activity-widget-sync`
- Scope: Windows Tauri runtime smoke only. macOS-specific Tauri logic was not changed.

## What Changed

- The Windows runtime smoke now runs in two phases:
  - `full`: login with the dev access token, open native widgets, exercise SQLite/activity/widget/local-folder flows, queue a SQLite restore.
  - `restore-verify`: relaunch Tauri and prove the queued SQLite restore was applied after app restart.
- SQLite restore verification uses `syncRoomMessages` / `readRoomMessages` as a stable local DB marker, because AppShell can legitimately update the active-room row during `/app` startup.
- Activity smoke no longer stops at local staging. It sends the staged activity row through `activityApi.recordCurrentApp`, marks the exact SQLite row `SYNCED`, then verifies the row is no longer returned by staging.
- Widget usage smoke no longer stops at local rollup. It syncs the exact daily `todo` rollup through `syncLocalWidgetUsageSummaryToServer`, verifies one backend send and one local `SYNCED` mark, then verifies the rollup is no longer pending.
- Widget usage rollup refresh now moves an already-synced rollup back to `LOCAL_ONLY` when new source events change the aggregate count, so same-day widget interactions are not silently skipped.
- Local file event smoke no longer stops at local staging. It sends staged `CREATED`, watched `UPDATED`, and watched `DELETED` events through `managedFolderApi.syncApprovedLocalFileEvents`, then applies the backend response with `markLocalFileEventsSynced`.
- `verify_sqlite_file` now opens backup files read-write for `PRAGMA quick_check`. On Windows, read-only quick_check can fail for FTS5 with `attempt to write a readonly database` while validating the inverted index.

## Commands

```powershell
npm run typecheck
npm run check:tauri-auth-surfaces
npm run check:product-rules
npm run check:tauri-command-contract
npm run check:tauri-boundaries
npm run lint
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml widget_usage -- --nocapture
cargo test --manifest-path src-tauri/Cargo.toml local_db -- --nocapture
npm run check:tauri-windows-runtime-smoke
```

All passed.

## Runtime Evidence

`npm run check:tauri-windows-runtime-smoke` passed with two reported phases.

Full phase:

- Dev access token resolved backend seed user `11111111-1111-4111-8111-111111111111`.
- Backend privacy consent was enabled for `ACTIVITY_CONTEXT` and `MANAGED_FOLDER`.
- Native widget windows opened: `bar`, `todo`, `chat`, `timer`.
- `todo.selectedRoomId` matched `22222222-2222-4222-8222-222222222222`.
- SQLite integrity passed with `quickCheck = ok`, `journalMode = wal`.
- SQLite restore snapshot marker was written at room sequence `777`.
- SQLite backup file was created and listed as latest in the backup manifest.
- Dirty marker was written after backup at room sequence `888`.
- Restore was queued with `requiresRestart = true`.
- Native foreground activity was captured from Windows as `appName = bubli`, `windowTitle = Bubli`, then staged from SQLite.
- The staged activity row reached the real backend and was marked locally as `SYNCED`.
- A follow-up activity stage returned no remaining pending row for the synced activity.
- Widget usage rollup was created for the smoke date and `todo` bubble.
- The widget usage rollup reached the real backend and was marked locally as `SYNCED`.
- A follow-up widget usage stage returned no remaining pending rollup for the synced key.
- Managed folder scan/search/preview/event staging passed against a temp folder.
- Initial `CREATED` file events reached the real backend and were marked locally as `SYNCED`.
- `watchManagedFolder` observed real `UPDATED` and `DELETED` file changes from the Node smoke control server.
- Watched `UPDATED` and `DELETED` events reached the real backend and were marked locally as `SYNCED`.
- A follow-up stage returned no remaining pending watched file events.
- Widget windows were cleaned up at the end.

Restore verification phase:

- Tauri relaunched with the same app data.
- The restored SQLite marker contained only the snapshot message at sequence `777`.
- The dirty message at sequence `888` was absent after restart restore.
- SQLite integrity passed again after restore.

## Remaining Risk

- This is a Windows automated runtime smoke, not a long-duration manual QA pass.
- Long-running native folder watch stability, repeated app restarts, and real user OAuth sessions still need broader QA.
- The CSV/XLSX tracking files remain intentionally ignored and should not be committed.
