# 회원앱 화면별 API 연결 기준

작성일: 2026-06-30

이 문서는 회원 웹 앱 화면이 어떤 API와 연결되어야 하는지 고정하기 위한 기준이다. UI 화면 파일은 건드리지 않고, `10_API-Design.md`, `09_Data-Model.md`, 화면설계 패키지, 현재 `src/features/**/api/**`를 대조해 정리했다.

상태 표기는 아래 네 가지로만 쓴다.

- [완료]: 명세와 API 레이어가 맞고 화면에서 주요 데이터가 연결되어 있다.
- [진행]: 일부 API가 연결되어 있지만 화면 행동이나 저장 계약이 더 필요하다.
- [예정]: 화면 책임은 확정됐지만 API 또는 화면 연결이 아직 없다.
- [불일치]: 명세와 코드가 서로 다른 이름, 경로, 책임을 쓴다.

## 한 줄 결론

회원앱 핵심 API는 대부분 `/api/project-rooms`, `/api/resources`, `/api/schedules`, `/api/chat`, `/api/agent` 기준으로 모여 있다. 가장 큰 차이는 일정 화면 경로다. 명세는 `/app/schedule`이고 현재 코드는 `/app/calendar`다. API 호출은 `/api/schedules`라서 API 레이어 수정은 하지 않았다.

## 화면별 연결 표

| 화면 | 상태 | 현재 라우트 | 필요한 API | 현재 코드 연결 | 빠진 기능과 메모 |
|---|---|---|---|---|---|
| 대시보드 | [진행] | `/app` | `GET /api/dashboard/tasks`, `GET /api/me/project-rooms`, `GET /api/schedules`, `GET /api/notifications`, `GET /api/activity/today`, 타이머 현재 상태 | `dashboardApi.getWork`, `dashboardApi.getTasks`, `projectRoomApi.list` | dashboard DnD 카드 추가/제거/재배치 저장 계약이 필요하다. `/api/dashboard/work`는 프론트가 쓰지만 API 명세에는 없다. |
| 프로젝트룸 목록 | [진행] | `/app/project-rooms` | `GET /api/project-rooms` | `projectRoomApi.list` | 목록, 상태, 최근 활동은 연결 흐름이 있다. 선택한 프로젝트룸 맥락이 세션 전체에 유지되어야 한다. |
| 프로젝트룸 생성 | [진행] | `/app/project-rooms/new` | `POST /api/project-rooms`, `POST /api/project-rooms/{roomId}/contract-documents`, `POST /api/ai/review-contract-documents` | `projectRoomApi.create`, `uploadContractDocument`, `agentApi.reviewContractDocuments` | 계약서/요구사항 첨부를 프로젝트룸 시작점으로 유지한다. 링크 초대, 이메일 초대, 비회원 게스트는 제외한다. |
| 프로젝트룸 상세 | [진행] | `/app/project-rooms/{roomId}` | `GET /api/project-rooms/{roomId}`, `GET /api/project-rooms/{roomId}/members`, `GET /api/project-rooms/{roomId}/resources`, `GET /api/project-rooms/{roomId}/wbs-board`, `GET /api/project-rooms/{roomId}/agent/suggestions`, `GET /api/schedules?roomId=...`, `GET /api/project-rooms/{roomId}/events` | `projectRoomApi`, `resourcesApi`, `wbsApi`, `agentApi`, `calendarApi` | 룸 홈은 자료, 작업, 일정, 소통, 후보의 진입점이다. WebSocket `/topic/project-rooms/{roomId}/events`로 최신 상태 보충이 필요하다. |
| 개인 자료 | [진행] | `/app/resources` | `GET /api/resources?scope=personal`, `GET /api/resources/{id}`, `GET /api/resources/{id}/summary`, `GET /api/resources/{id}/ai-document`, `POST /api/local-file-events/sync` | `resourcesApi.listPersonal`, `managedFolderApi.syncApprovedLocalFileEvents` | 개인 자료는 로컬 폴더 동기화가 기준이다. 브라우저 업로드나 드래그앤드롭을 개인 자료의 기본 행동으로 두지 않는다. |
| 룸 자료 | [진행] | `/app/project-rooms/{roomId}/resources` | `GET /api/project-rooms/{roomId}/resources`, `POST /api/resources`, `GET/PATCH/DELETE /api/resources/{id}`, `GET /api/resources/{id}/download-url`, `GET /api/resources/{id}/versions`, `POST /api/resources/{id}/versions`, 댓글 API | `resourcesApi.listRoomResources`, `resourcesApi.upload`, comments/versions/download helpers | 프로젝트룸 자료는 업로드와 드래그앤드롭이 기준이다. 개인 로컬 폴더 파일을 자동 공유하지 않는다. |
| 작업판 WBS/칸반 | [진행] | `/app/project-rooms/{roomId}/work` | `GET /api/project-rooms/{roomId}/wbs-board`, WBS CRUD, `GET/POST /api/project-rooms/{roomId}/tasks`, `PATCH /api/tasks/{id}`, `PATCH /api/agent/suggestions/{id}` | `wbsApi.getBoard`, `agentApi.listRoomSuggestions`, `ProjectRoomWorkBoard` | WBS와 칸반 전환, 드래그 이동, 후보 승인 후 확정 데이터 반영이 다음 연결 포인트다. |
| 일정 | [불일치] | 명세 `/app/schedule`, 코드 `/app/calendar` | `GET/POST/PATCH/DELETE /api/schedules`, `GET /api/project-rooms/{roomId}/events`, Google Calendar 연결/상태 API | `calendarApi`는 일정 CRUD를 `/api/schedules`로 호출 | API 경로는 맞다. 화면 라우트 이름이 명세와 다르다. Google Calendar 연결 상태 API는 현재 명세에 고정되어 있지 않다. |
| 소통 | [진행] | `/app/chat`, `/app/project-rooms/{roomId}/chat` redirect | `GET /api/chat/rooms`, `POST /api/chat/direct-rooms`, 메시지 목록/전송/읽음, room agent command, memory summaries, voice API | `chatApi`, `voiceApi`; 룸 채팅 라우트는 `/app/chat?roomId=...`로 redirect | 1:1 채팅은 API가 있다. 1:1 보이스는 명세에서 확장 후보로만 적혀 있다. 프로젝트룸 context persistence가 반드시 필요하다. |
| 후보 | [진행] | `/app/agent`, `/app/agent-suggestions` redirect | `GET /api/agent/suggestions`, `GET /api/project-rooms/{roomId}/agent/suggestions`, `PATCH /api/agent/suggestions/{id}`, agent job API, AI 작업 생성 API | `agentApi` | 후보는 승인 전 제안으로 보여야 한다. 승인/보류/거절은 `PATCH /api/agent/suggestions/{id}`로 고정한다. |
| 설정 | [진행] | `/app/settings` | `GET/PATCH /api/me`, preferences, notification preferences, privacy consents, storage usage, managed folders, Google Calendar status | 화면은 `authApi.getMe` 중심, `settingsApi`는 별도 존재 | 설정 화면에 알림, 개인정보 동의, 로컬 폴더, Tauri 동기화, Google Calendar 연결 상태가 들어가야 한다. |

## non-UI contract map

새 non-UI 기준 파일은 `src/lib/api/screen-contracts.ts`다.

이 파일은 화면 컴포넌트가 아니라 API 계약을 모아둔 상수다. 화면별 `route`, `status`, `requiredApis`, `requiredRealtime`, `missingOrMismatch`를 가진다. UI가 이 파일을 import하지 않아도 typecheck 대상이라서 계약 문자열과 상태 표기를 코드에서 같이 확인할 수 있다.

기존 `src/lib/api/screen-api-contract.ts`도 브랜치에 untracked 상태로 있었지만, 다른 작업자 변경일 수 있어 건드리지 않았다.

## 자료 경계

개인 자료와 룸 자료는 들어오는 길이 다르다.

개인 자료는 Tauri 앱에서 사용자가 고른 로컬 폴더를 기준으로 동기화한다. 관련 기준은 `managed_folders`, `local_files`, `local_file_events`, `POST /api/local-file-events/sync`다. 개인 자료는 사용자 소유 자료이며 프로젝트룸을 바꿔도 따라오는 개인 영역이다.

프로젝트룸 자료는 `roomId`를 가진 공용 자료다. 업로드와 드래그앤드롭으로 들어오고, `GET /api/project-rooms/{roomId}/resources`에서 목록을 본다. 개인 자료를 프로젝트룸 자료로 자동 공유하거나 이동하는 API는 두지 않는다.

## 고정해야 할 요구

- dashboard DnD: 대시보드 카드 추가, 제거, 순서 변경은 사용자별 저장 계약이 필요하다. 후보 API는 `GET/PATCH /api/me/preferences` 안의 dashboard layout이거나 별도 `/api/dashboard/layout`이다. 아직 API 명세에는 없다.
- project-room context persistence: 프로젝트룸을 선택하면 목록, 상세, 자료, 작업판, 채팅, 후보 화면이 같은 `roomId` 맥락을 유지해야 한다. 사용자 기본 프로젝트룸은 `/api/me/preferences`, 위젯 선택 프로젝트룸은 `/api/widget/context`로 분리한다.
- chat 1:1/voice: 1:1 채팅은 `POST /api/chat/direct-rooms`로 시작한다. 보이스는 `POST /api/voice/rooms`, `POST /api/voice/rooms/{id}/token`이 기준이다. 현재 명세에서 1:1 보이스는 확장 후보라서 화면에서 의존하려면 백엔드 계약을 먼저 고정해야 한다.
- Google Calendar 연결: 일정 화면과 설정 화면은 Google Calendar 연결 상태, 연결 시작, 연결 해제를 보여줘야 한다. 현재 `calendarApi.getGoogleConnectUrl()`은 `/api/calendar/google/connect`를 가리키지만 `10_API-Design.md`에는 Google Calendar 연결 API가 명시되어 있지 않다.
- 후보 승인: 에이전트가 만든 것은 확정 데이터가 아니다. 사용자가 승인해야 WBS, TODO, 일정, 자료 메타데이터로 반영된다.

## 발견한 API 불일치 TOP 5

1. [불일치] 일정 화면 라우트: 화면설계 명세는 `/app/schedule`, 현재 코드는 `/app/calendar`다. API 호출은 `/api/schedules`라서 API 레이어 수정은 하지 않았다.
2. [불일치] 대시보드 aggregate: 프론트는 `/api/dashboard/work`를 쓰지만 `10_API-Design.md`에는 `/api/dashboard/tasks`만 명시되어 있다.
3. [불일치] Google Calendar 연결: 프론트는 `/api/calendar/google/connect`를 사용하지만 API 명세에는 connect/status/disconnect 계약이 없다.
4. [불일치] 로컬 파일 helper: `GET /api/local-files`, `POST /api/local-file-events/suggest`, `PATCH /api/local-file-events/{id}`, `PATCH /api/resources/{id}/sync-policy`는 프론트 계약에 있으나 API 명세에는 `POST /api/local-file-events/sync`만 고정되어 있다.
5. [불일치] 에이전트 확장 endpoint: `POST /api/ai/generate-requirements`, `POST /api/ai/generate-questions`, `POST /api/ai/draft-document`, `POST /api/ai/summarize-day`, `/api/daily-summaries`는 프론트 API 레이어에 있지만 현재 API 명세에는 없다.

## 다음 구현 우선순위

1. 일정 라우트를 `/app/schedule`로 맞출지, 명세를 `/app/calendar`로 바꿀지 결정한다. 사용자가 보는 메뉴 이름은 "일정"으로 유지한다.
2. Google Calendar connect/status/disconnect API 계약을 백엔드와 고정한다.
3. 대시보드 DnD 저장 위치를 정한다. 사용자별 화면 설정이면 `/api/me/preferences`가 가장 작다.
4. 개인 자료 로컬 폴더 helper endpoint를 API 명세에 올릴지, Tauri IPC와 `POST /api/local-file-events/sync`만 남길지 정한다.
5. 소통 화면에서 프로젝트룸 채팅, 1:1 채팅, 보이스 시작, 에이전트 호출을 같은 room context 안에서 이어지게 만든다.
