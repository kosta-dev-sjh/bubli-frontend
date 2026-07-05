# Windows Tauri Runtime Soak QA 2026-07-05

`npm run check:tauri-windows-runtime-soak` repeats the existing full Windows runtime smoke to catch regressions that only appear after restart, cleanup, watcher reuse, or repeated widget window creation.

The script is Windows-only. Non-Windows platforms skip with exit code 0.

## Run

```powershell
npm run check:tauri-windows-runtime-soak
```

Default behavior:

- Runs `scripts/check-tauri-windows-runtime-smoke.mjs` two times.
- Preserves the existing runtime smoke coverage: backend preflight, seeded real backend data, login-gated bar plus eight bubble widgets, project room context propagation, SQLite backup/restore restart, activity sync, widget usage sync, managed-folder scan/watch/sync, manual outbox sync, and local-file analysis readback.
- Fails immediately if any iteration fails.

Optional tuning:

```powershell
$env:BUBLI_TAURI_RUNTIME_SOAK_ITERATIONS="3"
$env:BUBLI_TAURI_RUNTIME_SOAK_DELAY_MS="5000"
npm run check:tauri-windows-runtime-soak
```

Fast contract check without opening windows:

```powershell
node scripts/check-tauri-windows-runtime-soak.mjs --contract
```

## Scope

This is not a replacement for real Google OAuth manual QA or visual/manual long-session review. It is a repeated runtime proof for the automated dev-token Tauri path.
