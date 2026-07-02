# Sprint 3 — IPC / SQLite / Realtime 비UI 구현 핸드오프 (2026-07-01)

이 문서는 두 작업 묶음의 **구현 결과와 남은 일**을 정리한다. UI는 건드리지 않았다. 화면, 라우트, 디자인 토큰, globals.css는 수정 대상이 아니었다.

대상 티켓: BUBLI-41(위젯 상태/요약), BUBLI-44(활동 맥락), BUBLI-43(로컬 파일 색인), BUBLI-46(WebSocket 수신), BUBLI-45(화면별 API 연결), BUBLI-70(공개 라우트 구조), BUBLI-82(Tauri IPC ↔ 서버 API 흐름).

기준 문서: `10_API-Design.md`, `09_Data-Model.md`, `09C_DB-Tauri-SQLite.md`, `03_Tauri_데스크탑앱_명세`, `04_프론트_구현_라우트명세`.

---

## 1. 무엇을 만들었나

### 1.1 Tauri 로컬 기능 (BUBLI-41 / 44 / 43)

서버를 대체하지 않는다. 로컬 기기에서만 도는 부분만 구현했다. 모든 명령은 기존 `lib.rs`의 위젯 창 명령과 같은 패턴(`#[tauri::command]`, camelCase serde, `State<Db>`)을 따른다.

새 파일

- `src-tauri/src/local_db.rs` — rusqlite(bundled) 연결 + 마이그레이션. 09C 기준 로컬 테이블 생성: `managed_folders`, `local_files`, `local_file_events`, `local_widget_usage_events`, `local_widget_usage_rollups`, `local_sync_outbox`, `local_activity_focus`. DB는 앱 데이터 폴더의 `bubli-local.sqlite3`.
- `src-tauri/src/widget_usage.rs` — `record_widget_usage_event`, `rollup_widget_usage`, `sync_widget_usage_summary`.
- `src-tauri/src/activity.rs` — `read_activity_context` (macOS는 osascript, Windows는 Win32 foreground window API로 앞 앱 이름/창 제목을 읽고, 머문시간은 포커스 추적으로 계산. Linux 등 그 외 OS는 명확한 에러).
- `src-tauri/src/local_files.rs` — `select_managed_folder`, `scan_managed_folder`(std::fs 실제 스캔/색인/이벤트), `search_local_files`(LIKE), `watch_managed_folder`(에러: 연속 감시는 남은 단계), `flush_sync_outbox`(백로그 보고).

수정 파일

- `src-tauri/src/lib.rs` — `mod` 선언 + `.setup()`에서 DB 열어 `manage` + invoke_handler에 로컬 명령 등록. 후속 수정으로 명시 닫기 시 위젯 WebView를 해제하고, 앱 종료 시 `bubli-widget-*` 창을 정리한다.
- `src-tauri/Cargo.toml` — `rusqlite(bundled)`, `uuid(v4)`, `chrono` 추가.
- `src/lib/tauri/commands.ts` — Rust와 adapter 소비가 확인된 14개 로컬 명령을 `TAURI_COMMANDS`와 `tauriCommands`로 승격. `PLANNED_TAURI_COMMANDS`는 새 미구현 IPC를 위한 빈 placeholder로 유지.

경계 준수: 개인 관리 폴더/로컬 파일에는 `room_id`를 절대 붙이지 않는다(개인 전용). 프로젝트룸 공유는 별도 업로드 흐름이며 여기서 만들지 않는다. Rust는 서버/에이전트를 직접 호출하지 않고 `local_sync_outbox`에 적재만 한다.

### 1.2 Sprint 3 비UI 런타임 (BUBLI-46 / 45 / 70 / 82)

화면에 연결하지 않았다. 기반 구조와 계약 상수만 둔다.

새 파일

- `src/lib/websocket/events.ts` — 실시간 이벤트 계약 타입(envelope, 프로젝트룸 이벤트명, 채팅/읽음/보이스/알림 payload, 위젯 요약 재조회 신호).
- `src/lib/websocket/realtime-client.ts` — 연결/구독/해제/재연결(backoff+jitter)/중복제거(eventId) 기반. SSR 안전(window/WebSocket 접근은 함수 내부 가드). WS URL은 `NEXT_PUBLIC_WS_URL` 또는 API 호스트에서 유도. 프로토콜은 교체형(기본 JSON 라인, STOMP 어댑터는 남은 단계).
- `src/lib/websocket/index.ts` — 배럴.
- `src/lib/api/screen-api-contract.ts` — 화면별 필요한 API, 연결 상태, fallback(preview) 위치, 새로고침 모드.
- `src/lib/tauri/tauri-api-boundary.ts` — IPC 명령 ↔ 서버 API 책임 표(로컬 전용/서버 반영 구분).
- `src/config/public-route-contract.ts` — 공개/회원/Tauri 위젯 라우트 구분 + 현재 코드와 목표의 차이.

기존 `src/lib/websocket/topics.ts`가 이미 있어서 새 `src/lib/realtime` 디렉터리를 만들지 않고 그 폴더를 보강했다(중복 회피).

---

## 2. 검증 상태

| 검증 | 결과 |
|---|---|
| `npm run check:tauri-boundaries` | 통과 |
| `npm run check:product-rules` | 통과 |
| `npm run check:design-tokens` | 통과 |
| 금지어 스캔(docs src/lib src/config) | 신규 파일 0건. 매치는 모두 기존 docs(라우트 명세의 제외 목록, visual-target 에셋팩 설명) |
| `npm run typecheck` | **이 환경에서 미실행**(마운트 I/O 느림 + 45초 제한). 맥에서 실행 필요 |
| `cargo check` | **이 환경에서 미실행**(rustc 없음). 맥에서 실행 필요. 별도 정적 리뷰로는 통과 가능성 높음 |

맥에서 반드시:

```bash
cd "04_개발_작업공간/repos/bubli-frontend"
npm run typecheck
( cd src-tauri && cargo check )
```

---

## 3. API 명세 대비 불일치 (코드 안 고치고 기록만)

기존 `src/features/**/api/**`가 명세와 어긋나는 부분. 허용 범위 밖(UI 영역)이라 수정하지 않았다.

| 영역 | 코드 현재 | 명세 | 처리 |
|---|---|---|---|
| 위젯 사용 집계 | `/api/widget/usage-rollups`, `/today` | `/api/widget/usage-summaries`, `/today` | 경로 합의 후 한쪽으로 통일 |
| 활동 기록 | `/api/activity-logs/today`, `/{id}` | `/api/activity/today`, `/{id}`, `/current-app` | 경로 합의 + `current-app` 추가 |
| 자료 복구 | `/api/resources/{id}/restore` 있음 | 명세는 복구 API **두지 않음** | 코드에서 제거 결정 필요 |
| 룸 공유 | `/api/resources/{id}/share-to-room` 있음 | 명세는 자동 공유 API **없음** | 코드에서 제거 결정 필요 |
| 룸 문서 | `/api/project-rooms/{roomId}/documents` | `/contract-documents`, `/ai-documents` | 경로 정정 |

런타임 상수(`screen-api-contract.ts`, `tauri-api-boundary.ts`)는 **명세 기준 경로**로 적어두었다. 위 합의가 끝나면 feature api 파일을 거기에 맞춘다.

---

## 4. 남은 단계 (네이티브/백엔드)

- Linux 등 기타 데스크탑의 활동 캡처(WM별 구현). macOS 창 제목은 접근성 권한이 필요하고, Windows 경로는 실제 Tauri 앱 런타임 검증이 남았다.
- 연속 폴더 감시(`watch_managed_folder`): `notify` 크레이트 기반 워처. 지금은 `scan_managed_folder`로 수동 갱신.
- 네이티브 폴더 선택: dialog 플러그인 연결 전까지 `select_managed_folder`는 경로 입력을 받는다.
- `local_sync_outbox` 실제 전송: 인증 토큰이 프론트/OS 보안 저장소에 있으므로 전송은 프론트 API 클라이언트가 담당. Rust는 적재만.
- WebSocket: STOMP 어댑터(서버 프레이밍)와 access token 헤더 연결, 화면 구독 배선.
- 파일 변경 감지 정확도: 지금은 size+mtime 기준. 콘텐츠 해시는 향후.
- 라우트 차이(`public-route-contract.ts`): `/app/calendar`→`/app/schedule`, `/app/agent-suggestions`→`/app/agent`, `/download` 페이지, `/app/desktop/communication` 유지 여부.

---

## 5. 브랜치/커밋 안내

이 작업은 git 쓰기가 막힌 환경에서 진행돼 새 worktree/브랜치를 만들지 못했고, 기존 WIP가 있는 워킹트리에서 신규 파일 위주로 작업했다. **아래 파일만 이번 작업분이다.** 나머지 modified 파일(globals.css, chat/calendar page, dashboard-palette, project-room-work-board, public-site, resource-workspace 등)은 이전부터 있던 WIP이며 이번에 건드리지 않았다.

이번 작업분(신규)

```
src-tauri/src/local_db.rs
src-tauri/src/widget_usage.rs
src-tauri/src/activity.rs
src-tauri/src/local_files.rs
src/lib/websocket/events.ts
src/lib/websocket/realtime-client.ts
src/lib/websocket/index.ts
src/lib/api/screen-api-contract.ts
src/lib/tauri/tauri-api-boundary.ts
src/config/public-route-contract.ts
docs/troubleshooting/sprint3-ipc-realtime-implementation-2026-07-01.md
```

이번 작업분(수정)

```
src-tauri/src/lib.rs        (mod 선언 + setup + invoke_handler 9개 등록)
src-tauri/Cargo.toml        (rusqlite, uuid, chrono)
src/lib/tauri/commands.ts   (TAURI_COMMANDS 승격 + 헬퍼 타입)
```

맥에서 깨끗한 브랜치로 분리하려면 위 목록만 골라 새 브랜치에 stage 하면 된다.
