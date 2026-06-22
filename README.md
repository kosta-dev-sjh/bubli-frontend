# Bubli Frontend

> 받은 자료를, 오늘의 할 일로. - Web + Desktop Frontend

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?style=flat&logo=tauri&logoColor=white)](https://tauri.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5-003B57?style=flat&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)

---

## 소개

**Bubli**는 프리랜서가 클라이언트에게 받은 계약서, 견적서, 요구사항 문서, 회의록을 프로젝트룸에 모으면, 에이전트가 작업 범위, 납품물, 마감, 확인 질문, WBS/TODO 후보로 정리해주는 문서 기반 업무 보조 서비스입니다.

이 레포는 Bubli의 **공개 사이트, 회원 웹 앱, Tauri 데스크탑 앱 화면**을 함께 관리합니다. 공개 사이트는 서비스 소개와 다운로드 진입을 맡고, 회원 웹 앱은 `/app` 아래에서 실제 업무 화면을 제공합니다. Tauri 앱은 회원 웹 앱을 WebView로 열고, 앱에서만 가능한 버블 위젯, 로컬 파일 연동, SQLite 캐시, 백그라운드 동기화를 더합니다.

## 주요 기능

- **버블 위젯**: 작업 중 화면 전환 없이 오늘 업무, 일정, 타이머, 자료 제안을 데스크탑 위에 버블로 표시
- **개인 관리 폴더 동기화**: 사용자가 지정한 로컬 폴더의 파일 추가, 수정, 삭제, 이동을 감지하고 SQLite에 색인. 전체 PC 자동 색인은 하지 않음
- **로컬 채팅 캐시**: 프로젝트룸 채팅을 SQLite에 캐시해 빠른 진입 지원. 서버 DB(`room_sequence`) 기준 재동기화
- **개인 에이전트 단기기억**: 개인 에이전트 원문 대화는 서버에 저장하지 않고 로컬 SQLite에만 보관. 최근 100개 기준
- **로컬 백업/복구**: 개인 SQLite 데이터를 암호화 압축 백업. 손상 시 최신 백업으로 복구
- **파일 드래그앤드롭과 활동 감지**: 앱에서만 지원되는 네이티브 기능

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 웹 프레임워크 | Next.js 16, TypeScript | 공개 사이트와 회원 웹 앱 공용, Tauri에서도 회원 화면 재사용 |
| UI/스타일 | Tailwind CSS v4, shadcn/ui 방식, lucide-react | Bubli 디자인 토큰과 글래스/버블 CSS 직접 구현 |
| 상태 관리 | TanStack Query, Zustand | 서버 상태 캐시와 UI 상태 분리 |
| 성능 | TanStack Virtual, TanStack Table, dnd kit, Motion | 긴 목록, WBS/칸반, 버블 모션 대응 |
| 데스크탑 셸 | Tauri 2 (Rust) | WebView로 회원 웹 앱 표시, 앱 전용 로컬 기능 연결 |
| 로컬 저장소 | SQLite, FTS5 | 파일 색인, 채팅 캐시, 에이전트 단기기억, 백업 manifest |
| 실시간 | WebSocket(STOMP), LiveKit Client SDK | 채팅, 보이스챗 |
| 외부 연동 | Google Calendar 연동 화면 | 서버 API를 통해 읽기 전용 일정 표시 |

## 데스크탑 앱 구조

```text
Bubli 데스크탑 앱
├─ Tauri WebView: Next.js 회원 웹 앱 /app
├─ 개인 위젯과 버블
├─ 개인 관리 폴더 스캔
├─ 프로젝트룸 채팅 캐시 (SQLite)
├─ 개인 에이전트 로컬 단기기억 (SQLite)
├─ 개인 SQLite 백업과 복구
├─ 파일 드래그앤드롭
└─ 활성 앱 / 창 제목 감지
```

웹과 앱은 **같은 API와 같은 회원 화면**을 사용합니다. 공개 사이트는 비회원용 소개/다운로드 페이지로 분리되어 있고, 로그인이 필요한 회원 웹 앱만 Tauri에서 엽니다. 개발 중에는 Tauri가 로컬 Next.js 개발 서버의 `/app`을 열고, 배포 앱은 HTTPS로 배포된 회원 웹 앱의 `/app`을 여는 기준으로 맞춥니다. Tauri 메인 화면에서 소통 탭을 숨기는 경우에도 채팅과 보이스챗은 별도 앱 창 또는 버블에서 같은 API, WebSocket, LiveKit 연결을 사용합니다.

## 시작하기

```bash
# 클론
git clone https://github.com/kosta-dev-sjh/bubli-frontend.git
cd bubli-frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env에 백엔드 API URL 등 입력
# API key/secret은 클라이언트에 노출 금지

# 회원 웹 앱만 실행
npm run dev

# Tauri 데스크탑 앱 실행
# Tauri dev는 beforeDevCommand로 Next 개발 서버를 함께 띄움
npm run tauri:dev
```

웹 화면만 작업할 때는 `npm run dev`로 충분합니다. 데스크탑 위젯, 로컬 폴더, SQLite, Tauri 전용 소통 창처럼 앱 기능을 확인할 때는 `npm run tauri:dev`를 사용합니다. 백엔드는 별도 레포에서 Spring Boot 서버를 실행해야 하며, 프론트는 `.env`의 `NEXT_PUBLIC_API_BASE_URL`로 해당 서버를 바라봅니다. LiveKit key와 secret은 클라이언트에 두지 않고, 보이스챗 입장에 필요한 token은 API 서버에서 받아 사용합니다.

## 프로젝트 구조

```text
src/
├── app/              # Next.js App Router
│   ├── (public)/     # 공개 사이트: /, /features, /download, /faq
│   ├── (auth)/       # 인증: /login, /signup
│   └── (workspace)/  # 회원 앱: /app, /app/projects, /app/resources, /app/chat
├── components/       # 공통 UI, 레이아웃, 아이콘, 버블 표시 컴포넌트
├── features/         # 도메인별 기능 코드
├── lib/              # API 클라이언트, Tauri IPC, WebSocket, 공통 유틸
├── stores/           # 클라이언트 상태 관리
├── styles/           # 전역 스타일과 디자인 토큰
├── types/            # 공통 타입
└── config/           # 앱 설정과 환경별 상수

src-tauri/
├── src/              # Rust 네이티브 코드
│   ├── commands/     # Tauri IPC 명령
│   ├── sqlite/       # 로컬 SQLite, 캐시, 백업 manifest
│   ├── folder_watch/ # 개인 관리 폴더 스캔과 변경 감지
│   ├── backup/       # 로컬 SQLite 백업/복구
│   └── window/       # 버블 창, 고스트 모드, 상단 고정 등 창 제어
├── capabilities/     # Tauri 권한 설정
└── icons/            # 앱 아이콘
```

자세한 폴더 기준은 [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)를 참고합니다.
프론트 개발 기준은 [docs/Bubli_프론트엔드_개발_가이드_2026-06-22.md](./docs/Bubli_프론트엔드_개발_가이드_2026-06-22.md)를 참고합니다.

## 협업 규칙

브랜치 전략, 커밋 컨벤션, PR 규칙은 [GIT_CONVENTION.md](./GIT_CONVENTION.md)를 참고합니다.

## 팀

KOSTA AI Java DevOps 파이널 프로젝트 - **프로젝트 해 매일**
