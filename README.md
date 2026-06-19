# 🫧 Bubli Frontend

> 받은 자료를, 오늘의 할 일로. — Desktop App

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?style=flat&logo=tauri&logoColor=white)](https://tauri.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5-003B57?style=flat&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)

---

## 📌 소개

**Bubli**는 프리랜서가 클라이언트에게 받은 계약서, 견적서, 요구사항 문서, 회의록을 프로젝트룸에 모으면, 에이전트가 작업 범위·납품물·마감·확인 질문·WBS/TODO 후보로 정리해주는 문서 기반 업무 보조 서비스입니다.

이 레포는 Bubli의 **데스크탑 클라이언트**입니다. 로그인 후 사용하는 회원 웹 앱(Next.js)을 Tauri WebView로 감싸서, 브라우저와 동일한 화면·API를 쓰면서 앱에서만 가능한 개인 위젯, 로컬 파일 연동, 백그라운드 동기화를 더합니다.

## ✨ 주요 기능

- **버블 위젯** — 작업 중 화면 전환 없이 오늘 업무, 일정, 타이머, 자료 제안을 데스크탑 위에 버블로 표시
- **개인 관리 폴더 동기화** — 사용자가 지정한 로컬 폴더의 파일 추가/수정/삭제/이동을 감지하고 SQLite에 색인 (전체 PC 자동 색인 없음)
- **로컬 채팅 캐시** — 프로젝트룸 채팅을 SQLite에 캐시해 빠른 진입 지원, 서버 DB(`room_sequence`) 기준 재동기화
- **개인 에이전트 단기기억** — 개인 에이전트 원문 대화는 서버에 저장하지 않고 로컬 SQLite에만 보관 (최근 100개 기준)
- **로컬 백업/복구** — 개인 SQLite 데이터를 암호화 압축 백업, 손상 시 최신 백업으로 복구
- **파일 드래그앤드롭 & 활동 감지** — 앱에서만 지원되는 네이티브 기능

## 🛠 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 웹 프레임워크 | Next.js 16, TypeScript | 공개 사이트/회원 웹 앱 공용, Tauri에서도 동일 화면 재사용 |
| 데스크탑 셸 | Tauri 2 (Rust) | WebView로 Next.js 회원 웹 앱 표시 |
| 로컬 저장소 | SQLite, FTS5 | 파일 색인, 채팅 캐시, 에이전트 단기기억, 백업 manifest |
| 실시간 | WebSocket(STOMP), LiveKit Client SDK | 채팅, 보이스챗 |
| 외부 연동 | Google Calendar MCP | 읽기 전용 일정 연동 |

## 🏗 데스크탑 앱 구조

```
Bubli 데스크탑 앱
├─ Tauri WebView: Next.js 회원 웹 앱 (대시보드, 프로젝트룸, 자료보드, WBS, 소통, 설정)
├─ 개인 위젯과 버블
├─ 개인 관리 폴더 스캔
├─ 프로젝트룸 채팅 캐시 (SQLite)
├─ 개인 에이전트 로컬 단기기억 (SQLite)
├─ 개인 SQLite 백업과 복구
├─ 파일 드래그앤드롭
└─ 활성 앱 / 창 제목 감지
```

웹과 앱은 **같은 API와 같은 회원 화면**을 사용합니다. 공개 사이트는 비회원용 소개/다운로드 페이지로 별도 분리되어 있고, 로그인이 필요한 회원 웹 앱만 Tauri로 감쌉니다.

## 🚀 시작하기

```bash
# 클론
git clone https://github.com/kosta-dev-sjh/bubli-frontend.git
cd bubli-frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env에 백엔드 API URL, LiveKit 등 입력 (API key/secret은 클라이언트에 노출 금지)

# 개발 모드 실행 (Tauri 데스크탑 앱)
npm run tauri dev
```

## 📁 프로젝트 구조

```
src/
├── app/            # Next.js App Router 페이지/레이아웃
├── components/      # 공통 UI 컴포넌트
├── widget/          # 버블 위젯 (Tauri 전용)
├── chat/            # 채팅 UI, WebSocket 연동
├── voice/           # LiveKit 연동
└── api/             # 백엔드 API 클라이언트

src-tauri/
├── src/             # Rust 네이티브 코드 (IPC: select_folder, scan_folder, watch_folder 등)
└── ...              # 폴더 스캔, SQLite 연동, 백업/복구 IPC
```

## 🌿 협업 규칙

브랜치 전략, 커밋 컨벤션, PR 규칙은 [GIT_CONVENTION.md](./GIT_CONVENTION.md) 참고

## 👥 팀

KOSTA AI Java DevOps 파이널 프로젝트 — **프로젝트 해 매일**
