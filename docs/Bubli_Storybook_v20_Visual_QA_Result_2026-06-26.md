# Bubli Storybook v20 Visual QA Result

기준 문서: `Bubli_Storybook_v20_QA_2026-06-26.md`

점검 목적은 디자인 완성이 아니라, 최신 기획과 충돌하는 화면을 먼저 찾고 디자인보드 v20 polish로 넘길 항목을 분리하는 것이다.

## 1. 점검 환경

| 항목 | 값 |
|---|---|
| Storybook | `http://127.0.0.1:6006` |
| 캡처 방식 | Playwright screenshot |
| viewport | `1440 x 1000` |
| 캡처 위치 | `output/playwright/storybook-v20-qa/` |

## 2. 대표 Story 점검 결과

| Story | 결과 | 판단 |
|---|---|---|
| `features-wbs-wbstodolinkagepanel--link-one-task-across-surfaces` | WBS 후보가 하나의 TODO로 확정되고 작업판, 대시보드, TODO 버블, 일정으로 연결되는 구조가 보인다. | 기획 방향 적합. 다만 `tasks`, `schedule` 같은 구현 용어는 polish 때 사용자 문구로 바꾼다. |
| `features-widget-widgetdesktoppreview--default` | 위젯이 개인 영역이며 회원 웹 앱 위에 따로 뜨는 구조가 보인다. 서버 원본과 기기 안 기록 설명도 분리되어 있다. | 기획 방향 적합. v20의 비눗방울 림과 투명 질감은 더 살릴 필요가 있다. |
| `features-communication-tauricommunicationmodepanel--web-chat-tab` | 웹은 `/app/chat`, Tauri는 별도 창/버블로 같은 서버 연결을 쓴다는 구조가 보인다. 보이스 연결 정보도 클라이언트 생성처럼 보이지 않는다. | 즉시 수정 필요 없음. |
| `features-resources-resourceboard--default` | 개인 자료와 프로젝트룸 자료, 후보, 확인 필요 항목이 한 화면에서 구분된다. | 기획 방향 적합. `Tauri SQLite 색인` 같은 구현 표현은 사용자 문구로 낮춘다. |
| `features-agent-candidateapprovalpanel--default` | 에이전트 결과가 확정값이 아니라 후보로 보이고, 승인 후 반영 흐름이 분리되어 있다. | 즉시 수정 필요 없음. |
| `features-auth-authpanel--login` | 자체 계정 입력 없이 Google 기반 진입으로 보인다. | H1 줄바꿈과 token 표현을 즉시 수정했다. |
| `features-publicsite-publichero--default` | 공개 사이트가 서비스 소개, 다운로드, 웹 로그인 진입에 집중한다. | 기획 방향 적합. |

## 3. 즉시 수정한 항목

`AuthPanel`의 로그인 문구를 정리했다.

| 이전 | 수정 |
|---|---|
| `다시 Bubli로 들어가기` | `Bubli로 돌아가기` |
| `구글 OAuth로 로그인` | `구글 계정으로 로그인` |
| `LiveKit 토큰은 서버에서 발급` | `보이스 권한은 서버에서 확인` |
| `서버 token 발급` | `서버에서 세션 발급` |
| `refresh token 안전 저장` | `기기별 안전 저장` |

이 수정은 인증 구조 변경이 아니라, 사용자에게 보이는 문구와 긴 제목 줄바꿈을 정리한 것이다.

## 4. 디자인보드 v20 polish로 넘길 항목

| 묶음 | 해야 할 일 |
|---|---|
| 공통 문구 | 사용자 화면에서 `tasks`, `schedule`, `Tauri SQLite` 같은 구현 용어를 줄인다. |
| 버블 질감 | 현재 글래스 카드 느낌이 강하다. 비눗방울 림, 좌상단 빛 호, 작은 내부 하이라이트를 더한다. |
| 카드 밀도 | 기능 패널이 많아 정보가 무거워질 수 있다. 대표 화면별 카드 간격과 설명 길이를 줄인다. |
| 공개/인증 화면 | 히어로와 로그인 화면의 큰 제목 줄바꿈을 viewport별로 다시 확인한다. |
| 자료보드 | 기능 구조는 좋지만, 구현 저장소 설명은 사용자 행동 중심 문구로 바꾼다. |

## 5. 검증 기준

- Storybook build가 통과해야 한다.
- 인증 화면에는 자체 계정 입력 가입/로그인처럼 보이는 UI가 없어야 한다.
- 에이전트 화면은 후보 생성과 승인 대기 상태를 유지해야 한다.
- 위젯은 프로젝트룸 화면 복제가 아니라 개인 작업 인터페이스로 보여야 한다.
- Tauri 소통 화면은 웹 `/app/chat`과 같은 API/LiveKit 연결을 재사용한다는 기준을 유지해야 한다.
