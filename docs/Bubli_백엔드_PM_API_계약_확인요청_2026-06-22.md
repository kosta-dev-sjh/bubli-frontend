# Bubli 백엔드 PM API 계약 확인 요청

이 문서는 프론트엔드 개발을 시작하기 전에 백엔드 PM 담당자와 맞춰야 할 API 계약을 정리한 전달용 문서다.

v15 기획서와 백엔드 개발 가이드에는 제품 흐름, 주요 API 후보, 서버 도메인 책임이 잡혀 있다. 다만 프론트에서 API client와 타입을 바로 만들려면 request/response DTO, Google OAuth 처리, 실시간 payload 같은 세부 계약이 추가로 필요하다.

## 전달 요약

```text
v15 기획서와 백엔드 개발 가이드 기준으로 프론트 구조는 잡을 수 있습니다.
다만 프론트에서 API client를 만들려면 구현용 API 계약이 더 필요합니다.

특히 Google OAuth 시작, 콜백 처리, 로그아웃, 토큰 재발급, 내 정보 조회 API의 응답 형식을 먼저 맞추면 좋겠습니다.
로컬 이메일/비밀번호 가입과 로그인은 현재 기획 기준에서 제외합니다.

그리고 채팅/WebSocket, LiveKit token, 파일 업로드, agent job 이벤트, 타이머/위젯 동기화 쪽은 흐름은 기획서에 있는데 request/response DTO와 payload 형식은 백엔드 쪽에서 Swagger나 .http 기준으로 확정해주면 프론트가 맞춰서 API client를 만들 수 있을 것 같습니다.
```

## 현재 문서에 있는 내용

| 구분 | v15 기획서 | 백엔드 개발 가이드 |
|---|---|---|
| 인증 흐름 | `/login` 화면에서 Google OAuth로 연결, JWT, 토큰 만료 처리 | `auth` 모듈 책임, OAuth 사용자 처리, JWT 발급, 토큰 만료 처리 |
| 주요 API 경로 | 프로젝트, 자료, 작업, 채팅, 위젯, 타이머, 보이스, agent job 경로 대부분 있음 | 도메인별 책임과 `.http` 검증 파일 기준 있음 |
| 채팅 | `client_message_id`, `room_sequence`, `afterSequence`, WebSocket topic 있음 | DB 저장 후 WebSocket 전달, 중복 저장 방지 기준 있음 |
| 보이스챗 | LiveKit token 발급 흐름 있음 | LiveKit room, token 발급, 참가 권한 확인 책임 있음 |
| 에이전트 | `agent_jobs`, 상태값, WebSocket/알림 흐름 있음 | agent 모듈 책임과 확정 데이터 직접 변경 금지 기준 있음 |
| Tauri/위젯 | SQLite 캐시, local_sync_outbox, widget rollup, timer heartbeat 흐름 있음 | 관련 서버 반영 책임과 idempotency 기준 있음 |

## 확인이 필요한 API 계약

### 1. 인증 API

프론트 `features/auth/api`를 만들려면 아래 경로와 DTO가 필요하다.

| 확인 항목 | 필요한 결정 |
|---|---|
| Google OAuth 시작 | `GET /oauth2/authorization/google` 리다이렉트 처리 방식 |
| Google OAuth 콜백 | `GET /login/oauth2/code/google` 처리 후 프론트 복귀 방식 |
| 로그아웃 | `POST /api/auth/logout` 사용 여부, 서버에서 refresh token을 무효화할지 |
| 토큰 재발급 | `POST /api/auth/refresh` 사용 여부, refresh token 전달 위치 |
| 내 정보 | `GET /api/me`, `PATCH /api/me`의 응답 DTO |
| 토큰 저장 | 웹은 httpOnly cookie인지, Authorization Bearer 헤더인지 |
| Tauri 토큰 | Tauri에서 토큰을 어디에 저장하고 어떻게 갱신할지 |

### 2. 공통 응답과 에러 DTO

프론트 공통 API client는 아래 형태를 기준으로 준비한다.

```ts
type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

type ApiError = {
  code: string;
  message: string;
  traceId: string;
};
```

추가로 확정이 필요한 항목은 아래와 같다.

| 확인 항목 | 필요한 결정 |
|---|---|
| validation error | 필드별 에러를 `error.details`로 줄지 |
| pagination | page/size/totalElements 방식인지 cursor 방식인지 |
| unauthorized | 토큰 만료와 권한 없음의 error code 구분 |
| file error | 용량 초과, 형식 불가, 바이러스/검증 실패 같은 에러 코드 |

### 3. 파일 업로드

자료보드와 프로젝트룸 자료 업로드를 위해 업로드 방식 확정이 필요하다.

| 확인 항목 | 필요한 결정 |
|---|---|
| 업로드 방식 | Spring Boot multipart 중계 업로드인지 S3 presigned URL인지 |
| 업로드 진행률 | 프론트에서 진행률 표시가 가능한 방식인지 |
| 파일 제한 | 허용 확장자, MIME type, 단일 파일 용량, 사용자별 총 용량 |
| 업로드 완료 | 업로드 후 `resource_id`가 바로 생기는지 |
| 분석 시작 | 업로드 직후 자동 분석인지, 사용자가 분석 버튼을 눌러 시작하는지 |

### 4. 채팅과 WebSocket

소통 화면 구현에는 HTTP API뿐 아니라 WebSocket payload가 필요하다.

| 확인 항목 | 필요한 결정 |
|---|---|
| WebSocket 인증 | handshake에서 JWT를 어디에 담는지 |
| 메시지 전송 완료 | HTTP 응답 기준인지, WebSocket으로 다시 받은 서버 메시지 기준인지 |
| 메시지 DTO | `id`, `chatRoomId`, `sender`, `messageType`, `body`, `roomSequence`, `createdAt` 등 필드 |
| 누락 메시지 보충 | `afterSequence` 요청과 응답 형식 |
| 읽음 처리 | read sequence 또는 message id 기준인지 |
| 에이전트 명령 | 프로젝트룸 채팅에서 agent command 메시지를 어떤 payload로 주고받을지 |

### 5. LiveKit 보이스챗

프론트는 LiveKit key와 secret을 쓰지 않고 서버에서 받은 접속 정보만 사용한다.

| 확인 항목 | 필요한 결정 |
|---|---|
| token 응답 | `serverUrl`, `token`, `voiceRoomId`, `participantId`, `expiresAt` 필드 여부 |
| 참여 권한 | 프로젝트룸 멤버 권한 확인과 token 발급 실패 응답 |
| room 상태 | OPEN, ENDED 같은 상태값과 참여자 목록 DTO |
| leave/end | 나가기와 방 종료 응답 형식 |

### 6. Agent job과 이벤트

프론트는 agent job 상태를 표시하고, 완료 후 후보 목록으로 연결해야 한다.

| 확인 항목 | 필요한 결정 |
|---|---|
| job 생성 응답 | `jobId`, `status`, `targetType`, `targetId` 반환 여부 |
| 상태 조회 | `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELED` 외 상태가 있는지 |
| 실패 응답 | `errorCode`, `errorMessage`, `retryable` 여부 |
| 완료 연결 | `agent_suggestion_id`, `resource_analysis_id` 등 결과 연결 필드 |
| WebSocket 이벤트 | job 상태 변경 이벤트 payload |

### 7. 타이머, 위젯, 로컬 동기화

Tauri 앱은 서버 API와 SQLite 대기열을 함께 쓰므로 중복 요청 방지 기준이 중요하다.

| 확인 항목 | 필요한 결정 |
|---|---|
| time_logs | start, pause, resume, stop, heartbeat 요청 DTO |
| idempotency | 어떤 요청에 `idempotency_key`가 필수인지 |
| timer recovery | `RECOVERY_NEEDED` 상태 응답과 복구 처리 DTO |
| widget rollup | `POST /api/widget/usage-rollups` 요청 DTO |
| local file events | suggest, approve, sync 요청 DTO |
| outbox retry | 중복 요청을 서버가 어떻게 기존 결과로 돌려주는지 |

## 백엔드에서 주면 좋은 산출물

| 산출물 | 이유 |
|---|---|
| `auth.http` | 프론트 인증 API client 기준 |
| Swagger/OpenAPI | request/response DTO 생성 기준 |
| `chat.http`, WebSocket payload 예시 | 소통 화면과 Tauri 캐시 구현 기준 |
| `voice.http`, LiveKit token 예시 | 보이스챗 연결 구현 기준 |
| `agent.http`, agent job event 예시 | 후보 생성 상태 표시 기준 |
| `widget.http`, `personal.http`, `localsync.http` | 위젯, 타이머, 로컬 동기화 구현 기준 |

## 프론트는 이 상태에서 할 수 있는 일

세부 DTO가 확정되기 전에도 프론트는 라우트, 레이아웃, feature 폴더, 공통 API client 껍데기, Tauri IPC 경계, 화면별 빈 상태를 먼저 만들 수 있다. DTO가 확정되면 각 feature의 `api/`와 `types/`만 교체하거나 보강한다.
