# features 구조

도메인별 기능 코드를 둔다.

화면 라우트는 `src/app`에 두고, 화면에서 쓰는 상태, API 호출, UI 조합, 타입 변환은 이곳의 도메인 폴더에 둔다.

처음 구현할 때는 빈 화면을 먼저 만들고, API 계약이 정리된 기능부터 내부 코드를 채운다.

| 폴더 | 기준 역할 |
|---|---|
| `auth` | 구글 OAuth 로그인, 세션 |
| `dashboard` | 사용자 기준 대시보드 |
| `project-room` | 프로젝트룸, 멤버, 친구 기반 초대 |
| `resources` | 개인 자료와 프로젝트룸 자료, 문서 분석 결과 |
| `agent` | 에이전트 작업 상태와 후보 표시 |
| `wbs` | WBS/작업판 |
| `todo` | 개인 TODO와 프로젝트룸 TODO |
| `communication` | 친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗 |
| `widget` | 버블 설정, 표시 데이터, 항목 상태, 사용 집계 |
| `timer` | 타이머 버블, time_logs, heartbeat, 복구 |
| `notification` | 알림과 읽음 상태 |
| `calendar` | 일정과 Google Calendar 표시 |
| `managed-folder` | Tauri 개인 관리 폴더 |
| `activity` | 활성 앱과 창 제목 감지 동의, 작업시간 보조 |
| `settings` | 사용자 설정, 알림 설정, 개인정보 동의 |
