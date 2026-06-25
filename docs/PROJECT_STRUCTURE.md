# Bubli Frontend 폴더 구조

이 문서는 최종 기획서 v15와 최신 `10_API-Design.md`의 API/화면 구조를 기준으로 Next.js와 Tauri 프론트 구조를 맞추기 위한 기준이다.

## 기준

- 공개 사이트는 비회원에게 서비스 소개, 다운로드, 로그인 진입을 제공한다.
- 회원 웹 앱은 `/app` 아래에서 프로젝트룸, 대시보드, 자료보드, WBS/작업판, 채팅, 설정을 제공한다.
- Tauri 앱은 회원 웹 앱의 `/app`을 WebView로 열고, 앱에서만 가능한 버블 위젯, 로컬 폴더, SQLite, 백업, 창 제어를 붙인다.
- 프론트와 Tauri는 Spring Boot API 서버만 호출한다. 에이전트 모듈이나 agent 컨테이너를 직접 호출하지 않는다.
- 백엔드 API 구현은 `bubli-backend`에서 맡고, 이 레포는 API client, 타입, 화면, Tauri IPC 연결을 맡는다.
- 프론트 feature는 화면 기준으로 나누되, API 호출과 데이터 원본 책임은 백엔드 개발 가이드의 `project`, `resource`, `work`, `chat`, `memory`, `widget`, `voice`, `localsync`, `activity`, `agent` 경계를 따른다.
- 인증 API의 세부 경로는 프론트에서 임의 확정하지 않고 백엔드 `auth.http`와 `auth` 담당자 기준으로 맞춘다.

## Next.js 화면 라우트

Next.js route group 이름은 URL에 들어가지 않는다. 실제 URL은 아래 표의 경로를 따른다.

| 구분 | 실제 URL | 폴더 |
|---|---|---|
| 공개 사이트 | `/` | `src/app/(public)` |
| 공개 사이트 | `/features` | `src/app/(public)/features` |
| 공개 사이트 | `/download` | `src/app/(public)/download` |
| 공개 사이트 | `/faq` | `src/app/(public)/faq` |
| 인증 | `/login` | `src/app/(auth)/login` |
| 인증 | `/signup` | `src/app/(auth)/signup` |
| 회원 웹 앱 | `/app` | `src/app/(workspace)/app` |
| 회원 웹 앱 | `/app/projects` | `src/app/(workspace)/app/projects` |
| 회원 웹 앱 | `/app/resources` | `src/app/(workspace)/app/resources` |
| 회원 웹 앱 | `/app/project-rooms/[roomId]/work` | `src/app/(workspace)/app/project-rooms/[roomId]/work` |
| 회원 웹 앱 | `/app/chat` | `src/app/(workspace)/app/chat` |
| 회원 웹 앱 | `/app/settings` | `src/app/(workspace)/app/settings` |
| Tauri 전용 화면 | `/app/desktop/communication` | `src/app/(workspace)/app/desktop/communication` |

```text
src/app
├── (public)
│   ├── page.tsx
│   ├── features
│   ├── download
│   └── faq
├── (auth)
│   ├── login
│   └── signup
└── (workspace)
    └── app
        ├── page.tsx
        ├── projects
        ├── resources
        ├── project-rooms
        │   └── [roomId]
        │       └── work
        ├── chat
        ├── settings
        └── desktop
            └── communication
```

`/app/project-rooms/[roomId]/work`는 프로젝트룸의 WBS, TODO, 칸반, 타임라인을 함께 다루는 작업 화면이다. WBS와 TODO는 별도 URL 이름으로 나누지 않고 `features/wbs`, `features/todo` 컴포넌트를 이 화면에서 조합한다.

`/app/desktop/communication`은 Tauri 앱에서 메인 WebView의 소통 탭을 숨길 때 사용할 수 있는 별도 화면이다. 백엔드 API는 새로 만들지 않고, 회원 웹 앱의 채팅/보이스 API와 WebSocket, LiveKit 토큰 발급 흐름을 그대로 쓴다.

## 기능 모듈

| 폴더 | 역할 |
|---|---|
| `features/auth` | 로그인, 회원가입, 사용자 세션 |
| `features/dashboard` | 사용자 기준 대시보드 |
| `features/project-room` | 프로젝트룸 생성, 설정, 멤버, 친구 기반 초대 |
| `features/resources` | 개인 자료, 프로젝트룸 자료, 업로드, 문서 분석, 버전, 댓글 |
| `features/agent` | agent_jobs, agent_suggestions, 문서 분석 후보, 문서 초안 후보, 후보 승인 전 표시 |
| `features/wbs` | WBS 트리, 작업판, 후보 승인 후 작업 구조 표시. 백엔드 `work.wbs` API 사용 |
| `features/todo` | 개인 TODO, 프로젝트룸 TODO, 담당자 기준 반영. 백엔드 `work.task` API 사용 |
| `features/communication` | 친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗 |
| `features/widget` | 버블 설정, 표시 데이터, 항목 상태, 사용 집계 |
| `features/timer` | time_logs, heartbeat, 타이머 버블, 비정상 종료 복구 |
| `features/notification` | 알림 목록, 읽음 상태, 개인 알림 큐 |
| `features/calendar` | 일정과 Google Calendar 표시 |
| `features/managed-folder` | Tauri 개인 관리 폴더 연결 화면 |
| `features/activity` | 활성 앱/창 제목 감지 동의와 작업시간 보조 표시 |
| `features/settings` | 프로필, 알림, 개인정보 동의, 위젯, 폴더 설정 |

각 기능 폴더의 `api/`에는 해당 기능에서 쓰는 API 호출 함수만 둔다. 공통 fetch 설정, 인증 헤더, 공통 응답 포맷, 에러 처리는 `src/lib/api`에서 관리한다.
백엔드 Entity를 프론트 타입으로 직접 가정하지 않고, 백엔드 Response DTO 기준으로 `types/api`를 만든다.

## v15 API 묶음과 프론트 위치

| v15/API 구간 | 프론트 위치 | 기준 |
|---|---|---|
| 공개 사이트와 회원 앱 라우트 | `src/app` | 실제 URL은 `/app` 기준으로 맞춘다 |
| 프로젝트룸, 멤버, 친구 초대, 자료 API | `features/project-room`, `features/resources` | 프로젝트와 프로젝트룸을 분리하지 않고 프로젝트룸 기준으로 맞춘다 |
| 에이전트, 작업, WBS API | `features/agent`, `features/todo`, `features/wbs`, `features/timer`, `features/widget` | 에이전트는 후보만 보여주고 확정은 API/core 승인 뒤 반영한다 |
| 채팅, 알림, 일정, 위젯 API | `features/communication`, `features/notification`, `features/calendar`, `features/widget` | 채팅 원본은 서버 DB, Tauri는 캐시만 둔다 |
| 사용자별 설정 API | `features/settings`, `features/managed-folder`, `features/activity` | 동의와 로컬 기능 설정을 분리한다 |
| Tauri 전용 API | `src/lib/tauri`, `src-tauri/src`, Tauri 관련 features | 로컬 접근은 IPC, 서버 반영은 HTTP API |
| 보이스챗 API | `features/communication` | LiveKit key/secret은 클라이언트에 두지 않고 비회원 임시 참여 토큰을 만들지 않는다 |

## 공통 코드

| 폴더 | 역할 |
|---|---|
| `components/ui` | 버튼, 입력, 탭, 모달 같은 기본 UI |
| `components/layout` | 공개 사이트, 회원 앱, 프로젝트룸 레이아웃 |
| `components/icons` | Bubli에서 쓰는 SVG 아이콘 |
| `components/bubbles` | 버블 형태의 공통 표시 컴포넌트 |
| `components/domain` | 자료, 후보, 작업, 채팅처럼 기획 도메인이 드러나는 카드 컴포넌트 |
| `lib/api` | Spring Boot API 호출 공통 클라이언트 |
| `lib/query` | TanStack Query provider와 서버 상태 기본 설정 |
| `lib/tauri` | Tauri IPC 호출 래퍼 |
| `lib/websocket` | 채팅, 알림, 에이전트 job 이벤트 연결 |
| `lib/validators` | 폼과 API 응답 검증 |
| `lib/constants` | 화면과 기능에서 공유하는 상수 |
| `lib/hooks` | 공통 React hook |
| `types/api` | 서버 응답 DTO, 요청 DTO, 상태값 |
| `stores` | 클라이언트 상태 |
| `styles` | 전역 스타일과 디자인 토큰 |

## 설치된 주요 프론트 기술

| 구분 | 패키지 | 쓰는 위치 |
|---|---|---|
| 스타일 | `tailwindcss`, `@tailwindcss/postcss` | 전역 스타일, Bubli 디자인 토큰 |
| 컴포넌트 작업장 | `storybook`, `@storybook/nextjs-vite` | UI, 도메인 카드, 버블 상태를 단위별로 확인 |
| 컴포넌트 유틸 | `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` | `components/ui`, `components/icons`, `lib/utils` |
| 서버 상태 | `@tanstack/react-query` | `lib/query`, feature별 API 호출 |
| 클라이언트 상태 | `zustand` | `stores` |
| 폼/검증 | `react-hook-form`, `zod`, `@hookform/resolvers` | `lib/validators`, feature별 form |
| 긴 목록/테이블 | `@tanstack/react-table`, `@tanstack/react-virtual` | 자료보드, 채팅, WBS |
| 드래그 | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | WBS/칸반, 대시보드 카드, 버블 배치 |
| 모션 | `motion` | 버블, 패널 전환, 짧은 상태 모션 |
| 실시간/보이스 | `@stomp/stompjs`, `@livekit/components-react`, `livekit-client` | 채팅, 알림, 보이스챗 |
| Tauri 전용 | `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-notification` | 로컬 폴더, SQLite, 알림 |

## Tauri 구조

```text
src-tauri/src
├── commands
├── sqlite
├── folder_watch
├── backup
└── window
```

| 폴더 | 역할 |
|---|---|
| `commands` | 프론트에서 호출하는 Tauri IPC 명령 |
| `sqlite` | 프로젝트룸 채팅 캐시, 개인 에이전트 단기기억, 위젯 표시 캐시, 사용 이벤트, 동기화 대기열 |
| `folder_watch` | 사용자가 지정한 개인 관리 폴더 scan/watch |
| `backup` | 개인 SQLite 백업과 복구 |
| `window` | 버블 창, 고스트 모드, 상단 고정, 위치 저장 |

## HTTP API와 Tauri IPC 경계

| HTTP API로 처리 | Tauri IPC로 처리 |
|---|---|
| 프로젝트룸, 멤버, 친구 초대 | 로컬 폴더 선택 |
| 개인 자료와 프로젝트룸 자료 | 로컬 파일 scan/watch |
| TODO, WBS, 일정, 알림 | SQLite 캐시와 무결성 확인 |
| 채팅 원본 저장과 WebSocket 수신 | 프로젝트룸 채팅 캐시 재동기화 |
| 보이스챗 방 생성과 LiveKit 토큰 발급 | 개인 에이전트 원문 저장 |
| 위젯 설정, 항목 상태, 날짜별 집계 | 위젯 상세 사용 이벤트와 로컬 집계 |
| time_logs 원본과 heartbeat | local_timer_state, local_sync_outbox, 타이머 복구 |

Tauri SQLite는 서버 원본이 아니다. 빠른 표시, 비정상 종료 복구, 개인 원문 보관, 동기화 대기열을 맡는다. TODO, 일정, 채팅, 타이머처럼 웹에서도 다시 보여야 하는 값은 서버 DB를 원본으로 둔다.

## 구현 시작 순서

1. `/`, `/features`, `/download`, `/faq`, `/login`, `/signup`, `/app` 빈 화면을 먼저 만든다.
2. 회원 앱 레이아웃과 공개 사이트 레이아웃을 분리한다.
3. 디자인 v20 기준 공통 UI, 도메인 카드, 버블 컴포넌트를 Storybook에서 먼저 검수한다.
4. `src/lib/api`에 공통 응답 포맷과 인증 헤더 기준을 만든다.
5. 프로젝트룸, 자료보드, WBS/작업판, 대시보드 화면을 검수된 컴포넌트로 조립한다.
6. 채팅과 보이스챗은 웹 `/app/chat`에서 먼저 붙이고, Tauri 전용 창은 같은 연결을 재사용한다.
7. Tauri IPC는 화면 연결 뒤 `src/lib/tauri`와 `src-tauri/src`에서 붙인다.
8. 버블 위젯은 회원 웹 화면 복제가 아니라 개인 작업 인터페이스로 따로 구성한다.
