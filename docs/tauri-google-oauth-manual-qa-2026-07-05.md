# Tauri Google OAuth 수동 QA 체크리스트 2026-07-05

이 문서는 자동 smoke가 아직 증명하지 못하는 실제 사용자 Google OAuth 왕복을 확인하기 위한 수동 QA 기준이다.
`check:tauri-windows-runtime-smoke`는 dev access token으로 Tauri/위젯/SQLite/로컬 파일 흐름을 검증하므로, 실제 Google 계정 로그인 완료 증거로 쓰지 않는다.

## 사전 조건

- 백엔드가 실행 중이고 `GET /actuator/health`가 `UP`이다.
- `npm run check:tauri-oauth-live-contract`가 통과한다.
- Google OAuth client id/secret은 백엔드 환경에만 있고 프론트 로그, PR, 문서에 원문을 남기지 않는다.
- Google Console에는 Tauri loopback redirect URI `http://127.0.0.1:3791/auth/callback`이 등록되어 있다.
- 실제 Google 세션 QA에서는 아래 플래그가 켜져 있으면 안 된다.
  - `NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN=true`
  - `NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE=true`
  - `NEXT_PUBLIC_BUBLI_PREVIEW_DATA=true`

## 공통 사전 검증

```powershell
npm run check:tauri-oauth-live-contract
npm run check:tauri-auth-surfaces
```

통과 기준:

- authorize endpoint가 HTTP 200 JSON으로 응답한다.
- `authorizeUrl`은 Google OAuth v2 authorize endpoint를 가리킨다.
- `redirect_uri`는 `http://127.0.0.1:3791/auth/callback`이다.
- `state`가 보존된다.
- `client_id`는 존재하지만 원문은 출력하지 않는다.
- authorize 응답에 `client_secret`, access token, refresh token이 없다.

## Windows Tauri 실제 Google 로그인 QA

1. 백엔드와 프론트 dev server를 실제 백엔드 설정으로 실행한다.
2. `npm run tauri:dev`로 Tauri 앱을 연다.
3. `/login` 화면에서 Google 로그인 버튼을 누른다.
4. 외부 브라우저에서 Google 계정을 선택하고 동의한다.
5. 브라우저 callback 화면에 앱으로 돌아가도 된다는 안내가 보이는지 확인한다.
6. Tauri 앱이 `/app`으로 진입하는지 확인한다.
7. 위젯 bar와 8개 bubble(`todo`, `agent`, `chat`, `timer`, `memo`, `schedule`, `resource`, `alert`)이 로그인 후 자동으로 열리는지 확인한다.
8. 프로젝트룸을 선택한 뒤 모든 위젯의 project room context가 같은 roomId를 쓰는지 확인한다.
9. 앱을 종료하면 위젯도 함께 종료되는지 확인한다.
10. 앱을 재시작하면 저장된 실제 Google 세션으로 `/app`에 다시 진입하고, 위젯이 다시 열리는지 확인한다.

## 실제 Google 세션 판정 기준

Tauri DevTools 또는 검사 가능한 localStorage에서 `bubli-auth-session`을 확인한다.

- `clientType`은 `TAURI`여야 한다.
- `refreshToken`이 `dev-refresh-token:`으로 시작하면 실제 Google 세션이 아니다.
- `/api/me`가 200으로 성공해야 한다.
- `/api/widget/context`, `/api/widget/summary`, `/api/chat/rooms` 요청이 같은 access token의 `Authorization: Bearer ...`로 성공해야 한다.
- Tauri SQLite의 `local_auth_session.session_json`도 같은 세션 JSON을 복원해야 한다.

## 웹 로컬 QA

1. `npm run dev`로 프론트를 실행한다.
2. `http://localhost:3000/login`에서 Google 로그인 버튼을 누른다.
3. Google callback 뒤 `/app`으로 진입하는지 확인한다.
4. 새로고침 후에도 `/api/me`가 성공하고 상단 사용자 정보가 유지되는지 확인한다.
5. 로그아웃 뒤 `/app` 직접 접근이 `/login`으로 돌아가는지 확인한다.

## 배포 웹 QA

1. 배포 URL의 `/login`에서 Google 로그인 버튼을 누른다.
2. Google Console의 배포 redirect URI와 실제 callback URI가 일치하는지 확인한다.
3. callback 뒤 `/app` 진입, `/api/me`, refresh, logout을 확인한다.

## 실패 케이스

| 케이스 | 기대 결과 |
| --- | --- |
| Google client id 누락 또는 placeholder | 프론트가 잘못된 authorize URL을 열지 않고 로그인 오류를 보여준다. |
| redirect URI mismatch | Google이 mismatch 오류를 보여주며 Bubli 세션은 저장되지 않는다. |
| loopback port busy | Tauri loopback 시도 실패 후 기존 WebView OAuth fallback이 동작하거나 오류가 표시된다. |
| callback에 code 없음 | Tauri loopback이 실패 처리하고 세션을 저장하지 않는다. |
| callback state mismatch | Tauri loopback이 실패 처리하고 token exchange를 호출하지 않는다. |
| refresh 실패 | 저장 세션을 지우고 `/login`으로 돌아간다. |
| logout | `bubli-auth-session`과 Tauri mirrored session이 제거되고 위젯이 닫힌다. |

## 증거 기록 양식

| 항목 | 값 |
| --- | --- |
| 실행 일시 | |
| 프론트 commit | |
| 백엔드 commit | |
| 백엔드 URL | |
| QA 환경 | Windows Tauri / 로컬 웹 / 배포 웹 |
| Google 계정 유형 | 개인 / 테스트 계정 |
| `check:tauri-oauth-live-contract` | pass / fail |
| 로그인 후 `/app` 진입 | pass / fail |
| 실제 Google refresh token 판정 | pass / fail |
| 위젯 자동 실행 | pass / fail |
| project room context 전파 | pass / fail |
| 재시작 후 세션 복원 | pass / fail |
| logout 정리 | pass / fail |
| 남은 이슈 | |

## 2026-07-05 추가: redacted 세션 진단

개발 실행에서 명시적으로 `NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS=true`를 켠 뒤, Tauri 메인 앱에서 아래 명령으로 실제 Google OAuth 세션인지 확인한다. 이 헬퍼는 `accessToken`, `refreshToken`, `sessionJson`, 사용자 식별자 원문을 반환하지 않는다.

```js
window.__BUBLI_TAURI_AUTH_QA__?.getLocalSessionDiagnostics()
await window.__BUBLI_TAURI_AUTH_QA__?.readTauriMirrorDiagnostics()
```

통과 기준:

- `hasSession`이 둘 다 `true`다.
- `clientType`이 `TAURI`다.
- `isTauriClient`가 `true`다.
- `isDevAccessTokenSession`이 `false`다.
- `wouldRejectDevAccessTokenSession`이 `false`다.
- `refreshTokenExpired`가 `false`다.
- `/api/me`, `/api/widget/context`, `/api/widget/summary`가 같은 로그인 상태로 성공한다.
