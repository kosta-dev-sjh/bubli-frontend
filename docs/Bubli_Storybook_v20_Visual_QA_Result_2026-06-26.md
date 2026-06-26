# Bubli Storybook v20 Visual QA Result

기준 문서: `Bubli_Storybook_v20_QA_2026-06-26.md`

점검 목적은 디자인 완성이 아니라, 최신 기획과 충돌하는 화면을 먼저 찾고 디자인보드 v20 polish로 넘길 항목을 분리하는 것이다.

## 1. 점검 환경

| 항목 | 값 |
|---|---|
| Storybook | `http://127.0.0.1:6006` |
| 캡처 방식 | Playwright screenshot |
| viewport | `1440 x 1000` |
| 캡처 위치 | `output/playwright/storybook-v20-qa/`, `output/playwright/storybook-v20-polish-followup/`, `output/playwright/storybook-v20-managed-folder/`, `output/playwright/storybook-v20-project-room/`, `output/playwright/storybook-v20-todo/`, `output/playwright/storybook-v20-agent/`, `output/playwright/storybook-v20-agent-schema/`, `output/playwright/storybook-v20-communication/` |

## 2. 대표 Story 점검 결과

| Story | 결과 | 판단 |
|---|---|---|
| `features-wbs-wbstodolinkagepanel--link-one-task-across-surfaces` | WBS 후보가 하나의 TODO로 확정되고 작업판, 대시보드, TODO 버블, 일정으로 연결되는 구조가 보인다. | 기획 방향 적합. `tasks`, `schedule` 같은 구현 용어는 사용자 문구로 낮췄다. |
| `features-widget-widgetdesktoppreview--default` | 위젯이 개인 영역이며 회원 웹 앱 위에 따로 뜨는 구조가 보인다. 서버 원본과 기기 안 기록 설명도 분리되어 있다. | 기획 방향 적합. 공통 버블 림과 투명 질감을 1차 보강했다. |
| `features-communication-tauricommunicationmodepanel--web-chat-tab` | 웹은 `/app/chat`, Tauri는 별도 창/버블로 같은 서버 연결을 쓴다는 구조가 보인다. 보이스 연결 정보도 클라이언트 생성처럼 보이지 않는다. | 헤더 칩이 가로로 늘어나는 표시 문제를 수정했다. |
| `features-resources-resourceboard--default` | 개인 자료와 프로젝트룸 자료, 후보, 확인 필요 항목이 한 화면에서 구분된다. | 기획 방향 적합. 구현 표현은 `관리 폴더에서 감지`처럼 사용자 문구로 낮췄다. |
| `features-agent-candidateapprovalpanel--default` | 에이전트 결과가 확정값이 아니라 후보로 보이고, 승인 후 반영 흐름이 분리되어 있다. | `agent_jobs`, `agent_suggestions`, API 서버 같은 구현 문구를 에이전트 정리와 서버 확인 기준으로 낮췄다. |
| `features-auth-authpanel--login` | 자체 계정 입력 없이 Google 기반 진입으로 보인다. | H1 줄바꿈과 token 표현을 즉시 수정했다. |
| `features-auth-authsessionsecuritypanel--default` | 웹과 데스크탑 앱의 로그인 세션을 기기별로 나눠 관리하는 구조가 보인다. | `access token`, `refresh token`, `cookie`, `secure storage`처럼 보이던 표현을 로그인 세션, 기기별 안전 저장, 세션 갱신 기준으로 낮췄다. |
| `features-publicsite-publichero--default` | 공개 사이트가 서비스 소개, 다운로드, 웹 로그인 진입에 집중한다. | 기획 방향 적합. |
| `features-managedfolder-managedfoldersyncpanel--default` | 개인 관리 폴더 변화 감지, 사용자 승인, 서버 반영 대기열 기준이 분리되어 보인다. | 기획 방향 적합. 모바일 제목 줄바꿈만 즉시 수정했다. |
| `features-projectroom-projectroominviteflow--default` | 프로젝트룸 초대가 친구 목록과 기존 회원 기준으로만 보이고, 수락 뒤 권한 생성 흐름이 분리되어 있다. | 기획 방향 적합. 게스트 초대나 이메일 초대처럼 보이는 흐름은 없다. |
| `features-todo-todoassigneereflectionpanel--default` | 프로젝트룸에서 생긴 하나의 TODO가 담당자 기준으로 대시보드, 버블, 일정에 함께 표시되는 구조가 보인다. | 기획 방향 적합. 사용자 화면의 `서버 원본 작업` 표현을 `하나로 관리되는 작업` 기준으로 낮췄다. |
| `features-agent-agentjobstatuspanel--running` | 에이전트 작업이 진행 상태로 보이고, WBS/TODO/확인 질문은 승인 전 후보로 분리되어 있다. | 기획 방향 적합. 모델명과 형식 버전처럼 보이는 문구를 사용자 기준 문구로 낮췄다. |
| `features-agent-agentschemavalidationpanel--passed-validation` | 에이전트 결과를 후보 형식, 질문 방식, 정리 작업 상태로 확인하는 구조가 보인다. | 기획 방향 적합. `/app`에 보이던 `schema_version`, `agent_jobs`, 모델명 같은 구현 문구를 사용자 기준 문구로 낮췄다. |
| `features-communication-voicetokensafetypanel--project-room-voice-token` | 프로젝트룸 보이스 참여가 서버 확인 권한, 멤버 권한, 녹음 제외 기준으로 분리되어 보인다. | 기획 방향 적합. `토큰`, `API 서버`, `LiveKit key`처럼 보이던 문구를 보이스 참여 권한 중심으로 낮췄다. |
| `features-communication-chat-sequence-loading-boundary-panel--default` | 웹은 서버 메시지를 읽고, Tauri 앱은 기기 안 최근 대화를 빠른 표시용으로 쓰는 구조가 보인다. | 기획 방향 적합. `chat_messages`, `local_room_message_cache`, `afterSequence` 같은 구현 문구를 사용자 기준 문구로 낮췄다. |
| `features-dashboard-dashboardoverviewpanel--default` | 대시보드가 프로젝트룸 하나의 현황판이 아니라 여러 프로젝트룸의 내 TODO, 일정, 확인 필요 항목, 버블을 모아 보는 개인 화면으로 보인다. | 기획 방향 적합. `서버 원본`, `로컬`처럼 보이던 데이터 설명을 확정된 기준 데이터와 기기 안 기록 기준으로 낮췄다. |
| `features-dashboard-dailysummarypanel--default` | 하루정리는 완료 TODO, 작업시간, 일정, 알림, 버블 집계, 개인 에이전트 요약을 근거로 만들고 사용자 확인 뒤 저장하는 흐름으로 보인다. | 기획 방향 적합. `API 계약 세부 DTO`, `LiveKit 토큰`처럼 개발자용 문구를 자료 업로드 응답 방식과 보이스 참여 정보로 낮췄다. |
| `features-widget-widgetstoragepolicypanel--default` | 버블 표시 데이터, 항목 상태, 상세 사용 기록, 날짜별 집계가 나뉘어 보인다. | 기획 방향 적합. `서버 원본`, `로컬`, `Tauri SQLite`처럼 보이던 표현을 기준 데이터와 기기 안 기록 기준으로 낮췄다. |
| `features-settings-taurisyncstatuspanel--default` | 앱이 빠른 표시, 복구 상태, 전송 대기열을 기기 안에 두고 서버 기록과 맞추는 구조가 보인다. | 기획 방향 적합. 테이블명과 동기화 키처럼 보이는 표현을 사용자가 이해할 수 있는 문구로 낮췄다. |
| `features-resources-resourceanalysiscachepanel--default` | 같은 파일인지 확인하고 기존 분석 결과를 재사용하거나 새 에이전트 정리 작업으로 넘기는 구조가 보인다. | 기획 방향 적합. `hash`, `agent job`, `resource_analysis`처럼 보이던 표현을 파일 지문, 에이전트 정리 작업, 분석 후보 기준으로 낮췄다. |
| `features-agent-personalagentmemorypanel--default` | 개인 에이전트 원문은 기기 안에 두고, 사용자가 확인한 하루정리만 저장하는 경계가 보인다. | 기획 방향 적합. `local_agent_messages`, `Tauri SQLite`, `서버 DB`처럼 보이던 표현을 개인 에이전트, 기기 안 보관, 확인 후 저장 기준으로 낮췄다. |

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

추가로 v20 polish follow-up에서 아래 항목을 반영했다.

| 항목 | 수정 |
|---|---|
| 공통 버블 질감 | `.bubli-surface`, `.bubli-bubble`의 림, 내부 하이라이트, 투명 글래스 그림자를 보강했다. |
| 구현 용어 노출 | Storybook 화면의 `tasks`, `schedules`, `time_logs`, `DRAFT`, `Tauri SQLite` 표현을 사용자 문구로 낮췄다. |
| Tauri 소통 패널 | 헤더 칩이 전체 폭으로 늘어나던 문제를 고치고, 캐시 표현을 기기 안 임시 보관으로 풀었다. |
| 한국어 줄바꿈 | 공개 히어로와 도메인 카드에서 한국어가 음절 단위로 끊기지 않도록 줄바꿈 기준을 조정했다. |
| 개인 관리 폴더 모바일 제목 | 동기화 패널의 긴 한국어 제목이 모바일에서 음절 단위로 끊기지 않도록 줄바꿈 기준과 모바일 제목 크기를 조정했다. |
| TODO 담당자 반영 문구 | 사용자 화면에 보이던 `서버 원본 작업` 표현을 `하나로 관리되는 작업`으로 낮췄다. |
| 에이전트 작업 상태 문구 | 사용자 화면에 보이던 모델명과 형식 버전 표현을 `질문 중심으로 정리 중`, `후보 형식 확인`으로 낮췄다. |
| 에이전트 결과 검증 문구 | `/app` 대시보드와 Storybook 예시에서 `schema_version`, `agent_jobs`, 모델명처럼 보이는 표현을 `후보 형식`, `정리 상태`, `정리 방식` 기준으로 낮췄다. |
| 보이스 연결 문구 | `/app/chat`에 남아 있던 `보이스 토큰`, `토큰 서버 발급` 표현을 `보이스 권한`, `참여 권한 서버 발급`으로 낮췄다. |
| 소통 경계 문구 | 보이스 권한, 채팅 읽음, 실시간 연결, 기기 안 임시 보관 관련 화면에서 DB 테이블명과 API 파라미터처럼 보이는 문구를 사용자 기준으로 낮췄다. |
| 대시보드/하루정리 문구 | 개인 대시보드, 하루정리, 자료보드, 설정, 데스크톱 버블 예시에서 `서버 원본`, `로컬`, `agent job`, `LiveKit 토큰`처럼 보이던 표현을 사용자 기준 문구로 낮췄다. |
| 위젯/기기 저장소 문구 | 위젯 설정, 위젯 저장 정책, 기기 복구, 동기화 대기열, 개인정보 동의 패널에서 `Tauri SQLite`, `idempotency_key`, 테이블명처럼 보이던 문구를 기기 안 저장소와 중복 방지 키 기준으로 낮췄다. |
| 자료/개인 에이전트 문구 | 자료 권한, 자료 분석 캐시, 하루정리 근거, 개인 에이전트 기억 패널과 실제 라우트 예시에서 `owner`, `room_members`, `resource_analysis`, `local_agent_messages`, `Tauri SQLite`, `서버 DB + S3`처럼 보이던 표현을 사용자 기준으로 낮췄다. |
| 타이머/기기 복구/초대 권한 문구 | 타이머 복구, 전송 대기열, 데이터 삭제, 접근 범위, 프로젝트룸 초대 패널에서 `time_logs`, `local_timer_state`, `local_sync_outbox`, `room_invites`, `room_members`처럼 보이던 표현을 사용자 기준으로 낮췄다. |
| 관리 폴더/자료 업로드 문구 | 관리 폴더 반영, 자료 업로드, 자료 검증, 다운로드, 저장소 정책 패널에서 `S3`, `resourceId`, `agent_jobs`, `checksum`, `visibility`처럼 보이던 표현을 사용자 기준으로 낮췄다. |
| 에이전트 후보/재시도 문구 | 후보 승인, 계약 문서 확인, 에이전트 재시도, 에이전트 사용량 패널에서 `agent_jobs`, `agent_suggestions`, 모델명, schema, 파일 해시처럼 보이던 표현을 에이전트 정리, 정리 기준, 후보 구조, 파일 지문 기준으로 낮췄다. |
| 인증/공개 화면 문구 | 인증 세션, 세션 갱신, 공개 FAQ, 다운로드 화면에서 `access token`, `refresh token`, `SQLite`, `WebView`, `로컬 캐시`처럼 보이던 표현을 로그인 세션, 기기 안 저장소, 빠른 표시, 데스크탑 앱 기준으로 낮췄다. |
| 공개/다운로드 하이브리드 앱 문구 | 공개 기능, 공개 히어로, 다운로드 handoff, 하이브리드 앱 구조 패널에서 `Tauri 앱`, `Tauri WebView`, `Tauri IPC`, `로컬 SQLite`처럼 보이던 표현을 데스크탑 앱, 회원 웹 앱, 기기 기능, 기기 안 저장 기준으로 낮췄다. |
| 소통/실시간 연결 문구 | 소통 페이지, 데스크탑 소통 창, 채팅 순서, 보이스, 실시간 연결 패널에서 `Tauri`, `API 서버`, `서버 DB`, `클라이언트`처럼 보이던 표현을 데스크탑 앱, 서버 연결, 서버 기록, 앱이나 브라우저 기준으로 낮췄다. |
| 설정/기기 권한/위젯 문구 | 사용자 설정, 개인정보 동의, 언어, 테마, 폰트, 관리 폴더, 버블 도크/창/가독성 패널에서 `Tauri`, `Tauri WebView`, `로컬`, `user_preferences`, `font_scale`처럼 보이던 표현을 데스크탑 앱, 기기 권한, 내 설정, 글자 크기 기준으로 낮췄다. |
| 최신 결정 충돌 후보 문구 | 설정, WBS, 다운로드, 인증 화면에서 `project_room`, `프로젝트 관리`, 에이전트 직접 호출, 이메일/비밀번호 방어형 문구처럼 보이던 표현을 프로젝트룸 단위, 작업 구조, 같은 서버 흐름, Google 로그인 기준으로 낮췄다. |
| 설정 화면 정보 밀도 | `/app/settings`에 섞여 있던 API 계약 상태, API 변경 대응, API 오류 처리 패널은 개발 점검용 Storybook에 남기고 실제 설정 라우트에서는 제외했다. 사용자 설정 화면은 알림, 권한, 기기 안 저장, 백업, 삭제 요청 중심으로 둔다. |
| 대시보드 화면 정보 밀도 | `/app`에 섞여 있던 에이전트 이벤트 타임라인, 재시도 정책, 후보 형식 검증, 사용량 guard, 모델 호출 로그, 개인 에이전트 원문 경계 패널은 Storybook 점검용으로 남기고 실제 대시보드에서는 제외했다. 대시보드는 내 TODO, 일정, 하루정리, 에이전트 후보 확인 중심으로 둔다. |
| 자료보드 화면 정보 밀도 | `/app/resources`에 섞여 있던 업로드 대기열, 업로드 검증 경계, 분석 캐시, 처리 상태, 다운로드 권한, 저장소 정책, 삭제 복구 패널은 Storybook 점검용으로 남기고 실제 자료보드에서는 제외했다. 자료보드는 자료 찾기, 업로드, 문서 분류, 분석 후보 승인, 확인 항목, 버전, 댓글, 공유 중심으로 둔다. |
| 프로젝트룸 화면 정보 밀도 | `/app/project-rooms`에 섞여 있던 초대 응답, 멤버 역할 정책, 프로젝트 리더 위임, 보관/삭제 정책, 이벤트 타임라인 패널은 Storybook 점검용으로 남기고 실제 프로젝트룸 라우트에서는 제외했다. 프로젝트룸 화면은 방 선택, 생성, 문서 후보, 추출값 확인, 프로젝트 참고 정보, 친구 초대 권한 중심으로 둔다. |
| 웹 소통 화면 정보 밀도 | `/app/chat`에 섞여 있던 채팅 순서, 앱 캐시 복구, 보이스 권한 발급, 데스크탑 소통 모드 패널은 Storybook과 데스크탑 전용 라우트 점검용으로 남기고 실제 웹 소통 라우트에서는 제외했다. 웹 소통 화면은 친구, 1:1 채팅, 프로젝트룸 채팅, 프로젝트룸 보이스, 읽음 상태, 연결 상태 중심으로 둔다. |
| 데스크탑 버블 화면 정보 밀도 | `/app/desktop/widgets`에 섞여 있던 버블 저장 정책, 사용 집계, 항목 상태, 밀도, 투명도, 글자 크기, 배경 가독성, 모션 정책 패널은 Storybook 점검용으로 남기고 실제 데스크탑 버블 라우트에서는 제외했다. 데스크탑 버블 화면은 버블 미리보기, 데스크탑 레이어, 버블 설정, 자료 제안, 최소화 도크 중심으로 둔다. |
| 로그인/다운로드 화면 문구 | `/login`에 섞여 있던 세션 보안과 갱신 정책 패널은 Storybook 점검용으로 남기고 실제 로그인 라우트에서는 제외했다. 로그인 카드는 Google 로그인과 Bubli ID 설정 중심으로 두고, 다운로드 패널의 `비회원 분리` 라벨은 `공개 화면`으로 바꿨다. |

## 4. 디자인보드 v20 polish로 넘길 항목

| 묶음 | 해야 할 일 |
|---|---|
| 공통 문구 | 대표 Story의 구현 용어는 1차 정리했다. 이후 새 화면 추가 시 같은 기준으로 점검한다. |
| 버블 질감 | 비눗방울 림과 내부 하이라이트를 1차 보강했다. 실제 앱 화면 조립 후 밀도와 대비를 다시 본다. |
| 카드 밀도 | 기능 패널이 많아 정보가 무거워질 수 있다. 대표 화면별 카드 간격과 설명 길이를 줄인다. |
| 공개/인증 화면 | 히어로와 로그인 화면의 큰 제목 줄바꿈은 1차 확인했다. 이후 실제 페이지 조립 후 재확인한다. |
| 자료보드 | 기능 구조는 좋지만, 구현 저장소 설명은 사용자 행동 중심 문구로 바꾼다. |
| 프로젝트룸 초대 | 데스크톱에서 친구 초대 카드 주변 여백이 넓다. 실제 프로젝트룸 상세 화면에 조립할 때 카드 밀도를 다시 맞춘다. |
| 정책 설명 패널 | 일부 설정, 자료, 위젯 하위 패널에는 아직 개발 경계 설명이 많이 남아 있다. 실제 라우트 조립 때 사용자 행동 중심 문구와 개발 문서용 패널을 분리한다. |
| API 계약 패널 | API 계약 상태 패널은 일부러 구현 용어를 담고 있다. 실제 사용자 설정 화면에 남길지, 개발자 점검용 Story로만 둘지 별도 분류한다. |
| 에이전트 사용량 점검 | 사용량 guard, 모델 호출 로그처럼 운영자가 보는 패널은 사용자 화면에 섞지 않고 개발 점검용 Story로 분리한다. |

## 5. 검증 기준

- Storybook build가 통과해야 한다.
- 인증 화면에는 자체 계정 입력 가입/로그인처럼 보이는 UI가 없어야 한다.
- 에이전트 화면은 후보 생성과 승인 대기 상태를 유지해야 한다.
- 위젯은 프로젝트룸 화면 복제가 아니라 개인 작업 인터페이스로 보여야 한다.
- Tauri 소통 화면은 웹 `/app/chat`과 같은 API/LiveKit 연결을 재사용한다는 기준을 유지해야 한다.
