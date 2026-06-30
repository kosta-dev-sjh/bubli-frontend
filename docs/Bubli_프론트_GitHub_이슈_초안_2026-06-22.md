# Bubli 프론트 GitHub 이슈 초안

이 문서는 `bubli-frontend` 레포의 GitHub Issues에 복사해서 넣기 위한 작업 카드 초안이다. 기준은 v14 기획서, `PROJECT_STRUCTURE.md`, `Bubli_프론트엔드_개발_가이드_2026-06-22.md`다.

## 보드 기준

| 항목 | 추천 값 |
|---|---|
| Project 보드 | `Bubli 개발 보드` |
| 기본 컬럼 | Todo, In Progress, Review, Done |
| 마일스톤 | `프론트 기반`, `회원 앱 핵심`, `소통/Tauri`, `통합 QA` |
| 공통 라벨 | `frontend`, `feature`, `chore`, `1순위`, `2순위` |
| PR 대상 | `develop` |

브랜치는 항상 `develop`에서 만든다.

```bash
git switch develop
git pull origin develop
git switch -c feature/작업명
```

## 이슈 1. 프론트 초기 개발 기반 구성

제목:

```text
[chore] Next.js와 Tauri 프론트 초기 개발 기반 구성
```

라벨:

```text
chore, frontend, 1순위
```

브랜치:

```text
chore/frontend-bootstrap
```

본문:

```markdown
## 작업 내용
Next.js와 Tauri 기반의 프론트 초기 개발 구조를 만든다.

## 포함 범위
- Next.js App Router 기본 설정
- Tauri 기본 설정
- 공개 사이트, 인증, 회원 웹 앱 라우트 생성
- 공통 API client 위치 생성
- Tauri IPC wrapper 위치 생성
- 디자인 v20 구현용 기본 패키지 설치

## 완료 기준
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과
- [ ] `cd src-tauri && cargo check` 통과
- [ ] `/`, `/login`, `/app`, `/app/chat` 라우트가 빌드에 포함됨
```

## 이슈 2. 공개 사이트 기본 화면 구현

제목:

```text
[feat] 공개 사이트 기본 화면 구현
```

라벨:

```text
feature, frontend, 1순위
```

브랜치:

```text
feature/public-site
```

본문:

```markdown
## 작업 내용
비회원이 Bubli를 이해하고 다운로드 또는 로그인으로 이동할 수 있는 공개 사이트 화면을 구현한다.

## 포함 범위
- `/`
- `/features`
- `/download`
- `/faq`
- 공개 사이트 공통 헤더와 CTA

## 완료 기준
- [ ] 공개 사이트에서 회원 자료, TODO, 채팅 데이터를 조회하지 않음
- [ ] 다운로드와 로그인 진입이 명확함
- [ ] 디자인 v20 톤의 토큰을 사용함
- [ ] 모바일과 데스크탑에서 가로 스크롤이 없음
```

## 이슈 3. 구글 로그인 화면과 세션 연결 준비

제목:

```text
[feat] 구글 로그인 화면 구현
```

라벨:

```text
feature, frontend, 1순위
```

브랜치:

```text
feature/auth-pages
```

본문:

```markdown
## 작업 내용
`/login` 화면과 Google OAuth 인증 API 연결 위치를 만든다.

## 포함 범위
- Google로 계속하기 버튼
- 최초 로그인 후 Bubli ID 설정 진입 안내
- react-hook-form, zod 기반 validation
- `features/auth/api` 연결 준비

## 완료 기준
- [ ] 백엔드 DTO 확정 전 임시 타입은 명시되어 있음
- [ ] 토큰 저장 방식은 임의 확정하지 않음
- [ ] 인증 실패, 로딩, 성공 상태가 화면에 있음
```

## 이슈 4. 회원 앱 레이아웃과 대시보드 빈 상태 구현

제목:

```text
[feat] 회원 앱 레이아웃과 대시보드 빈 상태 구현
```

라벨:

```text
feature, frontend, 1순위
```

브랜치:

```text
feature/app-shell-dashboard
```

본문:

```markdown
## 작업 내용
`/app` 기준 회원 웹 앱 레이아웃과 사용자 기준 대시보드의 빈 상태를 구현한다.

## 포함 범위
- 회원 앱 사이드바 또는 상단 네비게이션
- `/app` 대시보드 빈 상태
- 프로젝트룸 선택 상태 표시 위치
- 알림, 위젯 요약, 오늘 TODO 영역 자리

## 완료 기준
- [ ] `/app` 밖에 회원 전용 업무 화면이 없음
- [ ] 대시보드는 프로젝트룸 하나의 현황판처럼 보이지 않음
- [ ] 실제 데이터 연결 전에도 화면이 깨지지 않음
```

## 이슈 5. 자료보드 기본 화면 구현

제목:

```text
[feat] 자료보드 기본 화면 구현
```

라벨:

```text
feature, frontend, 1순위
```

브랜치:

```text
feature/resource-board
```

본문:

```markdown
## 작업 내용
`/app/resources` 자료보드 화면의 기본 구조를 구현한다.

## 포함 범위
- 개인 자료와 프로젝트룸 자료 필터
- 자료 목록 빈 상태
- 자료 상세 패널 자리
- 확인 필요 항목과 에이전트 분석 결과 표시 자리
- 긴 목록 가상화 적용 준비

## 완료 기준
- [ ] 개인 자료와 프로젝트룸 자료의 권한 설명이 섞이지 않음
- [ ] 자료 목록은 TanStack Table/Virtual 적용이 가능한 구조임
- [ ] 업로드 API 방식은 백엔드 계약 확정 전 임의 결정하지 않음
```

## 이슈 6. 프로젝트룸 WBS/작업판 기본 화면 구현

제목:

```text
[feat] 프로젝트룸 WBS 작업판 기본 화면 구현
```

라벨:

```text
feature, frontend, 1순위
```

브랜치:

```text
feature/project-room-work-board
```

본문:

```markdown
## 작업 내용
`/app/project-rooms/[roomId]/work`에서 WBS, TODO, 칸반, 타임라인을 함께 다룰 수 있는 작업 화면 뼈대를 만든다.

## 포함 범위
- WBS 트리 영역
- 작업판 영역
- 에이전트 후보 승인 대기 영역
- TODO 상세 영역
- dnd kit 적용 가능한 구조

## 완료 기준
- [ ] WBS와 TODO를 별도 URL로 쪼개지 않음
- [ ] 에이전트 후보와 확정 TODO가 시각적으로 구분됨
- [ ] 드래그 중 API 호출 없이 화면 상태를 먼저 다룰 수 있는 구조임
```

## 이슈 7. 소통 화면 기본 구조 구현

제목:

```text
[feat] 소통 화면 기본 구조 구현
```

라벨:

```text
feature, frontend, 1순위
```

브랜치:

```text
feature/communication-shell
```

본문:

```markdown
## 작업 내용
`/app/chat`에서 친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗을 다룰 수 있는 기본 구조를 만든다.

## 포함 범위
- 친구 목록 영역
- 1:1 채팅방 목록
- 프로젝트룸 채팅 목록
- 메시지 영역
- 보이스챗 입장 영역
- WebSocket/LiveKit 연결 위치

## 완료 기준
- [ ] 메시지 원본은 서버 DB 기준임을 유지함
- [ ] Tauri 캐시를 서버 원본처럼 다루지 않음
- [ ] LiveKit key와 secret을 클라이언트에 두지 않음
```

## 이슈 8. Tauri 전용 소통 화면 구현

제목:

```text
[feat] Tauri 전용 소통 창 화면 구현
```

라벨:

```text
feature, frontend, 2순위
```

브랜치:

```text
feature/tauri-communication-window
```

본문:

```markdown
## 작업 내용
Tauri 앱에서 메인 WebView의 소통 탭을 숨길 때 사용할 `/app/desktop/communication` 화면을 구현한다.

## 포함 범위
- 작은 창 기준 채팅 UI
- 보이스챗 입장 상태
- 같은 API, WebSocket, LiveKit token 흐름 재사용

## 완료 기준
- [ ] 웹 `/app/chat`과 다른 API를 만들지 않음
- [ ] 배포된 HTTPS 회원 웹 앱 연결 기준을 유지함
- [ ] 창 크기가 작아도 주요 조작이 가능함
```

## 이슈 9. 버블 위젯 UI 기반 구현

제목:

```text
[feat] 버블 위젯 UI 기반 구현
```

라벨:

```text
feature, frontend, 2순위
```

브랜치:

```text
feature/widget-bubble-ui
```

본문:

```markdown
## 작업 내용
디자인 v20 기준의 버블 위젯 공통 UI와 상태 표현을 만든다.

## 포함 범위
- TODO 버블
- 에이전트 버블
- 소통 버블
- 타이머 버블
- 고스트, 고정, 최소화 상태
- Motion 기반 짧은 전환

## 완료 기준
- [ ] 회원 웹 화면을 작게 복제한 형태가 아님
- [ ] 개인 작업 인터페이스로 보임
- [ ] 모션은 opacity, transform 중심으로 제한함
- [ ] 상세 위젯 사용 이벤트는 서버 API로 직접 보내지 않음
```

## 이슈 10. Tauri IPC wrapper와 로컬 기능 연결 준비

제목:

```text
[feat] Tauri IPC wrapper와 로컬 기능 연결 준비
```

라벨:

```text
feature, frontend, 2순위
```

브랜치:

```text
feature/tauri-ipc-wrapper
```

본문:

```markdown
## 작업 내용
Tauri 앱에서만 가능한 로컬 기능을 호출할 수 있도록 IPC wrapper와 타입을 정리한다.

## 포함 범위
- 로컬 폴더 선택
- 로컬 파일 scan/watch
- SQLite 캐시
- 타이머 복구
- 위젯 사용 이벤트 기록
- local_sync_outbox

## 완료 기준
- [ ] HTTP API와 Tauri IPC 경계가 분리됨
- [ ] 개인 에이전트 원문과 위젯 상세 이벤트 원문은 서버로 보내지 않음
- [ ] Tauri plugin은 Rust 등록과 capability 설정이 필요하다는 주석 또는 문서가 있음
```

## 이슈 11. 백엔드 API 계약 반영

제목:

```text
[chore] 백엔드 API 계약 확정분 프론트 타입에 반영
```

라벨:

```text
chore, frontend, backend, 1순위
```

브랜치:

```text
chore/api-contract-sync
```

본문:

```markdown
## 작업 내용
백엔드에서 확정한 Swagger/OpenAPI 또는 `.http` 예시를 기준으로 프론트 API 타입과 request/response DTO를 맞춘다.

## 포함 범위
- 인증 API
- 공통 응답과 에러 DTO
- 파일 업로드
- 채팅/WebSocket payload
- LiveKit token 응답
- agent job 이벤트
- 타이머/위젯 동기화

## 완료 기준
- [ ] 백엔드 Entity를 프론트 타입으로 쓰지 않음
- [ ] Response DTO 기준으로 타입을 작성함
- [ ] 인증 토큰 저장 방식이 백엔드 계약과 맞음
- [ ] API client가 임의 endpoint를 만들지 않음
```

## 이슈 12. 프론트 품질 검증 스크립트 정리

제목:

```text
[chore] 프론트 품질 검증 스크립트와 PR 체크 기준 정리
```

라벨:

```text
chore, frontend, 2순위
```

브랜치:

```text
chore/frontend-quality-check
```

본문:

```markdown
## 작업 내용
프론트 PR 전에 실행할 검증 명령과 체크 기준을 정리한다.

## 포함 범위
- lint
- typecheck
- build
- Tauri cargo check
- PR 체크리스트 문구

## 완료 기준
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과
- [ ] `cd src-tauri && cargo check` 통과
- [ ] 실행하지 못한 검증을 PR 본문에 적는 기준이 있음
```

## 추천 진행 순서

1. 이슈 1을 먼저 등록하고 현재 초기 세팅 작업을 연결한다.
2. 이슈 2, 3, 4를 먼저 진행해 공개 사이트, 인증, 회원 앱 입구를 만든다.
3. 이슈 5, 6으로 자료보드와 WBS/작업판을 만든다.
4. 이슈 7, 8로 소통과 Tauri 소통 창을 붙인다.
5. 이슈 9, 10으로 버블과 Tauri 로컬 기능을 붙인다.
6. 이슈 11은 백엔드 계약이 나오는 순간 계속 갱신한다.
7. 이슈 12는 PR 품질 기준이 흔들릴 때 먼저 정리한다.
