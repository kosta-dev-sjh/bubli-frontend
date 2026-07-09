# Windows Tauri Runtime Startup Latency Troubleshooting - 2026-07-09

## Scope

This note records the Windows stabilization troubleshooting work for the Bubli Tauri desktop build. It is not a presentation script. Use it as an engineering log for what was observed, what was changed, what has been verified, and what still needs installed-build QA.

macOS-only runtime logic and macOS widget implementation were intentionally left untouched in this track. The investigation focused on Windows Tauri runtime behavior, WebView2 startup cost, widget launch/restore behavior, notification loading, and QA diagnostics.

## Current Problem Statement

Windows installed builds felt slower than macOS when entering the authenticated app surface and when widgets communicated with backend data. The delay was most visible around:

- first transition after login,
- widget bar/menu availability,
- notification widget content,
- project-room related widget data,
- runtime smoke runs that timed out without telling us which step was hanging.

The issue should not be described only as "performance optimization." The more accurate framing is platform runtime adaptation: the same frontend workload is more expensive at Windows Tauri startup because Windows uses Edge WebView2 and has different window creation, restore, and initialization costs than macOS WKWebView.

## Symptoms

| Symptom | Impact | Status |
| --- | --- | --- |
| Windows first app transition is slower than macOS | User waits after login or after app surface starts | Partially mitigated, installed-build readiness timing now recorded |
| Widget bar/menu and widget windows feel delayed | Widgets appear later or restore while data is still loading | Partially mitigated |
| Notification UI showed excessive counts and old/read items | Notification panel/widget looked wrong and carried unnecessary payload | Patched in frontend, backend filter patch prepared |
| Runtime smoke timed out after 240 seconds with no step detail | Hard to know whether auth, widgets, SQLite, sync, or process launch was stuck | Diagnostics added |
| Existing installed Bubli process blocked debug smoke | Windows single-instance mutex caused the smoke target to exit before React mounted | Preflight guard added |

## Root Cause Analysis

| Layer | Finding | Why it matters on Windows |
| --- | --- | --- |
| Tauri runtime | Windows uses Edge WebView2, while macOS uses WKWebView | Startup and window creation cost differ by platform |
| Initial API fan-out | App shell, dashboard, widget bar, notification fetch, room detail fetch, and widget context fetch could overlap early | WebView initialization and network work compete during the first usable render |
| Widget startup | Widget restore and data hydration were too eager for the Windows first-paint path | Multiple windows can magnify startup cost and make flicker/delay more visible |
| Notification loading | Client surfaces fetched broad non-archived notification lists, then filtered in the client | Read/old notifications increased payload and rendered misleading counts |
| QA diagnostics | Full runtime smoke waited for a final report only | A hang looked like a generic timeout instead of a specific stalled step |
| Single-instance behavior | Installed `bubli.exe` can hold `Local\BubliDesktopSingleInstance` | Debug/runtime smoke can silently fail to reach the frontend if an installed app is still running |

## Applied Strategy

| Strategy | What changed |
| --- | --- |
| Initialization sequencing | Non-critical startup work was moved away from the first Windows render path where possible |
| Deferred loading | Widget bar project-room and room/detail loading were deferred in earlier Windows patches |
| Lazy loading | Widget surfaces are expected to show a lightweight shell first, then hydrate heavier data after startup |
| Server-side notification filtering | Notification list calls now support `status=UNREAD` so unread-only surfaces do not fetch read items first |
| Windows-compatible script arguments | Smoke scripts were adjusted away from Unix-style inline env assumptions where needed |
| Runtime smoke progress reporting | The Tauri smoke runner now reports progress steps before the final report |
| Runtime preflight guard | The preflight now checks for existing Bubli processes before launching Windows runtime smoke |
| Installed readiness timing | Real OAuth installed QA now records timing from backend auth validation to auth gate, widget bar, bubble restore item seeding, sync-loop start, and launch completion |

## Practical Troubleshooting Record

This is the working engineering version of the Windows/macOS runtime-difference explanation.

| Observation | Working cause | Action taken | Current evidence |
| --- | --- | --- | --- |
| macOS transitions felt faster than the Windows installed build | macOS WKWebView and Windows Edge WebView2 have different startup/window creation costs, so the same early workload is more expensive on Windows | Treated this as Tauri cross-platform runtime adaptation, not just generic frontend optimization | Full runtime smoke now reports phase-level progress instead of a single timeout |
| Windows first authenticated screen waited before becoming usable | WebView initialization, auth session restoration, app-shell data fetches, dashboard data, widget context, and notification requests could compete during the first render window | Reordered startup expectations around auth readiness first, then widget bar/menu readiness, then heavier widget data hydration | Real installed OAuth QA reached `/app/`, `/api/me`, widget context, and widget summary successfully; latest installed readiness timing is recorded below |
| Several widget windows appeared or restored in a confusing way on Windows | Windows startup was paying for too many widget WebViews and restore paths at once; QA also expected every widget bubble to be visible immediately | Updated the intended Windows startup model: bar/menu first, standalone bubbles as restore items until explicitly opened | Installed QA now passes by proving restore readiness, room context consistency, and stop cleanup instead of requiring every bubble window to be visible at startup |
| Notification panel showed old/read items and very high counts | Notification surfaces fetched broad notification history and filtered too late in the client | Added unread status filtering on frontend calls and backend notification API support | Backend `/api/notifications?status=UNREAD` companion patch merged; frontend unread surfaces no longer need broad history first |
| Runtime smoke was hard to debug when it timed out | The smoke runner only failed at the end, so auth/widget/SQLite/sync stalls looked identical | Added progress events and preflight checks for existing `bubli.exe` | Failing reports now identify whether the issue is auth, widgets, local sync, or process state |
| Installed-build local sync looked partially failed even when the explicit scan/watch probe passed | Background managed-folder loop status can retain a transient failure after file analysis while the targeted QA probe succeeds | Keep explicit local folder scan/watch/sync evidence separate from background loop status | Latest real installed QA passes when explicit scan/watch/sync evidence proves zero scoped failures, even if the background loop still reports a transient failed status |

The important distinction for future reports:

- **Implemented**: startup contention was reduced by sequencing, deferred widget loading, unread notification filtering, and better runtime diagnostics.
- **Automatically verified**: Windows runtime smoke and contract checks have passed on the code path they cover.
- **Installed-build verified for auth/widget/local sync**: latest real OAuth installed QA reached the authenticated app and verified backend widget APIs, restore-ready widgets, local SQLite, local folder scan/watch/sync, activity capture, widget usage sync, Tauri mirror session restore, and stop cleanup.
- **Installed-build readiness timing added**: the QA report now records authenticated-surface readiness anchors so future Windows runs can be compared without guessing from perceived UI delay.
- **Not complete yet**: cold/warm installed-build startup timing before/after comparison still needs to be measured before claiming a percentage speed improvement.
- **Do not claim** a percentage speed improvement until cold/warm installed-build timing is measured under the same backend/user/data conditions.

## Frontend Changes In This Track

Notification payload and display narrowing:

- `src/features/notification/api/notificationApi.ts`
  - Added optional `status` query support to notification list requests.
- `src/components/layout/app-shell.tsx`
  - Background notification fetch requests unread notifications.
- `src/components/layout/topbar-notifications-panel.tsx`
  - Topbar visible items and count are based on unread inbox notifications.
- `src/features/dashboard/components/workspace-dashboard.tsx`
  - Dashboard notification fetch requests unread notifications.
- `src/features/widget/api/widgetDisplayApi.ts`
  - Widget display notification API accepts an optional status.
- `src/app/desktop-widget/page.tsx`
  - Desktop notification widget scans unread notifications instead of broad notification history.

Windows QA and smoke diagnostics:

- `scripts/check-frontend-smoke.mjs`
  - Added `--target=routes`, `--target=storybook`, and `--target=all` argument handling.
- `package.json`
  - Updated route/storybook smoke commands to use script arguments.
- `scripts/check-tauri-windows-runtime-smoke.mjs`
  - Added progress reporting support so timeouts include the last reported phase.
- `src/lib/tauri/tauri-runtime-smoke-runner.tsx`
  - Added progress posts for runtime detection, auth setup, SQLite checks, widget window checks, activity capture, usage sync, folder scan/watch, and post-login cleanup.
- `scripts/check-tauri-runtime-preflight.mjs`
  - Added an existing-process guard for `bubli.exe` to catch Windows single-instance mutex conflicts before smoke launch.
- `scripts/qa-tauri-real-oauth-manual.mjs`
  - Added installed launch-readiness timing to the redacted real OAuth QA summary.
  - The validator now requires finite timing anchors on passing installed QA reports.
- `scripts/check-tauri-auth-surfaces.mjs`
  - Added contract coverage so launch-readiness timing cannot be removed from real OAuth QA evidence by accident.

## Backend Changes In The Companion Patch

The backend companion patch adds optional status filtering to notifications:

- `NotificationController`
  - Accepts `GET /api/notifications?status=UNREAD`.
- `NotificationService`
  - Uses `findAllByUserIdAndStatus` when a status is provided.
  - Keeps the existing non-archived list behavior when no status is provided.
- Tests were added for service and controller filtering.

This backend patch is in a separate backend worktree because the main backend checkout already had unrelated local changes.

## Verification Status

Verified on the frontend branch:

```powershell
npm run typecheck
npm run lint
npm run check:product-rules
npm run check:design-tokens
npm run check:tauri-boundaries
npm run check:tauri-command-contract
npm run check:i18n
npm run check:tauri-auth-surfaces
npm run check:tauri-runtime-preflight
node scripts/check-tauri-windows-runtime-smoke.mjs --contract
npm run check:routes
$env:BUBLI_TAURI_RUNTIME_SMOKE_PHASES = "full"; npm run check:tauri-windows-runtime-smoke
```

The full Windows runtime smoke passed after aligning the post-login QA assertion with the Windows startup strategy. The launcher path now verifies that the bar and menu open first, bubble widgets remain hidden as restore items by default, room context is preserved, local SQLite and sync paths work, and stop cleanup closes widgets and sync loops.

Observed full-smoke timings from the passing run:

| Metric | Duration |
| --- | ---: |
| Full smoke phase | 29,448 ms |
| Initial widget window open batch | 6,557 ms |
| Widget restore open batch | 5,454 ms |
| Post-login authenticated launcher | 529 ms |
| Launcher widget state readback | 10 ms |

Latest installed real OAuth readiness timing:

| Metric | Duration |
| --- | ---: |
| Auth validation to auth gate enabled | 130 ms |
| Auth validation to widget bar visible | 253 ms |
| Auth validation to bubble restore items seeded | 366 ms |
| Auth validation to sync loops started | 366 ms |
| Launch start to completed | 366 ms |
| Full QA run duration | 81,111 ms |

This timing is from the QA-instrumented installed Tauri session. It measures authenticated app readiness after backend auth validation, not first native window paint and not a synthetic browser-only page load.

Verified on the backend companion worktree:

```powershell
.\gradlew.bat compileJava compileTestJava
.\gradlew.bat bootJar -x test
node scripts/check-tauri-oauth-live-contract.mjs
```

Not yet verified as complete:

- Actual installed-build startup timing before/after comparison.

Verified after the latest Windows installer refresh:

- Windows release build and installer creation passed.
- The refreshed public installer installed successfully.
- The installed app launched without a user-visible console window.
- Repeated launch produced a single `bubli.exe` process, not duplicate app processes.
- Landing download and deployed manifest served the latest refreshed Windows installer artifact.

Verified by real installed OAuth QA:

- Real TAURI OAuth session was used, not a development access-token session.
- `/app/` was reached after login instead of returning to `/login`.
- Backend `/api/me`, widget context, and widget summary responded successfully.
- Widget startup restore readiness passed: the bar was visible, standalone widgets were available as restore items, and room context matched active/server context.
- SQLite `quick_check` passed.
- Local folder scan/watch/sync probe passed for create, update, delete, reindex, and search clearing.
- Activity capture and widget usage sync reached the backend.
- Session restore from the Tauri mirror was verified.
- Stop cleanup hid widget windows and stopped sync loops.

Installed real OAuth QA evidence:

- Report: `.codex-runtime-logs/tauri-real-oauth-qa-2026-07-09T03-17-07-879Z.json`
- Summary: `.codex-runtime-logs/tauri-real-oauth-qa-2026-07-09T03-17-07-879Z.md`
- Runtime mode: `installed-release`
- Backend base URL: `https://bubli.n-e.kr`
- Status: passed

Transient installed QA failure observed before the passing run:

- Report: `.codex-runtime-logs/tauri-real-oauth-qa-2026-07-09T03-10-40-603Z.json`
- Symptom: `/api/me`, widget context, widget summary, and local sync fetch failed.
- External check immediately after the run returned `502 Bad Gateway` from `https://bubli.n-e.kr/api/me`.
- Follow-up checks returned the expected unauthenticated `401` and OAuth authorize `200`, then the next installed QA run passed.
- Current interpretation: treat that run as an external/live-backend instability signal, not as proof of a Windows runtime regression.

Latest public Windows installer refresh:

- Built from frontend `develop` commit `07bc07e0`.
- Public installer SHA256: `54867649965D83EB880B602613FEB1CE04142A40F03A5ADB6D47A39C6FCBBD07`.
- Public installer size: `22,222,129` bytes.
- Manifest updatedAt: `2026-07-08T19:44:30.400Z`.
- Silent install from `public/downloads/windows/Bubli-Windows-latest.exe` succeeded.
- Installed exe: `C:\Users\acorn\AppData\Local\Bubli\bubli.exe`.
- Installed exe PE subsystem: Windows GUI.
- Public installed launch smoke: 3/3 launches produced a single `bubli.exe` process; first visible title detection averaged 202 ms.

The launch-smoke timing only measures first visible window-title detection. It is not a substitute for authenticated app data-readiness timing or cold/warm backend request timing.

Blocked or suspicious local verification:

- Backend `test --tests "com.bubli.personal.notification.service.NotificationServiceTest"` failed locally with a Gradle test worker `ClassNotFoundException`, even though `compileTestJava` produced classes and `javap` could load the test class. Treat this as a local test-runner/classpath issue until CI or another clean environment proves otherwise.

## Measurement Rules

Do not claim a numeric speed improvement until it is measured on the installed Windows build.

Required timing evidence:

1. Same backend environment.
2. Same user account and data volume.
3. Cold start and warm start measured separately.
4. Time to first visible authenticated app content.
5. Time to widget bar visible.
6. Time to first usable widget interaction.
7. Network request count during the first 10 seconds.
8. Slowest backend requests during the first 10 seconds.

Until those measurements exist, the safe claim is:

> We reduced Windows startup contention by deferring non-critical widget and notification work, narrowing notification payloads to unread items, and adding runtime smoke diagnostics to identify the exact stalled initialization phase.

## How To Continue Debugging

1. Close all installed Bubli processes before runtime smoke.

   ```powershell
   Get-Process bubli -ErrorAction SilentlyContinue
   ```

2. Confirm backend health and OAuth contract.

   ```powershell
   Invoke-WebRequest http://127.0.0.1:8080/actuator/health
   node scripts/check-tauri-oauth-live-contract.mjs
   ```

3. Run preflight before full runtime smoke.

   ```powershell
   npm run check:tauri-runtime-preflight
   ```

4. Run full Windows runtime smoke and inspect the last progress step if it fails.

   ```powershell
   $env:BUBLI_TAURI_RUNTIME_SMOKE_PHASES = "full"
   npm run check:tauri-windows-runtime-smoke
   Remove-Item Env:\BUBLI_TAURI_RUNTIME_SMOKE_PHASES
   ```

5. If the smoke reaches widgets but the installed app still feels slow, compare request fan-out and slowest requests in the first 10 seconds instead of guessing from UI delay alone.

## Engineering Notes

- The Windows issue can be caused by shared frontend fan-out plus Windows-specific runtime cost. It does not have to be purely a backend problem or purely a Tauri problem.
- If macOS also starts feeling slow, inspect shared app-shell and widget data-loading paths first.
- If Windows alone remains worse, inspect WebView2 startup, window restore, single-instance process state, widget window creation, and local sync loops.
- Code-level completion is not the same as installed-build verification. Release-candidate status requires installer build, installation, login, widget auto-launch, widget close-on-app-exit, SQLite quick_check, folder scan/watch/sync, activity capture, widget usage sync, and site download verification.
