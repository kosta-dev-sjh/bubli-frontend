# Realtime/WebSocket 초안 중복 정리 메모

기준일: 2026-06-30

## 결론

canonical 구현은 `src/lib/realtime/**`와 `src/types/realtime.ts`로 둔다.

`src/lib/websocket/**`는 2026-06-22 초기 구조와 2026-07-01 다른 작업자의 STOMP/WebSocket 초안이 겹치며 생긴 폴더다. 현재 화면 코드에서 직접 import하는 사용처는 없다. 삭제하지 않고, 기존 import가 생겨도 깨지지 않도록 `src/lib/realtime/**`로 넘기는 호환 래퍼로 낮춘다.

## 중복으로 확인한 파일

- `src/lib/websocket/events.ts`
  - `src/types/realtime.ts`와 이벤트 envelope, 이벤트명, payload 타입을 중복 정의하고 있었다.
  - 정리 후 canonical 타입을 다시 export하는 래퍼로 바꿨다.
- `src/lib/websocket/realtime-client.ts`
  - `src/lib/realtime/browser-client.ts`, `src/lib/realtime/dispatcher.ts`, `src/lib/realtime/events.ts`와 연결, 재연결, 중복 제거, JSON 파싱 책임이 겹쳤다.
  - 정리 후 `createRealtimeClient()`가 `createRealtimeBrowserClient()`를 호출하는 래퍼가 되었다.
- `src/lib/websocket/index.ts`
  - 삭제하지 않고 호환 export 입구로 유지한다.
- `src/lib/websocket/topics.ts`
  - 서버 STOMP topic 문자열만 담고 있어 중복 구현으로 보지 않는다.
  - 다음 STOMP adapter를 붙일 때 사용할 수 있다.

## import 사용처 확인

`rg`로 확인한 결과, 앱 화면과 feature 코드에서 아직 아래 import는 없다.

- `@/lib/realtime`
- `@/lib/websocket`
- `@/types/realtime`

현재 사용처는 각 폴더 내부 참조와 문서뿐이다. 그래서 화면 코드는 건드리지 않았다.

## 이벤트 계약 확인

`docs/sprint3-websocket-event-contract-2026-06-30.md`와 `src/types/realtime.ts`는 아래 이름으로 맞아 있다.

- 프로젝트룸: `ROOM_UPDATED`, `RESOURCE_UPLOADED`, `TASK_CREATED`, `WBS_UPDATED`, `SCHEDULE_UPDATED`, `AGENT_JOB_STATUS_CHANGED`, `VOICE_ROOM_ENDED` 등
- 채팅: `CHAT_MESSAGE_CREATED`, `CHAT_READ_STATE_UPDATED`
- 알림: `NOTIFICATION_CREATED`, `NOTIFICATION_READ`, `NOTIFICATION_BULK_READ`
- 위젯 내부 신호: `WIDGET_CONTEXT_CHANGED`, `WIDGET_ITEM_STATE_CHANGED`, `WIDGET_SUMMARY_INVALIDATED`

API 원문 `10_API-Design.md`의 프로젝트룸 이벤트 표에는 `RESOURCE_COMMENT_CREATED`, `RESOURCE_COMMENT_UPDATED`, `RESOURCE_COMMENT_DELETED`가 아직 없다. Sprint 3 문서와 타입에는 자료 상세 댓글 갱신을 위해 포함되어 있다. 백엔드 계약을 확정할 때 API 문서에도 같은 이벤트를 추가할지 확인해야 한다.

## 다음 화면 연결 기준

새 화면 작업에서는 `@/lib/realtime`을 import한다.

`@/lib/websocket`은 예전 경로 호환과 서버 topic 문자열 확인용으로만 둔다. 새 dispatcher, 파서, 브라우저 연결 코드를 이 폴더에 다시 만들지 않는다.

화면에서는 이벤트 payload만 보고 업무 데이터를 확정하지 않는다. 이벤트를 신호로 받고, 필요한 목록과 상세 데이터는 기존 HTTP API로 다시 가져온다.
