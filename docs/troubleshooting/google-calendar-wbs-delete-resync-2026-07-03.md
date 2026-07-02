# Google Calendar WBS 삭제 재동기화 트러블슈팅

## 증상

- WBS 줄을 삭제했는데 Google Calendar 쪽 이벤트가 이미 없거나 삭제 응답이 늦으면 화면에 WBS가 계속 남아 보였다.
- 사용자는 Bubli 화면에서 삭제했지만, 일정 삭제 실패가 WBS 삭제까지 막으면서 "없는 항목이 지워지지 않는" 상태처럼 보였다.

## 원인

- 프론트가 `DELETE /api/schedules/{scheduleId}`를 먼저 호출하고, 이 호출이 실패하면 `DELETE /api/wbs-items/{id}`를 호출하지 않았다.
- Google Calendar에서 이미 지워진 이벤트, 외부 동기화 지연, 일시적인 Google API 실패가 모두 Bubli WBS 삭제 실패처럼 보였다.

## 기준 흐름

1. WBS 삭제를 누르면 연결 일정 삭제를 먼저 시도한다.
2. Google Calendar 이벤트가 이미 없어서 404/410 또는 동일한 의미의 삭제 완료 응답이 오면 원격 삭제 성공으로 본다.
3. Google Calendar 삭제가 실패해도 화면에서는 연결 일정을 제거하고 Bubli WBS 삭제를 계속 진행한다.
4. Bubli DB 삭제가 성공하면 화면에서도 WBS를 제거한다.
5. Google Calendar 삭제 실패분은 서버의 재동기화 또는 삭제 재시도 대상이다.
6. Bubli WBS 삭제 자체가 실패한 경우에만 화면에 WBS와 일정 연결을 다시 남긴다.

## Google Calendar에 없고 Bubli DB에만 남은 경우

1. 사용자가 Bubli에서 WBS 또는 연결 일정을 삭제한다.
2. 서버가 Google Calendar 삭제를 시도했는데 원격 이벤트가 없으면 `이미 삭제됨`으로 처리한다.
3. Bubli WBS 삭제가 성공하면 화면에서도 WBS를 제거한다.
4. 다음 동기화 때 같은 `googleEventId`가 다시 들어오지 않으면 그대로 삭제 상태를 유지한다.
5. 같은 일정이 Google Calendar에 실제로 다시 살아 있으면 서버가 재동기화로 다시 가져올 수 있고, 사용자는 다시 삭제할 수 있어야 한다.

## 현재 연동 범위

- 현재 백엔드는 Google Calendar의 `primary` 캘린더 이벤트만 생성, 수정, 삭제한다.
- WBS 기간은 개인 Google 계정의 기본 캘린더에 들어가는 구조다.
- 프로젝트룸 이름으로 Google Calendar의 `다른 캘린더`를 만들고 거기에 WBS를 넣는 구조는 가능하지만 프론트 단독 작업이 아니다.
- `다른 캘린더` 구조를 열려면 백엔드에서 OAuth scope를 `calendar.events` 수준에서 캘린더 생성 권한까지 확장하고, 프로젝트룸별 `calendarId`를 저장해야 한다.
- 사용자는 scope 변경 후 재동의가 필요할 수 있다.

## 이번 프론트 조치

- 일정 삭제 실패와 WBS 삭제 실패를 분리했다.
- 일정 삭제 실패는 `삭제됨 — 캘린더 동기화 대기`로 낮추고 WBS 삭제를 막지 않는다.
- WBS 삭제가 실패하면 일정 연결을 다시 복구해 화면과 서버 상태가 어긋나지 않게 했다.

## 남은 확인

- 백엔드는 Google Calendar 404/410을 삭제 성공으로 처리해야 한다.
- 삭제 실패 대기열이 있으면 다음 동기화 때 같은 `googleEventId`를 다시 만들지 않고 삭제 재시도를 우선해야 한다.
- 프로젝트룸 WBS 삭제 뒤 `/app/calendar`와 Google Calendar 양쪽에서 같은 일정이 사라지는지 팀원 계정으로 확인한다.
- 프로젝트룸별 `다른 캘린더`를 도입할 경우 `project_rooms.google_calendar_id` 같은 저장 위치, 캘린더 생성 API, 권한 재동의 흐름을 먼저 합의한다.
