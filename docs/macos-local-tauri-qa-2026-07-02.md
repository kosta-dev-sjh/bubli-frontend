# macOS 로컬/Tauri 기능 런타임 QA (2026-07-02)

담당: bubli-frontend macOS 로컬/Tauri 기능. 브랜치: `claude/macos-tauri-local-qa-20260702` (develop 최신에서 분기). PR: develop 대상.

한마디로: "코드상 있어 보임"이 아니라, 이 맥에서 실제로 SQLite 로컬 DB, 로컬 파일 감시, 활동(앱/창) 감지, 서버 왕복 동기화가 도는지 직접 돌려서 확인했다. 확인한 것과 아직 못 확인한 것을 아래에 나눠 적는다.

## 실행 환경

- macOS(Darwin 25.4.0), Node 24.14.1, cargo/rustc 1.96.0(Homebrew), Xcode CLT, sqlite3 3.51.0.
- 백엔드: `bubli-backend`(Spring Boot, local 프로필)가 이 세션 중 8080에 기동돼 있었고, `bubli-postgres`(pgvector pg16, DB/유저 `bubli`)와 `bubli-redis`가 healthy. JWT 시크릿 기본값이 프론트 시드 스크립트와 일치.
- 협업 조건: 같은 워킹트리에서 다른 에이전트가 위젯 창/앱 표면 가독성(topbar 등)을 동시 편집 중이라, 그 파일들은 손대지 않고 로컬 DB·활동·파일 감시 영역만 다뤘다.

## 검증(직접 실행해 확인)

### 1. 활동(앱/창) 감지 — macOS osascript

- `activity.rs`의 macOS 캡처 스크립트와 동일한 osascript를 이 맥에서 직접 실행 → 최상위 앱 이름을 종료코드 0으로 반환(예: `Codex`).
- 창 제목은 손쉬운 사용(Accessibility) 권한이 없으면 `-1719`("보조 접근 미허용")가 나는데, 코드의 `try … end try`가 이를 흡수해 앱 이름만 정상 반환한다(정상 저하). 스크립트를 try 없이 돌려 `-1719`를 실제로 재현해 확인.
- 즉 앱 이름 캡처는 자동화 권한만으로 동작, 창 제목만 손쉬운 사용 권한이 추가로 필요하다는 코드 주석이 실제 동작과 일치.
- 개선: 자동화 권한 거부(`-1743`) 시 "시스템 설정 > 개인정보 보호 및 보안 > 자동화에서 Bubli의 System Events 제어 허용" 안내로 오류 메시지를 구체화(`activity.rs`).

필요한 macOS 권한(문서화):

- 자동화(Automation) → System Events: 앱/창 감지의 필수 권한. 없으면 osascript가 `-1743`으로 실패하고 Rust가 개선된 안내 메시지를 반환. 패키징된 앱은 최초 시도 시 macOS가 사용자에게 허용을 묻는다.
- 손쉬운 사용(Accessibility): 창 제목 읽기에만 필요. 없으면 앱 이름은 정상, 창 제목만 빈 값.
- 과한 추적 없음: 키 입력·화면 전체 캡처는 하지 않고 현재 앱명/창 제목 수준만 읽는다.

### 2. SQLite 로컬 DB — 번들 rusqlite 엔진 대상 cargo test

앱이 실제로 쓰는 번들 SQLite(rusqlite `features=["bundled"]`)를 대상으로, 임시 실파일을 열어 아래를 `cargo test`로 확인(8건 전부 통과):

- 스키마 마이그레이션 후 새 커넥션으로 다시 열어도 데이터 유지(= 앱 재시작 지속) + `journal_mode=WAL` 확인.
- FTS5 trigram 부분검색 실동작. 엔진에 FTS5/trigram이 없으면 `CREATE VIRTUAL TABLE … USING fts5(tokenize='trigram')` 자체가 실패하므로, 스키마 생성 성공 + `MATCH '"enewal"'`가 "renewal"을 찾는 것으로 실증.
- `VACUUM main INTO` 백업 파일이 독립적으로 열리고 `PRAGMA quick_check=ok`로 복원 가능. `backup_local_sqlite`가 실제 쓰는 연산과 동일.
- `PRAGMA quick_check` 무결성 확인(`check_local_sqlite_integrity` 근거).
- sync_status 흐름 `LOCAL_ONLY → SYNC_PENDING → SYNCED`가 실제 스키마에서 흐름.
- personal-only 경계: `managed_folders`에 `room_id` 컬럼이 없음을 스키마 레벨 회귀 가드로 고정.

파일 위치: `src-tauri/src/local_db.rs`의 `#[cfg(test)] mod tests`.

### 3. 로컬 파일 감시 — 실제 FSEvents

- 앱의 watcher(`local_files::watch_managed_folder`)가 쓰는 것과 동일한 `notify` recommended watcher(macOS에서 `fsevent-sys` 백엔드)를 실제로 띄워, 감시 폴더에 파일을 생성했을 때 이벤트가 실전달되는지 `cargo test`로 확인(macOS 한정 테스트, 통과).
- `cargo check` 시 `notify`/`fsevent-sys` 컴파일 확인 → macOS 파일 이벤트 백엔드가 FSEvents로 붙는다는 근거.
- scan → 로컬 인덱스 + FTS 색인/스니펫은 기존 `local_files.rs` 단위 테스트로 통과.

### 4. 실백엔드 왕복(mock 아님)

기동 중인 실백엔드(8080)에 시드 후 아래를 직접 호출해 실응답 확인:

- `POST /api/local-file-events/sync` (개인 personal-only 경로):
  - `CREATED` → `SYNCED` + 서버 `resourceId` 반환(예: `91dd6e11-…`).
  - `DELETED`(그 resourceId로) → `SYNCED`.
  - 이는 Rust `stage_local_file_events_for_sync` → 프론트 어댑터가 보내는 바로 그 payload 형태로 검증.
- `POST /api/activity/current-app`, `GET /api/activity/today`:
  - 활동 동의 없는 사용자는 `403`(`ACTIVITY_403_001`, 서버의 `assertActivityConsent`). 프론트 consentGranted 게이트·activity.rs 동의 주석과 일치.
  - `user_privacy_consents`에 `ACTIVITY_CONTEXT` 동의를 넣으면 `200`, `/today`에 방금 기록이 반영(count=1).
- `GET /api/widget/summary` → `200`, 시드 룸 컨텍스트 일치.
- 시드+스모크(`scripts/dev-widget-real-backend.mjs`)는 widget summary/settings/context/chat/dashboard/usage POST까지 통과했고, 위젯 "오늘 사용량 집계" 단언에서 중단(누적 데이터 특성으로 보이며 로컬/Tauri 도메인 밖). 로컬 도메인 검증은 위 겨냥 스크립트로 별도 완결.

### 5. 표준 검증 명령(전부 통과)

- `npm run typecheck`
- `npm run lint`(경고 15, 에러 0 — 기존 수준)
- `npm run check:tauri-boundaries` / `check:product-rules` / `check:design-tokens`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `cargo check --manifest-path src-tauri/Cargo.toml`(macOS)
- `cargo test --manifest-path src-tauri/Cargo.toml`(8건)

### 6. macOS/Windows 분기 경계

- `osascript` 사용은 전부 `#[cfg(target_os = "macos")]` 함수 안, `windows_sys`/Win32 사용은 전부 `#[cfg(target_os = "windows")]` 함수 안.
- `windows-sys`는 Cargo.toml에서 `[target.'cfg(windows)'.dependencies]`라 macOS 빌드에 애초에 들어오지 않음. macOS `cargo check`/`cargo test` 통과로 macOS 쪽 격리 실증.

## 미검증(이 환경에서 확인 못 함)

- Windows 실빌드/실행: 이 맥의 Homebrew rustc에 Windows 타깃/링커가 없어 크로스 빌드 불가. cfg 게이팅과 target 한정 의존성으로 구조적 격리만 확인. Windows 담당 환경에서 별도 확인 필요.
- 실제 Tauri 데스크탑 앱 창을 띄운 상태의 in-app watch 장시간 QA, 활동 감지 장시간 주기 기록 QA. 단발 이벤트/왕복은 확인했으나 장시간 안정성은 미검증.
- 네이티브 폴더 picker(다이얼로그 플러그인) 연동: 현재는 프론트가 이미 해석된 절대경로를 넘기는 방식. picker 자체 연동은 미검증.
- 위젯 "오늘 사용량 집계"의 서버 누적 카운트 단언: 로컬/Tauri 도메인 밖이라 이번 범위에서 정밀 검증 안 함(별도 위젯 담당 영역).

## 차단(외부 요인)

- 초기에 8080 백엔드가 미기동이었고 세션 중 컨테이너 상태가 유동적(동시 작업 에이전트의 기동/중지). 검증 시점에는 healthy 상태를 잡아 왕복을 확인했으나, 항상 떠 있다고 보장하긴 어려움. 재현 시 `bubli-backend`를 local 프로필로 먼저 기동해야 함.

## 코드 변경 요약

- `src-tauri/src/local_db.rs`: 번들 SQLite 검증 테스트 + macOS FSEvents 실감시 테스트 추가.
- `src-tauri/src/activity.rs`: macOS 자동화 권한 거부 시 오류 메시지 구체화.
- `src-tauri/src/widget_usage.rs`: 기존 rustfmt 드리프트 한 줄 정리.
- `docs/기능_API연결_명세_2026-07-01.csv`: SQLite/활동/폴더추적/아웃박스/평균 행에 2026-07-02 검증 근거 반영.

## 알려진 문서 드리프트(후속, 이번엔 손대지 않음)

- `src/lib/tauri/tauri-api-boundary.ts`와 `src/lib/local/managed-folder-client.ts`에 watch가 "native step pending"/"not wired yet"이라는 코멘트가 남아 있으나, 실제로는 `notify` 기반 네이티브 감시가 구현돼 있다. 두 파일은 열려 있는 PR(#33, 코덱스)이 동시에 수정 중이라 충돌을 피하려고 이번에 건드리지 않았다. 후속 PR에서 코멘트만 정리 권장.

## 재현 방법

```bash
# 표준 검증
npm run typecheck && npm run lint
npm run check:tauri-boundaries && npm run check:product-rules && npm run check:design-tokens
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml

# macOS 활동 감지 osascript 단독 확인
osascript -e 'tell application "System Events" to name of first application process whose frontmost is true'

# 실백엔드 왕복(백엔드 8080 + bubli-postgres 기동 후)
node scripts/dev-widget-real-backend.mjs seed
```
