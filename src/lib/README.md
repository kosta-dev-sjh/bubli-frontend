# lib 구조

여러 기능에서 함께 쓰는 연결 코드를 둔다.

| 폴더 | 역할 |
|---|---|
| `api` | Spring Boot API 호출 공통 클라이언트 |
| `tauri` | Tauri IPC 호출. 기능 코드에서는 `tauriCommands`를 우선 사용한다. |
| `websocket` | 채팅, 알림, 에이전트 job 이벤트 |
| `validators` | 폼과 응답 검증 |
| `constants` | 화면과 기능에서 공유하는 상수 |
| `hooks` | 공통 React hook |

프론트와 Tauri는 Spring Boot API 서버만 호출한다.
에이전트 모듈이나 agent 컨테이너를 직접 호출하는 코드는 두지 않는다.

Tauri IPC는 로컬 폴더, SQLite, 위젯 사용 이벤트, 타이머 복구처럼 앱 안에서만 가능한 기능에 한정한다.
프로젝트룸, 자료, TODO, WBS, 채팅 원본, 보이스 토큰, 에이전트 실행은 HTTP API 경계를 따른다.
