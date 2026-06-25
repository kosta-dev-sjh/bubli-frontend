# Bubli Storybook v20 QA

이 문서는 1차 컴포넌트 연결 이후 Storybook에서 무엇을 먼저 볼지 정리한 점검표다.
기준은 `Bubli_최종기획_완성본_v15_DB회의반영_2026-06-24.md`, `10_API-Design_v15_DB회의반영_2026-06-24.md`, 디자인보드 v20이다.

## 1. 실행 방법

```bash
npm run storybook
```

브라우저에서 `http://localhost:6006`을 연다.

정적 빌드 확인은 아래 명령으로 한다.

```bash
npm run build-storybook
```

현재 기준으로 Storybook story는 253개이며, root 그룹은 아래처럼 정리한다.

| 그룹 | 역할 |
|---|---|
| `UI` | 버튼, 상태 배지 같은 기본 UI |
| `Domain` | 자료, 작업, 후보, 채팅 메시지 카드 |
| `Bubbles` | 버블 공통 카드 |
| `Layout` | 회원 웹 앱과 Tauri 소통 화면 상단 구조 |
| `Features/*` | 실제 기획 기능 단위 컴포넌트 |

## 2. 1차 점검 원칙

Storybook은 디자인 완성본이 아니라 1차 점검판이다.
이번 단계에서는 기능 누락, 기획 충돌, 데이터 책임 경계를 먼저 본다.

바로 수정할 것:

- 비회원 임시 참여 기능처럼 보이는 흐름
- 자체 계정 입력 가입/로그인처럼 보이는 흐름
- 프로젝트와 프로젝트룸을 별도 제품처럼 나누는 흐름
- 프론트 또는 Tauri가 에이전트 서버를 직접 호출하는 흐름
- 버블을 프로젝트룸 화면의 축소판처럼 설명하는 흐름

다음 단계에서 한 번에 맞출 것:

- 색
- 여백
- 글래스 질감
- 버블 형태
- 카드 밀도
- 세부 모션

## 3. 대표 Story 점검 순서

| 순서 | Story ID | 확인 기준 |
|---:|---|---|
| 1 | `ui-button--variants` | 버튼 상태가 Bubli 토큰을 쓰고, CTA와 보조 버튼이 과하게 튀지 않는지 본다. |
| 2 | `ui-statusbadge--planning-states` | 후보, 확인 필요, 완료, 보류 상태가 기획 용어와 맞는지 본다. |
| 3 | `domain-resourcecard--resource-scopes` | 개인 자료와 프로젝트룸 자료가 권한 기준으로 구분되는지 본다. |
| 4 | `domain-suggestioncard--agent-candidates` | 에이전트 결과가 확정값이 아니라 후보로 보이는지 본다. |
| 5 | `bubbles-bubblecard--widget-set` | 버블이 개인 작업 단위처럼 보이고, 프로젝트룸 화면 복제처럼 보이지 않는지 본다. |
| 6 | `layout-workspacetopbar--member-web-app` | 회원 웹 앱의 기본 진입 구조가 `/app` 기준과 맞는지 본다. |
| 7 | `layout-workspacetopbar--tauri-communication-surface` | Tauri에서 소통을 별도 창/버블로 다루는 방향과 맞는지 본다. |
| 8 | `features-publicsite-publichero--default` | 공개 사이트가 서비스 소개와 다운로드 진입에 집중하는지 본다. |
| 9 | `features-auth-authpanel--login` | Google OAuth 기준 흐름으로 보이는지 본다. |
| 10 | `features-download-desktopdownloadhandoffpanel--default` | 웹과 Tauri 앱의 역할 구분이 명확한지 본다. |
| 11 | `features-projectroom-projectroominviteflow--default` | 친구 기반 초대와 프로젝트룸 권한 흐름이 맞는지 본다. |
| 12 | `features-projectroom-projectroomswitcherpanel--default` | 프로젝트룸 선택이 공용/개인 이분법으로 보이지 않는지 본다. |
| 13 | `features-resources-resourceboard--default` | 자료보드가 개인 자료와 프로젝트룸 자료를 같은 화면에서 다루되 권한을 분리하는지 본다. |
| 14 | `features-resources-documentmismatchreviewpanel--default` | 문서 차이를 법률 판단이 아니라 확인 필요 항목으로 보여주는지 본다. |
| 15 | `features-wbs-wbstodolinkagepanel--link-one-task-across-surfaces` | 하나의 TODO가 작업판, 대시보드, 위젯, 캘린더로 연결되는 구조가 보이는지 본다. |
| 16 | `features-todo-todoassigneereflectionpanel--default` | 프로젝트룸 TODO가 담당자 기준으로 개인 대시보드와 버블에 반영되는지 본다. |
| 17 | `features-agent-agentjobstatuspanel--running` | `agent_jobs` 기반 진행 상태가 보이고, 즉시 확정 처리처럼 보이지 않는지 본다. |
| 18 | `features-agent-candidateapprovalpanel--default` | 사용자 승인 전 후보와 승인 후 반영이 구분되는지 본다. |
| 19 | `features-communication-communicationpanel--default` | 친구, 1:1 채팅, 프로젝트룸 채팅 흐름이 섞이지 않는지 본다. |
| 20 | `features-communication-tauricommunicationmodepanel--web-chat-tab` | 웹은 `/app/chat`, Tauri는 별도 소통 창/버블로 같은 API와 LiveKit 연결을 쓰는지 본다. |
| 21 | `features-widget-widgetdesktoppreview--default` | 위젯이 개인 작업 인터페이스로 보이는지 본다. |
| 22 | `features-widget-widgetstoragepolicypanel--daily-rollup` | 위젯 상세 이벤트 원문은 로컬, 항목 상태와 집계는 서버라는 기준이 보이는지 본다. |
| 23 | `features-timer-timerrecoveryboundarypanel--running` | `time_logs`, heartbeat, Tauri 복구 상태가 섞이지 않는지 본다. |
| 24 | `features-managedfolder-managedfoldersyncpanel--default` | 로컬 폴더 지정, 변경 감지, 서버 반영 경계가 맞는지 본다. |

Storybook 주소에서 특정 story를 바로 보려면 아래처럼 연다.

```text
http://localhost:6006/?path=/story/features-widget-widgetdesktoppreview--default
```

## 4. 디자인보드 v20 정합화 때 볼 것

1차 점검이 끝나면 아래 항목을 별도 polish 작업에서 한 번에 맞춘다.

| 항목 | 기준 |
|---|---|
| 배경 | `#F7F9FA` 중심의 밝은 화면 |
| 버블 | 투명한 비눗방울, 얇은 유리 림, 좌상단 하이라이트 |
| 패널 | 유리 질감은 쓰되 카드 중첩을 줄이고 정보 밀도를 맞춤 |
| 색 | 워터블루, 오팔, pearl, dust rose 토큰 우선 |
| 폰트 | Pretendard 기준, 작은 패널 안에서는 과한 hero 크기 금지 |
| 모션 | 버블 등장, 접기, 상태 변화 정도로 제한 |
| 긴 목록 | 자료보드, 채팅, WBS는 가상화 전제를 유지 |

## 5. 완료 기준

- Storybook build가 통과한다.
- Story root가 `UI`, `Domain`, `Bubbles`, `Layout`, `Features` 중심으로 정리되어 있다.
- 대표 story에서 최신 기획과 충돌하는 흐름이 없다.
- 디자인 세부 수정을 시작하기 전에 기획 충돌 수정 이슈를 먼저 분리한다.
- API 계약 확정 전까지 story의 예시는 실제 서버 원본처럼 단정하지 않는다.
