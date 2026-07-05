# Tauri Google OAuth QA Assertion 2026-07-05

This note supplements `docs/tauri-google-oauth-manual-qa-2026-07-05.md`.

Use it only in a development Tauri run with:

```powershell
$env:NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS="true"
```

After completing the real Google OAuth login in the Tauri app, run this in the main app console:

```js
await window.__BUBLI_TAURI_AUTH_QA__?.assertRealGoogleAuthWidgetSnapshot()
```

Pass criteria:

- `ok` is `true`.
- `failedChecks` is an empty array.
- `snapshot.localSession.clientType` and `snapshot.tauriMirrorSession.clientType` are both `TAURI`.
- `snapshot.localSession.isDevAccessTokenSession` and `snapshot.tauriMirrorSession.isDevAccessTokenSession` are both `false`.
- `snapshot.localSession.refreshTokenExpired` and `snapshot.tauriMirrorSession.refreshTokenExpired` are both `false`.
- `snapshot.backend.me.ok`, `snapshot.backend.widgetContext.ok`, and `snapshot.backend.widgetSummary.ok` are all `true`.
- `snapshot.widgetRuntime.allExpectedWindowsVisible` and `snapshot.widgetRuntime.allWindowRoomContextMatchesActive` are both `true`.

The returned `snapshot` is redacted. It must not expose raw `accessToken`, `refreshToken`, `sessionJson`, or raw user identifiers.

If the app is using a dev-token smoke session, the assertion should fail with `local:notDevAccessTokenSession` or `tauriMirror:notDevAccessTokenSession`. That failure is expected and must not be used as evidence of a real Google OAuth login.
