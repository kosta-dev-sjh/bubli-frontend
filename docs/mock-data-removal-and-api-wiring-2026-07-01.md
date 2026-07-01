# 목업 데이터 제거와 API 연결 감사 · 2026-07-01

API 연결 기준은 docs/기능_API연결_명세_2026-07-01.csv와 docs/기능_API연결_색상표_2026-07-01.xlsx를 따른다.

## 작업 기준

- 백엔드는 `/Users/maren/EDU/Final Project/04_개발_작업공간/repos/bubli-backend`에서 `origin/develop` 최신 커밋 `03f7541 feat: 생성 문서 export API 추가 (#145)`로 강제 동기화했다.
- Docker 데이터 계층은 `docker compose up -d`로 PostgreSQL(pgvector)과 Redis 실행 상태를 확인했다.
- 프론트는 새 API 경로를 만들지 않고 기존 API 래퍼와 CSV의 매핑 경로를 우선 사용했다.
- preview 데이터는 `NEXT_PUBLIC_BUBLI_PREVIEW_DATA=true`인 개발 환경에서, 실제 API 실패 뒤 읽기 fallback으로만 쓰도록 제한했다.
- 쓰기 액션은 API 실패 시 가짜 성공 데이터를 만들지 않는다.
- 색상표 CSV/XLSX에는 최신 백엔드 115경로 / 149 unique method+path 기준의 `API 용도·화면·위젯 맵`을 추가했다.

## 제거하거나 중립화한 목업 값

| 항목 | 기존 노출 | 변경 |
|---|---|---|
| preview 사용자명 | `Maren` | `개발 미리보기 사용자`로 중립화 |
| preview 이메일 | `preview@bubli.local` | 실제 로그인 이메일처럼 보이지 않도록 `null` 처리 |
| preview Bubli ID | `maren` | `preview-user`로 중립화 |
| 채팅 친구 검색 placeholder | `예: maren` | `예: bubli-id` |
| 캘린더 preview actor | `Maren` | `개발 미리보기 사용자` |
| API timeout preview 모드 | 개발 기본값으로 1.2초 fallback | `NEXT_PUBLIC_BUBLI_PREVIEW_DATA=true`일 때만 짧은 timeout 사용 |
| 쓰기 실패 fallback | 가짜 친구요청, 가짜 메시지, 가짜 보이스룸, 가짜 일정, 가짜 업로드 성공 | API 실패 시 offline/error/blocked 상태로 표시 |
| 관리폴더 서버 경로 | `/api/me/managed-folders`, `/api/local-files`, `/api/resources/{id}/sync-policy` | 최신 백엔드에 없는 경로 제거. Tauri IPC와 `/api/local-file-events/sync`만 사용 |

## 실제 API 우선으로 바꾼 화면

| 화면/영역 | API 기준 | 변경 내용 |
|---|---|---|
| 앱 셸/상단바 | `GET /api/me`, `GET /api/project-rooms`, `GET /api/notifications` | preview 사용자를 먼저 표시하지 않고 인증/룸/알림 API를 먼저 호출 |
| 프로젝트룸 목록/홈/작업판 | `/api/project-rooms`, `/api/project-rooms/{id}`, WBS/자료/일정/후보 API | preview 룸/작업판은 API 실패 뒤 개발 fallback으로만 사용 |
| 소통 | `/api/chat/*`, `/api/friends`, `/api/friend-requests`, `/api/voice/rooms`, `/api/project-rooms/{id}/agent/commands` | 친구/요청/검색/초대/1:1/보이스/메시지 전송을 API 우선으로 변경하고 최신 룸 에이전트 경로로 정정 |
| 설정 | `/api/me`, `/api/me/*`, `/api/widget/settings`, Tauri IPC | 프로필/알림/동의/버블은 API 우선, 관리폴더는 서버 API가 아니라 Tauri local command로 분리 |
| 개인/룸 자료보드 | `GET /api/resources?scope=personal`, `GET /api/project-rooms/{id}/resources`, `POST /api/resources`, `POST /api/local-file-events/sync` | 자료 목록은 API 우선, 개인 폴더는 Tauri IPC, 업로드 실패 시 preview 성공 처리 제거 |
| 대시보드 | `GET /api/dashboard/work`, `GET /api/project-rooms` | 대시보드 데이터와 룸 목록을 실제 API 우선으로 로드 |
| 캘린더 | `GET /api/schedules`, `GET /api/project-rooms/{id}/events`, `POST /api/schedules`, `/api/calendar/google/*` | 일정 목록/생성 API 우선, 생성 실패 시 preview 성공 처리 제거, Google Calendar 래퍼 보강 |
| 에이전트 후보/생성문서 | `/api/agent/suggestions`, `/api/project-rooms/{id}/agent/suggestions`, confirmation/confirmed/contract refs, `/api/generated-documents/*` | 후보 목록과 승인/보류/제외 액션을 API 우선으로 변경하고 최신 #143-#145 API 어댑터 추가 |

## 아직 런타임 검증이 필요한 항목

| 항목 | 남은 확인 |
|---|---|
| 실제 로그인 세션 | Google OAuth 뒤 `/api/me` 응답이 상단바, 설정, 소통의 내 ID에 일관되게 표시되는지 확인 |
| 친구/채팅/보이스 | 실백엔드 데이터로 친구 요청, 1:1 방 생성, 프로젝트룸 초대, 보이스 룸 생성이 왕복되는지 확인 |
| 자료 업로드/다운로드 | `/api/resources`, `/download-url` 권한 처리와 업로드 후 목록 재조회 확인 |
| Tauri 설정 | 폴더 선택, SQLite 점검, 위젯 설정 저장은 실제 Tauri 런타임에서 추가 확인 |
| WebSocket | 채팅 메시지와 프로젝트룸 이벤트 자동 갱신은 실서버 토큰 연결 상태에서 확인 |
| 생성문서 export | `/api/generated-documents/{id}/export` 다운로드는 인증 세션이 있는 브라우저에서 확인 |
