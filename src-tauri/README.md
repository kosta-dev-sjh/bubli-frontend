# src-tauri 구조

Tauri 데스크탑 전용 기능을 둔다.

이 레포의 기본 화면은 Next.js 회원 웹 앱이다. Tauri는 그 화면을 데스크탑에서 실행하면서 아래 기능을 더한다.

- 버블 창과 창 제어
- 개인 관리 폴더 선택과 감지
- 로컬 SQLite 캐시
- 개인 에이전트 단기기억
- 위젯 사용 기록
- 타이머 복구
- 로컬 백업과 복구

프론트는 Tauri IPC를 직접 흩뿌리지 않고 `src/lib/tauri`의 래퍼를 통해 호출한다.
프론트 기능 코드에서는 Rust `invoke_handler`에 등록된 명령만 `src/lib/tauri/commands.ts`의 `tauriCommands`로 사용한다.
아직 구현 전인 명령은 `PLANNED_TAURI_COMMANDS`에만 두고, Rust 구현과 권한 설정이 들어간 뒤 실제 호출 함수로 연다.
각 IPC의 입력과 응답 계약은 `src/lib/tauri/commands.ts`의 `TauriCommandContract`, `PlannedTauriCommandContract` 타입에 먼저 맞춘다.
새 IPC를 추가할 때는 v15 기획서 14.8의 Tauri 전용 IPC 목록과 맞춰야 하며, 서버 원본 데이터 변경은 HTTP API로 처리한다.
