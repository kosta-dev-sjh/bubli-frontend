# 인증 토큰 브리지와 API 연결 기준 2026-07-01

## 기준

백엔드는 쿠키 세션이 아니라 `Authorization: Bearer <accessToken>` 헤더를 기준으로 인증한다. 로그인, refresh 응답은 토큰을 응답 body로 내려준다. 프론트는 이 토큰을 세션 저장소에 보관하고, 모든 API 요청에 Bearer 헤더를 붙인다.

## 프론트 구현 위치

| 책임 | 파일 |
|---|---|
| 토큰 저장, clientType 판별, redirectUri 계산 | `src/lib/auth/auth-session.ts` |
| API Bearer 헤더, 401 refresh 1회 재시도 | `src/lib/api/client.ts` |
| Google authorize, callback, refresh, logout | `src/features/auth/api/authApi.ts` |
| 로그인 버튼 | `src/features/auth/components/auth-panel.tsx` |
| Google callback 라우트 | `src/app/(auth)/auth/callback/page.tsx` |
| 예전 OAuth 진입 호환 | `src/app/oauth2/authorization/google/page.tsx` |
| WebSocket/STOMP Bearer CONNECT | `src/lib/realtime/browser-client.ts` |

## 흐름

1. `/login`에서 백엔드 `GET /api/auth/google/authorize`를 호출한다.
2. 백엔드가 준 `authorizeUrl`로 이동한다.
3. Google callback은 `/auth/callback`으로 돌아온다.
4. 프론트는 `POST /api/auth/google/callback`에 `code`, `redirectUri`, `clientType`을 보낸다.
5. 응답의 `accessToken`, `refreshToken`, `expiresAt`, 사용자 정보를 `bubli-auth-session`에 저장한다.
6. 이후 `apiRequest`는 Bearer 헤더를 붙인다.
7. API가 401을 반환하면 `POST /api/auth/refresh`를 한 번 호출하고 원 요청을 한 번만 재시도한다.
8. refresh가 실패하면 저장된 세션을 지운다.

## 배포 확인 메모 2026-07-02

배포 백엔드 `GET /api/auth/google/authorize`는 응답하지만 현재 `authorizeUrl`의 `client_id`가 `CHANGE_ME`로 내려온다. 로컬 백엔드는 같은 API에서 `client_id`가 빈 값으로 내려온다. 따라서 프론트 토큰 저장, Bearer 헤더, callback 라우트는 준비됐지만 실제 Google 로그인 왕복은 백엔드 배포 환경의 `google.oauth.client-id`, `google.oauth.client-secret` 또는 대응 calendar fallback 값이 채워져야 완료된다.

프론트는 잘못된 Google authorize URL을 그대로 열지 않는다. `client_id`가 비어 있거나 `CHANGE_ME`이면 로그인 화면에 안내를 보여주고 멈춘다. 예전 주소 `/oauth2/authorization/google`로 들어온 경우에도 404 대신 새 로그인 흐름으로 연결한다.

백엔드 `GET /api/me`와 로그인 토큰 응답의 `user` 객체는 현재 `id`, `bubliId`, `name`, `avatarUrl`, `locale`, `timezone`을 내려준다. 이메일은 별도 필드로 내려오지 않으므로 프론트 계정 표시는 이메일을 필수로 보지 않고 `bubliId`를 보조 식별자로 사용한다.

## WebSocket 기준

백엔드는 `/ws` STOMP endpoint를 열고, CONNECT 프레임의 native header `Authorization: Bearer <accessToken>`을 검사한다. 프론트 `createRealtimeClient()`는 저장된 access token을 읽어 STOMP CONNECT 프레임에 붙인다.

구독 destination:

| 화면 | destination |
|---|---|
| 프로젝트룸 이벤트 | `/topic/project-rooms/{roomId}/events` |
| 채팅방 | `/topic/chat/{chatRoomId}` |
| 개인 알림 | `/user/queue/notifications` |

## 환경변수

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_BUBLI_PREVIEW_DATA=false
```

배포에서는 `NEXT_PUBLIC_API_BASE_URL=https://bubli.n-e.kr`, `NEXT_PUBLIC_WS_URL=wss://bubli.n-e.kr/ws`처럼 같은 배포 도메인 기준으로 맞춘다. `NEXT_PUBLIC_*` 값은 Next 빌드 시점에 번들에 들어가므로 주소를 바꾸면 프론트 이미지를 다시 빌드해야 한다.

## Tauri 기준

Tauri WebView에서는 `resolveAuthClientType()`이 `TAURI`를 반환한다. 같은 웹 코드를 쓰되 백엔드에는 `clientType: "TAURI"`로 세션을 만든다. Tauri 전용 SQLite나 로컬 폴더 동기화는 이 토큰 세션 위에서 API를 호출한다.

## 남은 확인

- 배포 백엔드에 실제 Google OAuth client id, secret 등록.
- Google Console redirect URI에 `https://bubli.n-e.kr/auth/callback` 등록.
- 배포 환경에서 Google callback 후 `/app` 진입 확인.
- 실제 백엔드 WebSocket에서 CONNECT, SUBSCRIBE, MESSAGE 수신 확인.
- logout 이후 refresh token 무효화 확인.
