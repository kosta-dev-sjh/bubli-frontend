# Windows Tauri Release Login Loop Troubleshooting - 2026-07-06

## Summary

Built Windows Tauri app login failed in the release artifact, not only in dev. The user-visible symptom was:

- Google login starts successfully.
- Browser/OAuth callback returns to the app.
- The app briefly flashes or moves toward the member workspace.
- It falls back to `/login` instead of staying on `/app`.

This was treated as a release-artifact issue and QA must be run against `src-tauri/target/release/bubli.exe`, not only `npm run tauri:dev`.

## Root Causes Found

| Layer | Problem | Impact |
| --- | --- | --- |
| Backend CORS | Release WebView origin `http://tauri.localhost` was not allowed for authenticated API calls. | OAuth could complete, but `/api/me` and widget APIs could fail after returning to the app. The auth guard then sent the user back to `/login`. |
| Frontend API base | Release/static Tauri needed to default to the deployed backend, while dev still uses localhost. | Built app could point at the wrong API environment. |
| Tauri OAuth handoff | OAuth completion and app navigation were racing. The app could navigate before the WebView local session and Tauri SQLite mirror were both ready. | Login looked successful for a moment, then the app restored an unauthenticated state. |
| Auth surface startup | Widgets could be opened from a stale local session. | Widgets could appear/disappear or open before the real user session was verified. |
| Static Tauri routing | Release build serves static files, so dynamic Next routes need static fallback routes or explicit Tauri route mapping. | Release app could show page load failures even when dev worked. |

## Fixes Applied

| Area | Fix |
| --- | --- |
| Backend | Added release Tauri origin CORS support for `http://tauri.localhost`. Backend PR `#258` was merged. |
| Frontend API client | Production API default now targets `https://bubli.n-e.kr`; development keeps `http://localhost:8080`. |
| OAuth flow | Added native Tauri OAuth loopback commands and completion flow. The frontend stores the session only after the Tauri command returns a token payload. |
| Session persistence | Added Tauri session mirror/restore path so `localStorage` and local SQLite can recover the same real TAURI session. Dev refresh-token sessions are rejected unless explicit dev flags are enabled. |
| Widget startup | `launchTauriAuthenticatedSurfaces()` verifies `authApi.getMe()` before resolving/opening widgets. This blocks stale/mock sessions from opening widgets. |
| Static release app | Added Tauri static dist preparation and static project-room fallback routes for release builds. |

## Verification Evidence

Current branch:

- Frontend branch: `codex/fix-widget-platform-runtime-split`
- Frontend latest merged base at verification time: `origin/develop` `45580bdf`
- Backend latest pulled after verification started: `origin/develop` `4675437`

Checks that passed after the latest frontend develop merge:

```powershell
npm run typecheck
npm run check:tauri-auth-surfaces
npm run check:tauri-boundaries
npm run check:tauri-command-contract
npm run check:tauri-runtime-preflight
npm run build
node scripts/prepare-tauri-dist.mjs
cargo fmt --manifest-path src-tauri\Cargo.toml --check
cargo check --manifest-path src-tauri\Cargo.toml
```

Known Rust warnings during `cargo check`:

- `src-tauri/src/lib.rs`: unreachable statement near widget geometry code.
- Unused macOS/onboarding constants/functions. These are warnings, not build blockers.

Backend release CORS was verified with preflight requests:

- `OPTIONS https://bubli.n-e.kr/api/me`
- Origin: `http://tauri.localhost`
- Result: HTTP 200 with `Access-Control-Allow-Origin: http://tauri.localhost`

Release artifact QA was performed against:

```text
src-tauri\target\release\bubli.exe
```

Evidence observed before the latest rebuild:

- Main WebView history reached `http://tauri.localhost/app/`, not `/login`.
- Widget windows opened after authenticated state was restored.
- `/api/me`, `/api/widget/context`, and `/api/widget/summary` returned 200 with the real TAURI session.
- SQLite contained a real Tauri session mirror and active project room state.

## Current Non-Login QA Failure

`npm run check:tauri-windows-runtime-smoke` currently reaches deep runtime behavior and fails at the final widget usage readback assertion, not at login.

Observed facts from the failed smoke:

- Tauri dev runtime launched.
- `/app` and `/login` loaded.
- All expected widget URLs returned 200.
- Auth session was available.
- Active project room persisted to SQLite.
- Widget context saved and read back from the real backend.
- Widget settings PATCH/GET/restore worked.
- Project room, members, resources, and events loaded from backend.
- Local SQLite backup/restore path ran.
- Native foreground activity capture staged and synced to backend.
- Widget usage rollups were staged and sync API returned success for 8 bubbles.

Failure point:

```text
synced all bubble widget usage appears in real backend today readback
```

The readback returned only one summary row for `2026-07-06` while the smoke expected all synced bubble summaries to be visible in the same "today" readback. This needs a separate follow-up on date/window/readback criteria or backend aggregation timing. It is not the same symptom as the release login loop.

## QA Rule Going Forward

For this issue, do not claim "login fixed" from dev runtime alone.

Minimum release verification:

1. Build the release artifact.
2. Launch `src-tauri/target/release/bubli.exe`.
3. Complete Google login.
4. Confirm latest WebView route is `/app`, not `/login`.
5. Confirm `/api/me` returns 200 using the app session.
6. Confirm all authenticated widgets open only after `/api/me` succeeds.
7. Confirm Tauri SQLite session mirror exists and is not a dev refresh-token session.
8. Close the app and confirm widget windows/processes exit with it.

Do not print access tokens, refresh tokens, or raw session JSON in logs or reports.
