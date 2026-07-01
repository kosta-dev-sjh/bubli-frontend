# Bubli 프론트 AI 작업자 Git 작업 규칙

이 문서는 Codex, Claude Code 같은 AI 작업자가 `bubli-frontend` 레포에서 작업할 때 따라야 할 규칙이다. Bubli 서비스 안의 에이전트 기능을 설명하는 문서가 아니다. 기준은 `README.md`, `GIT_CONVENTION.md`, `docs/PROJECT_STRUCTURE.md`, `docs/Bubli_프론트엔드_개발_가이드_2026-06-22.md`다.

## 작업 시작 전 읽을 문서

AI 작업자는 코드 수정 전에 아래 문서를 먼저 확인한다.

| 순서 | 문서 | 확인할 내용 |
|---|---|---|
| 1 | `README.md` | 서비스 정체성, 레포 역할, Tauri 구조 |
| 2 | `GIT_CONVENTION.md` | 브랜치, 커밋, PR 규칙 |
| 3 | `docs/PROJECT_STRUCTURE.md` | 라우트와 폴더 구조 |
| 4 | `docs/Bubli_프론트엔드_개발_가이드_2026-06-22.md` | feature 책임, API/Tauri 경계 |
| 5 | `docs/Bubli_프론트_현재작업_및_작업순서_2026-06-22.md` | 현재 작업 순서 |

## 브랜치 작업 규칙

작업은 항상 `develop`에서 새 브랜치를 만들어 진행한다.

```bash
git switch develop
git pull origin develop
git switch -c feature/기능명
```

문서나 설정 작업은 `chore/작업명`을 사용한다.

```bash
git switch -c chore/frontend-docs
```

직접 push 금지 대상:

```text
main
develop
```

`main`과 `develop`은 PR을 통해서만 합친다.

## Issue와 PR 규칙

작업 전 가능하면 GitHub Issue를 만든다. 사소한 오타 수정은 생략할 수 있다.

PR은 feature 브랜치에서 `develop`으로 연다.

PR 본문에는 아래를 채운다.

```markdown
## 작업 내용
## 변경 사항
## 테스트 방법
## 체크리스트
```

관련 Issue가 있으면 본문에 아래처럼 적는다.

```text
Closes #이슈번호
```

## 커밋 규칙

커밋 메시지는 `GIT_CONVENTION.md`를 따른다.

```text
타입: 작업 내용 요약
```

사용 타입:

| 타입 | 사용 상황 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `chore` | 설정, 빌드, 문서 작업 |

예시:

```text
feat: 공개 사이트 라우트 추가
feat: 프로젝트룸 작업 화면 뼈대 구현
fix: 채팅방 메시지 로딩 상태 수정
chore: 프론트 개발 가이드 추가
```

## 에이전트 커밋 전 확인

에이전트는 커밋 전에 아래를 확인한다.

```bash
git status --short
```

확인 기준:

- 내가 수정한 파일만 stage한다.
- 관련 없는 사용자 변경 파일은 건드리지 않는다.
- `.env`, secret, token, API key를 stage하지 않는다.
- 자동 생성 파일이나 빌드 산출물을 불필요하게 stage하지 않는다.
- `main`, `develop` 브랜치에서 직접 커밋하지 않는다.

stage는 가급적 파일을 명시해서 한다.

```bash
git add docs/Bubli_프론트엔드_개발_가이드_2026-06-22.md
```

## 검증 규칙

현재 레포는 Next.js와 Tauri 기본 설정이 들어간 상태다. 코드나 설정을 바꾸면 가능한 범위에서 아래 명령을 실행한다.

권장 검증:

| 상황 | 실행 |
|---|---|
| 일반 프론트 수정 | `npm run lint`, `npm run typecheck` |
| 라우트, 빌드 설정, provider 수정 | `npm run build` |
| Tauri Rust 설정 수정 | `cd src-tauri && cargo check` |
| 실제 데스크탑 앱 창 확인 | `npm run tauri:dev` |

없는 스크립트를 임의로 문서에 필수로 적지 않는다.

## 프론트 작업 경계

에이전트는 프론트 레포에서 아래를 지킨다.

- 백엔드 API 구현을 프론트 레포에 만들지 않는다.
- 프론트와 Tauri는 Spring Boot API 서버만 호출한다.
- 에이전트 모듈이나 agent 컨테이너를 직접 호출하지 않는다.
- 백엔드 Entity를 프론트 타입으로 가정하지 않는다.
- Response DTO가 확정되기 전에는 임시 타입임을 주석으로 남긴다.
- Tauri SQLite에만 있어야 하는 개인 에이전트 원문과 위젯 상세 이벤트를 서버 API로 보내지 않는다.
- LiveKit key와 secret을 클라이언트 환경 변수에 두지 않는다.
- 공개 사이트에서 회원 자료, 프로젝트룸, TODO, 채팅 데이터를 조회하지 않는다.

## Tauri 작업 경계

Tauri 전용 기능은 HTTP API와 IPC를 분리한다.

| 구분 | 처리 위치 |
|---|---|
| 프로젝트룸, 자료, TODO, WBS, 채팅, 일정, 알림 | HTTP API |
| LiveKit token 발급 | HTTP API |
| 로컬 폴더 선택과 파일 감지 | Tauri IPC |
| SQLite 캐시와 백업 | Tauri IPC |
| 개인 에이전트 원문 대화 | Tauri SQLite |
| 위젯 상세 사용 이벤트 | Tauri SQLite |
| 서버 반영 대기열 | Tauri SQLite |
| 타이머 비정상 종료 복구 | HTTP API와 Tauri SQLite 비교 |

## PR 전 최종 점검

PR을 열기 전에 아래를 확인한다.

- 작업 브랜치가 `feature/*`, `fix/*`, `chore/*` 중 하나다.
- `git status --short`에 의도한 변경만 남아 있다.
- 가능한 검증 명령을 실행했다.
- 실행하지 못한 검증은 PR 본문에 이유를 적는다.
- 화면 라우트가 `docs/PROJECT_STRUCTURE.md`와 맞다.
- API 경계가 `docs/Bubli_프론트엔드_개발_가이드_2026-06-22.md`와 맞다.
- 문서 변경이면 금지 용어와 불필요한 이모지가 들어가지 않았는지 확인한다.

## 에이전트 보고 형식

작업이 끝나면 에이전트는 아래를 짧게 보고한다.

```text
변경 파일:
- 파일 경로

변경 내용:
- 핵심 변경 2~4개

검증:
- 실행한 명령
- 실행하지 못한 명령과 이유

남은 확인:
- 백엔드 계약 대기 항목
- 팀원 확인 필요 항목
```
