# Google Calendar WBS 삭제 재동기화 트러블슈팅

## 증상

- WBS 줄을 삭제했는데 Google Calendar 쪽 이벤트가 이미 없거나 삭제 응답이 늦으면 화면에 WBS가 계속 남아 보였다.
- 사용자는 Bubli 화면에서 삭제했지만, 일정 삭제 실패가 WBS 삭제까지 막으면서 "없는 항목이 지워지지 않는" 상태처럼 보였다.

## 원인

- 프론트가 `DELETE /api/schedules/{scheduleId}`를 먼저 호출하고, 이 호출이 실패하면 `DELETE /api/wbs-items/{id}`를 호출하지 않았다.
- Google Calendar에서 이미 지워진 이벤트, 외부 동기화 지연, 일시적인 Google API 실패가 모두 Bubli WBS 삭제 실패처럼 보였다.

## 기준 흐름

1. WBS 삭제를 누르면 연결 일정 삭제를 먼저 시도한다.
2. Google Calendar 삭제가 실패해도 화면에서는 연결 일정을 제거하고 Bubli WBS 삭제를 계속 진행한다.
3. Bubli WBS 삭제가 성공하면 화면에서도 WBS를 제거한다.
4. Google Calendar 삭제 실패분은 서버의 재동기화 또는 삭제 재시도 대상이다.
5. Bubli WBS 삭제 자체가 실패한 경우에만 화면에 WBS와 일정 연결을 다시 남긴다.

## 이번 프론트 조치

- 일정 삭제 실패와 WBS 삭제 실패를 분리했다.
- 일정 삭제 실패는 `삭제됨 — 캘린더 동기화 대기`로 낮추고 WBS 삭제를 막지 않는다.
- WBS 삭제가 실패하면 일정 연결을 다시 복구해 화면과 서버 상태가 어긋나지 않게 했다.

## 남은 확인

- 백엔드는 Google Calendar 404/410을 삭제 성공으로 처리해야 한다.
- 삭제 실패 대기열이 있으면 다음 동기화 때 같은 `googleEventId`를 다시 만들지 않고 삭제 재시도를 우선해야 한다.
- 프로젝트룸 WBS 삭제 뒤 `/app/calendar`와 Google Calendar 양쪽에서 같은 일정이 사라지는지 팀원 계정으로 확인한다.
