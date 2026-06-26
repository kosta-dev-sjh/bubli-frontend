# Bubli Storybook v20 Component Triage

기준 문서: `Bubli_최종기획_완성본_v15_DB회의반영_2026-06-24.md`, `10_API-Design_v15_DB회의반영_2026-06-24.md`, 디자인보드 v20

이 문서는 1차로 뽑히는 중인 컴포넌트를 모두 최종 화면으로 보지 않기 위한 분류표다. 지금 단계의 목적은 컴포넌트를 예쁘게 완성하는 것이 아니라, 최신 기획과 충돌하지 않는 화면 조각을 Storybook에서 확인하고 나중에 합치거나 버릴 수 있는 상태로 두는 것이다.

현재 상태를 "1차 컴포넌트 완료"로 보지 않는다. 정확한 표현은 "1차 컴포넌트 추출 진행 중"이다. 아래 진행도는 완료율이 아니라, 현재 Storybook과 라우트에 드러난 작업량을 기준으로 잡은 관리용 추정치다.

## 1. 현재 Storybook 규모

| 구분 | 개수 | 판단 |
|---|---:|---|
| 전체 Story | 144개 | 1차 점검판 기준으로 많다. 최종 화면 수가 아니라 기능 후보와 경계 검증용 story까지 포함한다. |
| `src/features` Story | 136개 | 기획 기능, API 경계, Tauri 경계, 예외 상태를 보여주는 story다. |
| `src/components` Story | 8개 | 공통 UI, 도메인 카드, 버블, 레이아웃 기준 story다. |

feature별 분포는 아래처럼 본다.

| feature | Story 수 | 1차 판단 |
|---|---:|---|
| `resources` | 27 | 자료 업로드, 분류, 비교, 권한, 버전, 복구가 섞여 있다. 최종 화면에서는 자료보드 중심으로 합칠 후보가 많다. |
| `agent` | 17 | job, 후보, 질문, 하루정리, 메모리 경계가 섞여 있다. API 계약 확정 전까지 경계 검증용으로 유지한다. |
| `settings` | 17 | 설정 화면 본체보다 보안, 접근성, 동기화, 로컬 복구 정책 story가 많다. 최종 설정 화면으로 묶을 후보가 많다. |
| `widget` | 15 | 버블 표시, 저장 정책, 접근성, 창 제어가 섞여 있다. 디자인보드 v20 polish 때 가장 많이 합쳐야 한다. |
| `communication` | 14 | 친구, 채팅, 보이스, 읽음, 캐시, Tauri 소통 경계가 있다. 웹 `/app/chat`과 Tauri 별도 창/버블 기준 검증용으로 유지한다. |
| `project-room` | 13 | 생성, 초대, 멤버, 프로젝트 리더, 자료 시드가 있다. 프로젝트룸 용어와 권한 검증에 필요하다. |
| `managed-folder` | 6 | Tauri 전용 로컬 폴더 기능 경계 검증용이다. 최종 화면은 설정/자료보드와 연결한다. |
| 그 외 | 37 | 공개 사이트, 인증, 대시보드, TODO, WBS, 타이머, 일정, 알림, 메모, 활동 감지다. 핵심 화면에 직접 연결되는 story 위주다. |

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
| 1차 컴포넌트 추출 | 약 80% | Storybook 기준 144개 story가 있고, 핵심 feature는 대부분 story가 있다. 다만 세부 상태, 중복 정리, 실제 라우트 배치는 남아 있다. |
| 라우트 연결 | 약 90% | 공개 사이트, 로그인, `/app`, 프로젝트룸, 자료보드, 작업 화면, 채팅, 설정, Tauri desktop route가 존재한다. 세부 화면 연결과 실제 데이터 상태는 별도 작업이다. |
| Storybook 대표 점검 | 약 62% | 대표 story 24개 기준 중 일부는 캡처와 문서 점검이 끝났고, 에이전트 결과 검증, 소통 경계 문구, 대시보드/하루정리 문구, 위젯/기기 저장소 문구, 자료/개인 에이전트 문구, 타이머/기기 복구/초대 권한 문구, 관리 폴더/자료 업로드 문구, 에이전트 후보/재시도 문구, 인증 세션/공개 FAQ 문구, 공개/다운로드 하이브리드 앱 문구, 소통/실시간 연결 사용자 문구까지 추가 보정했다. 남은 story는 계속 순차 점검해야 한다. |
| 디자인보드 v20 정합화 | 약 37% | 공통 버블 질감, 일부 한국어 줄바꿈, Tauri 소통 패널, 대시보드/하루정리, 위젯/설정, 자료/개인 에이전트, 타이머/기기 복구/초대 권한, 관리 폴더/자료 업로드, 에이전트 후보/재시도, 인증 세션/공개 FAQ, 공개/다운로드 하이브리드 앱, 소통/실시간 연결 사용자 문구는 보정됐지만 전체 화면 밀도와 질감은 아직 2차 polish가 필요하다. |
| API 계약 반영 | 약 20% | API client 위치와 일부 타입은 있으나, 확정 DTO와 payload가 오면 교체해야 한다. |
| Tauri 경계 검증 | 약 40% | Tauri IPC wrapper와 관리 폴더/위젯/소통 경계 story는 있고, 소통 창/버블, 기기 안 저장소, 타이머 복구, 전송 대기열, 관리 폴더 반영 흐름, 공개/다운로드 하이브리드 앱, 소통/실시간 연결의 책임 경계 문구를 1차 보정했다. 실제 앱 연결 검증은 더 필요하다. |

## 8. 다음 작업 순서

1. 대표 Story 24개를 계속 Storybook에서 확인한다.
2. 최신 기획과 충돌하는 문구나 흐름은 즉시 고친다.
3. 중복이 의심되는 story는 이 문서의 병합 후보나 삭제 검토 후보에 먼저 넣는다.
4. API 계약이 확정되면 화면을 크게 고치기 전에 feature API/client 타입을 먼저 맞춘다.
5. 1차 통합이 안정되면 `feature/design-board-v20-polish` 성격의 작업에서 카드 밀도, 버블 질감, 색, 여백을 한 번에 정리한다.
