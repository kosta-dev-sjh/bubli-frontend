# Sprint 3 WebSocket 이벤트 수신 처리 기준

기준일: 2026-06-30

이 문서는 회원 웹 앱과 Tauri 앱이 같은 서버 이벤트를 받기 위한 프론트 기준이다. 화면을 바로 고치지 않아도 타입, 파서, dispatcher를 먼저 붙일 수 있게 이벤트 이름과 처리 원칙을 정한다.

기준 문서:

- `/Users/maren/EDU/Final Project/00_현재_프로젝트/최종_산출물/01_기획최종본_2026-06-22/10_API-Design.md`
- `/Users/maren/EDU/Final Project/00_현재_프로젝트/최종_산출물/01_기획최종본_2026-06-22/09_Data-Model.md`

## 1. 공통 원칙

실시간 이벤트는 서버 DB에 저장된 결과를 알려주는 신호다. 프론트는 이 이벤트만 보고 원본 데이터를 임의로 확정하지 않고, 필요한 화면 데이터는 기존 HTTP API로 다시 가져온다.

공통 envelope는 API 문서의 `RealtimeEnvelope`를 따른다.

```ts
type RealtimeEnvelope<T> = {
  eventId: string;
  eventType: string;
  sequence?: number;
  roomId?: string;
  chatRoomId?: string;
  occurredAt: string;
  actor?: {
    type: "USER" | "SYSTEM" | "AGENT";
    id: string | null;
    name: string;
  };
  payload: T;
};
```

`eventId`는 중복 수신 제거 기준이다. 같은 `eventId`가 다시 오면 화면 갱신을 다시 하지 않는다.

`sequence`는 보충 조회 기준이다. 프로젝트룸 이벤트는 `project_room_events.sequence`, 채팅 메시지는 `chat_messages.roomSequence`를 기준으로 빠진 데이터를 다시 받는다.

프론트와 Tauri 앱은 에이전트 서버에 직접 붙지 않는다. 에이전트 작업 상태도 API 서버가 만든 이벤트와 HTTP API로만 확인한다.

## 2. topic 기준

| topic | 받는 화면 | 보충 API |
| --- | --- | --- |
| `/topic/project-rooms/{roomId}/events` | 프로젝트룸, 자료보드, WBS/작업판, 일정, 프로젝트룸 설정, 위젯 요약 | `GET /api/project-rooms/{roomId}/events?afterSequence={lastReceivedSequence}&limit=100` |
| `/topic/chat/{chatRoomId}` | `/app/chat`, 프로젝트룸 채팅, Tauri 채팅 캐시 | `GET /api/chat/rooms/{id}/messages?afterSequence={lastReceivedSequence}` |
| `/user/queue/notifications` | 알림 목록, 알림 버블, 소통 배지 | `GET /api/notifications` |

서버 연결 방식은 STOMP를 기준으로 한다. access token은 connect header에 넣는다.

```text
Authorization: Bearer <accessToken>
```

현재 프론트 기반 코드에서는 실제 서버 주소를 확정하지 않는다. `createRealtimeBrowserClient({ url })`처럼 URL을 명시한 경우에만 브라우저에서 연결한다. URL이 없거나 서버 렌더링 중이면 연결 상태를 `DISABLED`로 두고 끝낸다.

## 3. 프로젝트룸 이벤트

프로젝트룸 이벤트는 `roomId`와 `sequence`가 필수다. 화면은 이벤트를 받으면 해당 카드 하나만 바꿀 수 있는 경우에도, 서버 응답을 원본으로 보고 필요한 목록이나 상세 API를 다시 가져온다.

| 이벤트 | payload 최소값 | 연결 화면 | 처리 기준 |
| --- | --- | --- | --- |
| `ROOM_UPDATED` | `entityId`, `changedFields` | 프로젝트룸 헤더, 설정, 대시보드 | 룸 상세 재조회 |
| `ROOM_MEMBER_JOINED` | `entityId` | 멤버 목록, 초대 상태 | 멤버 목록 재조회 |
| `ROOM_MEMBER_LEFT` | `entityId` | 멤버 목록 | 멤버 목록 재조회 |
| `ROOM_MEMBER_ROLE_CHANGED` | `entityId`, `changedFields` | 멤버 목록, 권한 UI | 멤버 목록과 내 권한 재조회 |
| `ROOM_MEMBER_REMOVED` | `entityId` | 멤버 목록, 접근 제어 | 대상자가 나면 룸 접근을 다시 확인 |
| `RESOURCE_UPLOADED` | `entityId`, `status` | 자료보드, 프로젝트룸 자료 | 자료 목록 재조회 |
| `RESOURCE_UPDATED` | `entityId`, `changedFields` | 자료 카드, 자료 상세 | 해당 자료 상세 재조회 |
| `RESOURCE_DELETED` | `entityId` | 자료 목록 | 목록에서 제거 후 목록 재조회 |
| `RESOURCE_COMMENT_CREATED` | `entityId` | 자료 상세 댓글, 알림 | 댓글 목록 재조회 |
| `RESOURCE_COMMENT_UPDATED` | `entityId` | 자료 상세 댓글 | 댓글 목록 재조회 |
| `RESOURCE_COMMENT_DELETED` | `entityId` | 자료 상세 댓글 | 댓글 목록 재조회 |
| `RESOURCE_ANALYSIS_STARTED` | `entityId`, `status` | 자료 카드, 에이전트 상태 | 분석 중 상태 표시, 자료 상세 재조회 |
| `RESOURCE_ANALYSIS_COMPLETED` | `entityId`, `status` | 자료 요약, 에이전트 후보, 위젯 자료 버블 | 요약과 후보 목록 재조회 |
| `RESOURCE_ANALYSIS_FAILED` | `entityId`, `status` | 자료 카드, 에이전트 상태 | 실패 상태 표시, 상세 재조회 |
| `TASK_CREATED` | `entityId`, `status` | WBS/작업판, 대시보드, TODO 버블 | 작업 목록 재조회 |
| `TASK_UPDATED` | `entityId`, `changedFields` | WBS/작업판, 일정, TODO 버블 | 작업 상세 또는 목록 재조회 |
| `TASK_STATUS_CHANGED` | `entityId`, `previousStatus`, `status` | 칸반, 대시보드, TODO 버블 | 상태 열 재조회 |
| `TASK_DELETED` | `entityId` | WBS/작업판, TODO 버블 | 목록에서 제거 후 재조회 |
| `WBS_CREATED` | `entityId` | WBS 트리 | WBS 트리 재조회 |
| `WBS_UPDATED` | `entityId`, `changedFields` | WBS 트리 | WBS 트리 재조회 |
| `WBS_REORDERED` | `entityId` | WBS 트리 | 순서 전체 재조회 |
| `WBS_DELETED` | `entityId` | WBS 트리 | WBS 트리 재조회 |
| `SCHEDULE_CREATED` | `entityId` | 일정, 대시보드, 일정 버블 | 일정 목록 재조회 |
| `SCHEDULE_UPDATED` | `entityId`, `changedFields` | 일정, WBS/작업판 | 일정 목록 재조회 |
| `SCHEDULE_DELETED` | `entityId` | 일정 | 일정 목록 재조회 |
| `AGENT_JOB_CREATED` | `entityId`, `status` | 자료 상세, 에이전트 상태 패널 | 에이전트 작업 상태 조회 시작 |
| `AGENT_JOB_STATUS_CHANGED` | `entityId`, `previousStatus`, `status` | 에이전트 상태 패널 | `GET /api/agent-jobs/{jobId}` 재조회 |
| `AGENT_SUGGESTIONS_CREATED` | `entityId` | 에이전트 후보, WBS/작업판 | 후보 목록 재조회 |
| `AGENT_SUGGESTION_APPROVED` | `entityId` | 후보, TODO, WBS, 일정 | 후보와 반영 대상 목록 재조회 |
| `AGENT_SUGGESTION_REJECTED` | `entityId` | 후보 목록 | 후보 목록 재조회 |
| `VOICE_ROOM_OPENED` | `entityId`, `status` | 소통, 보이스 참여 버튼 | 보이스 방 상태 재조회 |
| `VOICE_PARTICIPANT_JOINED` | `entityId` | 소통 참여자 목록 | 참여자 목록 재조회 |
| `VOICE_PARTICIPANT_LEFT` | `entityId` | 소통 참여자 목록 | 참여자 목록 재조회 |
| `VOICE_ROOM_ENDED` | `entityId`, `status` | 소통, 보이스 UI | 보이스 UI 종료 처리 |

## 4. 채팅 이벤트

채팅 메시지는 서버 DB의 `chat_messages`가 원본이다. 클라이언트가 보낸 `clientMessageId`는 재전송 중복 저장 방지에만 쓴다.

| 이벤트 | payload | 연결 화면 | 처리 기준 |
| --- | --- | --- | --- |
| `CHAT_MESSAGE_CREATED` | `ChatMessageResponse` | `/app/chat`, 프로젝트룸 채팅, Tauri 채팅 캐시 | `chatRoomId + roomSequence`로 정렬하고, 빠진 sequence가 있으면 `afterSequence` 조회 |
| `CHAT_READ_STATE_UPDATED` | `chatRoomId`, `userId`, `lastReadSequence` | 채팅 읽음 표시, 알림 배지 | 읽음 위치만 갱신. 메시지 본문은 바꾸지 않음 |

내가 보낸 메시지는 입력 직후 임시 표시할 수 있다. 다만 확정 메시지는 서버가 내려준 `id`와 `roomSequence`가 있는 `CHAT_MESSAGE_CREATED`다. 임시 메시지와 확정 메시지는 `clientMessageId`로 합친다.

## 5. 알림 이벤트

알림은 사용자 단위 queue로 받는다. 프로젝트룸 이벤트와 채팅 이벤트가 있어도, 알림 목록과 배지는 별도 원본인 `notifications`를 따른다.

| 이벤트 | payload | 연결 화면 | 처리 기준 |
| --- | --- | --- | --- |
| `NOTIFICATION_CREATED` | `NotificationResponse` | 알림 목록, 소통 배지, 알림 버블 | 목록 앞에 붙이고 필요하면 알림 API 재조회 |
| `NOTIFICATION_READ` | `NotificationResponse` | 알림 목록, 배지 | 해당 알림을 읽음 처리 |
| `NOTIFICATION_BULK_READ` | `notificationIds`, `readAt` | 알림 목록, 배지 | 지정 목록 또는 전체 목록 재조회 |

## 6. 위젯 이벤트

위젯은 별도 서버 topic을 새로 확정하지 않는다. 대부분 프로젝트룸 이벤트, 채팅 이벤트, 알림 이벤트를 받은 뒤 `GET /api/widget/summary`를 다시 가져오면 된다.

클라이언트 내부에서 필요한 경우 아래 이벤트 이름을 dispatcher에 흘릴 수 있다.

| 이벤트 | payload | 연결 화면 | 처리 기준 |
| --- | --- | --- | --- |
| `WIDGET_CONTEXT_CHANGED` | `selectedRoomId` | Tauri 위젯, 위젯 설정 | 위젯 컨텍스트와 summary 재조회 |
| `WIDGET_ITEM_STATE_CHANGED` | `bubbleType`, `itemId`, `itemType`, `state` | Tauri 위젯 | 항목 상태 API 성공 후 summary 재조회 |
| `WIDGET_SUMMARY_INVALIDATED` | `bubbleTypes`, `reason`, `roomId` | Tauri 위젯, 대시보드 위젯 연결부 | summary 재조회 신호 |

위젯 summary를 다시 가져와야 하는 대표 서버 이벤트는 `TASK_CREATED`, `TASK_UPDATED`, `TASK_STATUS_CHANGED`, `SCHEDULE_CREATED`, `SCHEDULE_UPDATED`, `RESOURCE_UPLOADED`, `RESOURCE_ANALYSIS_COMPLETED`, `AGENT_SUGGESTIONS_CREATED`, `AGENT_SUGGESTION_APPROVED`, `CHAT_MESSAGE_CREATED`, `NOTIFICATION_CREATED`다.

## 7. 중복 수신과 누락 보충

중복 수신은 `eventId`로 제거한다. 같은 이벤트가 재연결 직후 WebSocket과 보충 API에서 같이 들어와도 한 번만 처리한다.

프로젝트룸은 방별 `lastReceivedSequence`를 저장한다. 끊겼다가 다시 붙으면 `GET /api/project-rooms/{roomId}/events?afterSequence={lastReceivedSequence}&limit=100`으로 빠진 이벤트를 먼저 보충하고, 그 뒤 WebSocket 이벤트를 처리한다.

채팅은 방별 `lastReceivedSequence`를 저장한다. 메시지의 정렬 기준은 `createdAt`이 아니라 `roomSequence`다.

알림은 sequence 계약이 아직 없으므로 재연결 후 `GET /api/notifications`로 최신 상태를 다시 맞춘다.

## 8. 재연결 기준

1. access token 만료로 연결이 끊기면 refresh를 먼저 시도한다.
2. refresh가 성공하면 다시 연결한다.
3. 다시 연결한 뒤 프로젝트룸과 채팅방별 마지막 sequence 이후 데이터를 HTTP API로 보충한다.
4. refresh가 실패하면 실시간 연결을 닫고 로그인 상태 확인 흐름으로 넘긴다.

프론트 adapter는 지수 백오프를 쓴다. 기본 시작 대기 시간은 1초, 최대 대기 시간은 30초다.

## 9. 낙관적 업데이트 기준

낙관적 업데이트는 사용자가 방금 한 일을 짧게 보여주는 데만 쓴다. 서버가 sequence나 저장 ID를 발급하는 데이터는 이벤트나 HTTP 응답이 오기 전까지 확정 상태로 보이지 않는다.

허용:

- 채팅 입력 직후 pending 메시지 표시. 확정은 `CHAT_MESSAGE_CREATED`.
- 위젯 항목 확인, 숨김, 고정 버튼의 pending 표시. 확정은 `PATCH /api/widget/items/{id}/state` 성공 또는 summary 재조회.
- 단일 알림 읽음 버튼의 pending 표시. 실패하면 원복.

금지:

- 에이전트 후보를 승인했다고 바로 TODO, WBS, 일정에 확정 반영하기.
- 자료 분석 완료를 클라이언트가 임의로 완료 처리하기.
- WBS 순서, 작업 상태, 일정 변경을 서버 응답 없이 다른 화면까지 확정 전파하기.
- 프로젝트룸 멤버 권한과 접근 가능 여부를 클라이언트 판단만으로 확정하기.

한마디로, 입력창과 버튼 반응은 가볍게 먼저 보여줄 수 있지만 업무 데이터의 원본은 서버 이벤트와 HTTP 응답이다.

## 10. 프론트 기반 파일

이번 기준의 얇은 클라이언트 파일은 아래에 둔다.

- `src/types/realtime.ts`: 이벤트 이름, payload, envelope 타입
- `src/lib/realtime/events.ts`: 이벤트 이름 검증, JSON 파서, topic key 변환
- `src/lib/realtime/dispatcher.ts`: 중복 제거와 구독 dispatcher
- `src/lib/realtime/browser-client.ts`: URL이 있을 때만 연결하는 브라우저 adapter
- `src/lib/realtime/index.ts`: 외부 export
- `src/lib/websocket/*`: 예전 WebSocket 초안 import 호환용 래퍼. 새 화면 연결은 `src/lib/realtime`을 기준으로 한다.

화면 연결은 다음 단계에서 아래 위치에 붙인다.

- `/app/project-rooms/{roomId}/work`: WBS, TODO, 일정 이벤트 구독
- `/app/resources`: 자료 업로드, 분석, 댓글 이벤트 구독
- `/app/chat`: 채팅방 메시지와 읽음 이벤트 구독
- `/app/calendar`: 일정 이벤트 구독
- `/app`: 대시보드 summary 재조회 신호 구독
- Tauri 위젯 진입부: 위젯 summary invalidation, 알림, 채팅 이벤트 구독
