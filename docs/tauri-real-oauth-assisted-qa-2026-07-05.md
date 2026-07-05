# Tauri 실제 Google OAuth 보조 QA 2026-07-05

이 절차는 dev access token smoke가 아니라 실제 Google OAuth 로그인 완료 여부를 확인하기 위한 수동 보조 QA다.

## 실행

```powershell
npm run qa:tauri-real-oauth
```

스크립트는 Windows Tauri 앱을 dev-token 없이 실행한다.

- `NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN=false`
- `NEXT_PUBLIC_BUBLI_PREVIEW_DATA=false`
- `NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA=true`
- `NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS=true`

앱에서 Google 로그인을 완료하면 앱 내부 `TauriRealOAuthQaReporter`가 `assertTauriRealGoogleAuthWidgetQa()`를 반복 실행한다. 통과 또는 timeout 결과는 로컬 report server로 POST되고 `.codex-runtime-logs/tauri-real-oauth-qa-*.json`에 redacted JSON으로 저장된다.

## 통과 기준

- localStorage와 Tauri SQLite mirror 세션이 모두 `clientType=TAURI`.
- 두 세션 모두 dev-token 세션이 아님.
- refresh token이 만료되지 않음.
- `/api/me`, `/api/widget/context`, `/api/widget/summary`가 성공.
- active project room context가 Tauri, memory, backend widget context에 일치.
- bar와 8개 bubble widget이 로그인 후 표시되고 같은 project room context를 가짐.

리포트는 `accessToken`, `refreshToken`, `sessionJson`, 사용자 식별자 원문을 포함하지 않아야 한다.

## 주의

이 스크립트는 사용자의 브라우저/앱 로그인이 필요한 수동 QA다. CI용 자동 check가 아니며, `check:tauri-windows-runtime-smoke`의 dev-token 결과를 실제 Google OAuth 증거로 대체하지 않는다.
