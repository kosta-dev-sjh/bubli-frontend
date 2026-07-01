# 화면별 API 연결 점검 2026-07-01

범위: 소통 화면에서 쓰는 chat, friend, voice API 파일 기준.

## 요약

| 영역 | API 파일 | 화면 연결 상태 | 남은 연결 |
|---|---|---|---|
| 채팅방 목록 | `src/features/communication/api/chatApi.ts` | `/app/chat`에서 `listRooms()` 사용 | 페이지/검색 조건 UI 없음 |
| 메시지 조회 | `chatApi.getMessages()` | 선택한 대화방 메시지 조회에 사용 | 이전 메시지 추가 로딩 UI 없음 |
| 메시지 전송 | `chatApi.sendMessage()` | 입력창 전송에 사용 | 파일 업로드와 `resourceId` 연결 필요 |
| 읽음 처리 | `chatApi.markRead()` | API만 있음 | 화면 이벤트 미연결 |
| 1:1 대화방 | `chatApi.getOrCreateDirectRoom()` | 친구 목록의 1:1 버튼에 연결 | 친구 검색 결과에서 바로 대화 시작 흐름 보강 필요 |
| 친구 목록 | `src/features/communication/api/friendApi.ts` | `/app/chat` 친구 패널에 연결 | 친구 삭제 UI 없음 |
| 친구 검색 | `friendApi.searchByBubliId()` | 친구 추가 검색에 연결 | 검색 결과 1건 기반 UI라 결과 없음/중복 요청 문구 보강 필요 |
| 친구 요청 | `friendApi.listRequests/sendRequest/acceptRequest/rejectRequest()` | 친구 요청 패널에 연결 | 요청 취소 API 없음 |
| 보이스 룸 생성 | `src/features/communication/api/voiceApi.ts` | 프로젝트룸 대화에서 시작 버튼에 연결 | 1:1 보이스는 backend roomId 계약 필요 |
| 보이스 룸 조회 | `voiceApi.getRoom()` | API만 있음 | 입장 후 폴링 또는 WebSocket 이벤트 연결 필요 |
| 보이스 토큰 | `voiceApi.getToken()` | API만 있음 | LiveKit 클라이언트 연결 필요 |
| 마이크 상태 | `voiceApi.updateMicStatus()` | API만 있음 | 음소거 버튼 UI 연결 필요 |
| 나가기/종료 | `voiceApi.leave/end()` | API만 있음 | 세션 종료 UI 연결 필요 |

## 확인한 계약 차이

- `POST /api/chat/rooms/{chatRoomId}/messages`는 `clientMessageId`를 요청 본문으로 받는다. 헤더 전송은 쓰지 않는다.
- `GET /api/friends/search`는 배열이 아니라 단일 사용자를 돌려준다. 프론트는 기존 검색 UI 유지를 위해 배열로 감싸서 반환한다.
- `POST /api/friend-requests`는 `receiverUserId`가 아니라 `bubliId`를 받는다.
- `GET /api/friend-requests` 응답에는 `direction`이 없다. 프론트 어댑터에서 `/api/me`의 사용자 ID와 비교해 `SENT`/`RECEIVED`를 붙인다.
- `PATCH /api/voice/rooms/{id}/leave`, `PATCH /api/voice/rooms/{id}/end`는 `null`이 아니라 `VoiceRoomResponse`를 돌려준다.
