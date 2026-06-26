# Bubli Storybook v20 Component Triage

기준 문서: `Bubli_최종기획_완성본_v15_DB회의반영_2026-06-24.md`, `10_API-Design_v15_DB회의반영_2026-06-24.md`, 디자인보드 v20

이 문서는 1차로 뽑힌 컴포넌트를 모두 최종 화면으로 보지 않기 위한 분류표다. 지금 단계의 목적은 AtoZ의 P0 기준대로 부품 인벤토리를 확정하고, 누락된 화면 골격을 먼저 채우는 것이다. 디자인보드 v20 전면개편은 P0/P1 뒤에 진행한다.

현재 상태는 `Bubli_프론트엔드_개발계획_AtoZ_2026-06-26.md` 기준으로 **1차 컴포넌트 추출 P0 완료**다. 아래 진행도는 전체 제품 완료율이 아니라, Storybook과 라우트에 드러난 작업량을 기준으로 잡은 관리용 추정치다.

## 1. 현재 Storybook 규모

| 구분 | 개수 | 판단 |
|---|---:|---|
| 전체 Story | 149개 | 1차 점검판 기준으로 많다. 최종 화면 수가 아니라 기능 후보와 경계 검증용 story까지 포함한다. |
| `src/features` Story | 141개 | 기획 기능, API 경계, Tauri 경계, 예외 상태를 보여주는 story다. |
| `src/components` Story | 8개 | 공통 UI, 도메인 카드, 버블, 레이아웃 기준 story다. |
| 실제 page route | 15개 | 공개 사이트, 로그인, 회원 앱, 데스크탑 전용 화면, 일정 화면, 전역 제안함까지 있다. |
| feature component | 141개 | v15 핵심 기능은 1차 화면 조각으로 대부분 뽑혔다. |
| component inventory | 149행 | AtoZ 누락 5종까지 실제 컴포넌트로 분류했다. |
| 미완료 | 0개 | P0 기준 누락 컴포넌트는 닫혔다. |

feature별 분포는 아래처럼 본다.

| feature | Story 수 | 1차 판단 |
|---|---:|---|
| `resources` | 27 | 자료 업로드, 분류, 비교, 권한, 버전, 복구가 섞여 있다. 최종 화면에서는 자료보드 중심으로 합칠 후보가 많다. |
| `agent` | 17 | job, 후보, 질문, 하루정리, 메모리 경계가 섞여 있다. API 계약 확정 전까지 경계 검증용으로 유지한다. |
| `settings` | 17 | 설정 화면 본체보다 보안, 접근성, 동기화, 로컬 복구 정책 story가 많다. 최종 설정 화면으로 묶을 후보가 많다. |
| `widget` | 16 | 버블 표시, 저장 정책, 접근성, 창 제어가 섞여 있다. 디자인보드 v20 polish 때 가장 많이 합쳐야 한다. |
| `communication` | 14 | 친구, 채팅, 보이스, 읽음, 캐시, Tauri 소통 경계가 있다. 웹 `/app/chat`과 Tauri 별도 창/버블 기준 검증용으로 유지한다. |
| `project-room` | 13 | 생성, 초대, 멤버, 프로젝트 리더, 자료 시드가 있다. 프로젝트룸 용어와 권한 검증에 필요하다. |
| `managed-folder` | 6 | Tauri 전용 로컬 폴더 기능 경계 검증용이다. 최종 화면은 설정/자료보드와 연결한다. |
| 그 외 | 39 | 공개 사이트, 인증, 대시보드, TODO, WBS, 타이머, 일정, 알림, 메모, 활동 감지다. 핵심 화면에 직접 연결되는 story 위주다. |

## 2. 분류 기준

| 분류 | 의미 | 처리 기준 |
|---|---|---|
| 유지 | 최신 기획의 핵심 흐름을 직접 보여준다. | Storybook 대표 점검 대상에 남기고 디자인보드 v20 기준으로 polish한다. |
| 병합 후보 | 같은 화면 안에 들어갈 보조 상태나 정책 설명이다. | 지금은 삭제하지 않고, 실제 화면 조립 시 상위 패널로 합친다. |
| 삭제 검토 | 같은 내용을 더 좋은 story가 이미 보여주거나, 구현 내부 설명이 과하다. | 1차 통합 이후 실제 라우트 화면에서 쓰이지 않으면 제거한다. |
| API 계약 대기 | 백엔드 DTO, WebSocket payload, LiveKit token, agent job 이벤트가 확정돼야 한다. | 화면 구조만 유지하고 데이터 타입과 호출부는 확정 후 교체한다. |
| Tauri 경계 검증 | 웹으로는 안 되고 Tauri IPC, SQLite, 로컬 파일, 창 제어와 관련된다. | 웹 화면과 섞지 않고 `src/lib/tauri`, `src-tauri`, desktop route 기준으로 검증한다. |

## 3. 바로 유지할 대표 Story

| 묶음 | Story | 이유 |
|---|---|---|
| 공개 진입 | `features-publicsite-publichero--default` | 공개 사이트는 서비스 소개와 다운로드 진입을 맡는다. |
| 인증 | `features-auth-authpanel--login` | Google OAuth 기준 진입을 보여준다. 자체 이메일/비밀번호 화면처럼 보이면 안 된다. |
| 자료보드 | `features-resources-resourceboard--default` | 개인 자료와 프로젝트룸 자료의 권한 구분을 보여준다. |
| 프로젝트룸 | `features-projectroom-projectroomcreateflowpanel--default` | 계약/요구사항 자료에서 프로젝트룸을 시작하는 흐름을 보여준다. |
| WBS/TODO | `features-wbs-wbstodolinkagepanel--link-one-task-across-surfaces` | 하나의 TODO가 작업판, 대시보드, 버블, 일정으로 이어지는 핵심 구조다. |
| 에이전트 | `features-agent-candidateapprovalpanel--default` | 에이전트가 확정자가 아니라 후보 생성자라는 원칙을 보여준다. |
| 소통 | `features-communication-tauricommunicationmodepanel--web-chat-tab` | 웹은 `/app/chat`, Tauri는 별도 창/버블로 같은 연결을 쓰는 기준을 보여준다. |
| 위젯 | `features-widget-widgetdesktoppreview--default` | 버블이 프로젝트룸 복제 화면이 아니라 개인 작업 인터페이스임을 보여준다. |
| 타이머 | `features-timer-timerrecoveryboundarypanel--running` | 서버 `time_logs`와 Tauri 복구 상태의 책임 경계를 보여준다. |
| 개인 관리 폴더 | `features-managedfolder-managedfoldersyncpanel--default` | 로컬 감지, 사용자 승인, 서버 반영 대기열을 보여준다. |

## 3.1 대표 Story 렌더 스모크 점검

2026-06-26 기준으로 아래 대표 story 15개는 Storybook iframe URL 응답이 모두 200으로 확인됐다. 이 점검은 화면 픽셀 품질 검수가 아니라, 대표 story가 Storybook index에 존재하고 렌더 진입점이 깨지지 않는지 확인하는 스모크 테스트다.

반복 점검은 Storybook 서버를 켠 뒤 아래 명령으로 실행한다.

```bash
npm run storybook
npm run check:storybook
```

PR에서는 `npm run build-storybook`이 CI에 포함된다. 대표 story 스모크 점검은 빠르게 보는 용도이고, 전체 Storybook 빌드는 story 파일 전체가 번들 단계에서 깨지지 않는지 확인하는 기준이다.

| 묶음 | Story | 결과 |
|---|---|---|
| 공개 진입 | `features-publicsite-publichero--default` | 통과 |
| 인증 | `features-auth-authpanel--login` | 통과 |
| 자료보드 | `features-resources-resourceboard--default` | 통과 |
| 프로젝트룸 | `features-projectroom-projectroomcreateflowpanel--default` | 통과 |
| WBS/TODO | `features-wbs-wbstodolinkagepanel--link-one-task-across-surfaces` | 통과 |
| 에이전트 | `features-agent-candidateapprovalpanel--default` | 통과 |
| 소통 | `features-communication-tauricommunicationmodepanel--web-chat-tab` | 통과 |
| 위젯 | `features-widget-widgetdesktoppreview--default` | 통과 |
| 타이머 | `features-timer-timerrecoveryboundarypanel--running` | 통과 |
| 개인 관리 폴더 | `features-managedfolder-managedfoldersyncpanel--default` | 통과 |
| 대시보드 5카드 | `features-dashboard-dashboardfivecardpanel--ready` | 통과 |
| WBS 4보기 | `features-wbs-wbsfourviewtogglepanel--tree` | 통과 |
| 위젯 8종 | `features-widget-widgeteightbubblesetpanel--ready` | 통과 |
| 에이전트 제안함 | `features-agent-agentsuggestioninboxpanel--ready` | 통과 |
| 일정 | `features-calendar-calendarpagepanel--ready` | 통과 |

## 3.2 주요 라우트 노출 스모크 점검

2026-06-26 기준으로 아래 주요 라우트 15개는 Next dev 서버에서 모두 200 응답으로 확인됐다. 작업판 라우트는 인터랙티브 패널의 클라이언트 경계가 빠져 500이 발생했으나, `WbsTodoLinkagePanel`, `TodoDetailPanel`, `AgentSuggestionInboxPanel`에 클라이언트 경계를 명시해 복구했다.

반복 점검은 Next dev 서버를 켠 뒤 아래 명령으로 실행한다. Next와 Storybook을 모두 켠 상태에서는 `npm run check:smoke`로 라우트와 대표 Story를 한 번에 확인한다.

```bash
npm run dev
npm run check:routes
npm run check:smoke
```

| 영역 | 라우트 | 결과 |
|---|---|---|
| 공개 홈 | `/` | 통과 |
| 기능 소개 | `/features` | 통과 |
| 다운로드 | `/download` | 통과 |
| FAQ | `/faq` | 통과 |
| 로그인 | `/login` | 통과 |
| 회원 앱 홈 | `/app` | 통과 |
| 프로젝트룸 | `/app/project-rooms` | 통과 |
| 자료보드 | `/app/resources` | 통과 |
| WBS/작업판 | `/app/project-rooms/demo-room/work` | 통과 |
| 소통 | `/app/chat` | 통과 |
| 일정 | `/app/calendar` | 통과 |
| 에이전트 제안함 | `/app/agent-suggestions` | 통과 |
| 설정 | `/app/settings` | 통과 |
| 데스크탑 소통 | `/app/desktop/communication` | 통과 |
| 데스크탑 버블 | `/app/desktop/widgets` | 통과 |

## 3.3 v15 제품 규칙 점검

v15에서 삭제된 흐름이 프론트에 다시 들어오지 않도록 `npm run check:product-rules`를 CI에 포함한다. 이 검사는 실제 `src` 코드와 route 구조를 기준으로 아래 항목을 막는다.

- `/signup` 화면과 로컬 회원가입 문구
- `/app/projects`처럼 프로젝트와 프로젝트룸을 다시 나누는 라우트
- 게스트 참여, 비회원 임시 참여, 이메일 초대 흐름
- 프론트나 Tauri가 agent 서버를 직접 호출하는 환경 변수

## 3.4 디자인 토큰 점검

디자인보드 v20 정합화 전까지 새 색상이 임의로 늘어나지 않도록 `npm run check:design-tokens`를 CI에 포함한다. 이 검사는 `src`와 `.storybook` 안에서 직접 쓰인 hex color가 Bubli 토큰 allowlist 안에 있는지 확인하고, `src/styles/globals.css`와 `.storybook/preview.ts` 밖에서 직접 hex color를 쓰지 못하게 막는다.

현재 목적은 디자인 완성도가 아니라 색상 기준을 잠그는 것이다. 이후 디자인보드 v20 전면개편에서는 `src/styles/globals.css`의 토큰 자체를 조정하고, 필요한 경우 allowlist도 함께 수정한다.

## 3.5 Tauri 경계 점검

Tauri 전용 기능이 일반 웹 화면에 직접 섞이지 않도록 `npm run check:tauri-boundaries`를 CI에 포함한다. 이 검사는 `src` 안에서 `@tauri-apps/*` import, Tauri 전역 체크, `invoke` 호출, 임의 `localStorage` 사용이 생겼는지 확인한다.

허용 기준은 아래처럼 둔다.

- Tauri package import는 `src/lib/tauri/` 안에서만 한다.
- Tauri 런타임 확인은 `src/lib/tauri/is-tauri.ts`만 담당한다.
- Tauri IPC 호출은 `src/lib/tauri/ipc.ts`의 `invokeTauri`를 통해서만 한다.
- 브라우저 `localStorage`에 임의로 상태를 저장하지 않는다. 서버 원본, Tauri SQLite, 동기화 대기열 정책 중 하나를 따른다.

이 검사는 실제 Tauri 앱 실행 검증을 대체하지 않는다. 목적은 웹/앱 경계가 코드 구조에서 무너지지 않게 막는 것이다.

## 4. 병합 후보

| 묶음 | 후보 | 병합 방향 |
|---|---|---|
| 자료 업로드 | `resource-upload-decision`, `resource-upload-decision-panel`, `resource-upload-analysis-panel`, `resource-upload-validation-boundary-panel`, `resource-upload-queue-panel` | 실제 자료 업로드 화면에서는 단계형 플로우 또는 탭으로 합친다. |
| 자료 권한 | `resource-download-access-panel`, `resource-access-download-panel`, `personal-resource-share-boundary-panel`, `resource-share-approval-panel`, `resource-sharing-permission-panel` | 자료보드 상세 패널의 권한/공유 섹션으로 합친다. |
| 위젯 세부 정책 | `widget-storage-policy-panel`, `widget-item-state-panel`, `widget-usage-rollup-panel`, `widget-background-readability-panel` | 설정 화면과 버블 미리보기 안으로 나눈다. |
| 설정 정책 | `api-contract-status-panel`, `api-contract-adapter-boundary-panel`, `api-error-handling-boundary-panel`, `privacy-consent-panel`, `data-deletion-request-panel` | 개발자 설명용 패널은 줄이고, 설정 화면에는 사용자 행동 중심으로 남긴다. |
| 소통 경계 | `chat-sequence-loading-boundary-panel`, `chat-cache-recovery-panel`, `realtime-connection-status-panel`, `voice-token-safety-panel` | 채팅/보이스 연결 상태와 복구 안내를 소통 화면 안으로 합친다. |
| 관리 폴더 | `managed-folder-policy-panel`, `managed-folder-change-review`, `managed-folder-s3-handoff-panel`, `storage-sync-policy-panel` | 설정의 개인 관리 폴더 탭과 자료보드 반영 흐름으로 합친다. |

## 5. 삭제 검토 후보

아래 항목은 지금 바로 삭제하지 않는다. 1차 통합 화면에서 실제로 쓰이지 않거나 더 좋은 story가 같은 의미를 담으면 삭제한다.

| 후보 | 검토 이유 | 삭제 조건 |
|---|---|---|
| `features-publicsite/components/font-strategy-panel`와 `features-settings/components/font-strategy-panel` | 같은 폰트 전략을 다른 위치에서 설명할 가능성이 있다. | 디자인 토큰 문서나 설정 패널 중 한 곳에서 충분히 설명되면 하나만 남긴다. |
| `features-publicsite/components/hybrid-app-frame`와 `features-widget/components/hybrid-app-frame` | 하이브리드 앱 설명이 중복될 수 있다. | Tauri WebView 구조 설명을 한 story에서 충분히 보여주면 하나로 합친다. |
| `resource-download-access-panel`와 `resource-access-download-panel` | 이름과 역할이 비슷하다. | 한쪽이 다운로드 권한, 한쪽이 접근 권한으로 분리되지 않으면 합치거나 제거한다. |
| `resource-upload-decision`와 `resource-upload-decision-panel` | 업로드 결정 화면이 중복될 수 있다. | 실제 업로드 플로우에서 하나만 쓰이면 나머지는 제거한다. |
| `agent-model-call-log-panel` | 사용자 화면보다 에이전트 운영/추적 설명에 가깝다. | 실제 대시보드에서 필요한 정보가 아니면 개발 가이드나 운영 점검 story로 내리고, 사용자 화면에는 후보 상태와 승인 흐름만 남긴다. |
| 과도한 boundary/policy 패널 | 사용자 화면보다 개발 경계 설명에 가까울 수 있다. | 개발 가이드 문서로 충분하고 화면에서 쓰이지 않으면 Storybook에서 제거한다. |

## 6. API 계약 확정 후 손볼 Story

| 영역 | 기다리는 값 | 대상 |
|---|---|---|
| 인증 | 토큰 저장 방식, refresh 응답, 내 정보 조회 응답 | `auth`, `settings/user-preferences` |
| 채팅 | WebSocket payload, `client_message_id`, 읽음 상태 응답 | `communication` |
| 보이스 | LiveKit token 응답, 실패 코드 | `communication/voice` |
| 에이전트 | `agent_jobs`, 이벤트 payload, suggestion schema | `agent`, `resources`, `project-room` |
| 파일 업로드 | multipart 또는 presigned URL 확정, 진행률 응답 | `resources` |
| 위젯 | 표시 데이터 summary 응답, 항목 상태 응답, rollup 응답 | `widget` |
| 타이머 | heartbeat 응답, 복구 상태 응답, idempotency 처리 | `timer` |
| Tauri IPC | command 이름, payload, 실패 응답 | `managed-folder`, `activity`, `settings`, `widget` |

## 7. 현재 추정 진행도

아래 숫자는 작업 완료 선언이 아니다. 다음 작업의 우선순위를 정하기 위한 내부 관리 기준이다.

| 작업 | 진행도 | 근거 |
|---|---:|---|
| 1차 컴포넌트 추출 | 100% | Storybook story 149개와 feature component 141개가 있고, AtoZ 기준 누락 5종을 모두 실제 컴포넌트로 추가했다. |
| 라우트 연결 | 약 98% | 주요 라우트 15개가 Next dev 서버에서 모두 200 응답으로 확인됐다. 남은 점검은 실제 클릭, 모바일 폭, 상호작용 확인이다. |
| Storybook 대표 점검 | 약 83% | 대표 story 15개 iframe 응답과 Storybook index 존재를 자동 스모크 명령으로 반복 확인할 수 있고, PR CI에서 전체 Storybook 빌드까지 확인한다. 아직 픽셀, 모바일, 상호작용, 접근성 점검은 남아 있다. |
| 디자인보드 v20 정합화 | 약 52% | 공통 버블 질감과 일부 문구는 보정했고, 모듈 CSS의 직접 hex color를 토큰 변수로 옮겼다. 새 hex color가 토큰 파일 밖에서 늘어나지 않도록 디자인 토큰 검사를 CI에 넣었다. 디자인 전면 개편은 P2에서 클로드 작업 결과와 함께 크게 반영한다. |
| API 계약 반영 | 약 20% | API client 위치와 일부 타입은 있으나, 확정 DTO와 payload가 오면 교체해야 한다. |
| Tauri 경계 검증 | 약 45% | Tauri IPC wrapper와 관리 폴더/위젯/소통 경계 story는 있고, 소통 창/버블, 기기 안 저장소, 타이머 복구, 전송 대기열, 관리 폴더 반영 흐름, 공개/다운로드 하이브리드 앱, 소통/실시간 연결, 설정/기기 권한/위젯, 데스크탑 버블 라우트의 실제 화면과 정책 점검 분리, 에이전트 요청의 서버 경유 문구를 1차 보정했다. `@tauri-apps/*`, `invoke`, Tauri 전역 체크, 임의 `localStorage` 사용을 CI에서 막는 경계 검사도 추가했다. 실제 앱 연결 검증은 더 필요하다. |
| v15 충돌 방지 자동화 | 약 60% | `/signup`, `/app/projects`, 게스트/이메일 초대, agent 직접 호출 env는 CI에서 막는다. 아직 모든 문구와 API payload를 의미 단위로 검증하는 단계는 아니다. |

## 8. 다음 작업 순서

1. P1 전 화면 노출 점검으로 넘어간다.
2. 대표 story의 모바일 폭, hover/click, 접근성 상태를 추가로 확인한다.
3. 사용자 화면에 점검용 패널이 과하게 섞인 곳은 route 조립만 정리한다.
4. 점검용 패널은 삭제하지 않고 Storybook에 남긴다.
5. 디자인보드 v20/클로드 전면 개편은 P2에서 한 번에 반영한다.
