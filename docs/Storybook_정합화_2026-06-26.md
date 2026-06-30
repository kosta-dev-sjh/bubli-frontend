# Storybook 정합화 (2026-06-26)

자동 이식 러너 Phase 5 산출물. 흩어진 Storybook을 새 UI Kit 기준으로 분류하고, 정리·폐기 후보와 누락 variant를 정리한다. 기존 스토리는 삭제하지 않았다. 분류와 태그만 붙였다.

전체 스토리 파일: 168개.

## 1. 새 UI Kit 기준 (canonical, `tags: ["uikit", ...]`)

`src/components/**` 27개 파일에 `tags`를 달아 Storybook에서 새 UI Kit만 필터링할 수 있게 했다. 이 트리가 "단일 기준"이다.

| 그룹 | 태그 | 스토리 title |
|---|---|---|
| 프리미티브 | `uikit, primitive` | UI/Button, UI/Chip, UI/StatusBadge, UI/GlassPanel, UI/ProgressBar, UI/Ring |
| 버블 | `uikit, bubbles` | Bubbles/BubbleMark, Bubbles/BubbleOrb(+DockOrb), Bubbles/AgentBubble, Bubbles/DecorBubble, Bubbles/BubbleBar, Bubbles/BubbleCard(레거시) |
| 레이아웃 | `uikit, layout` | Layout/WorkspaceTopbar |
| 위젯 | `uikit, widget` | Widget/WidgetShell, Widget/WidgetPreview |
| 도메인 | `uikit, domain` | Domain/ResourceCard, Domain/SuggestionCard, Domain/WorkItemCard, Domain/ChatMessage, Domain/ResourceFlowView |
| 대시보드 | `uikit, dashboard` | Dashboard/Grid, Dashboard/WidgetTile, Dashboard/Palette, Dashboard/Dropzone, Dashboard/CustomizingFlow, Dashboard/View |
| 테마 | `uikit, theme` | Theme/ThemeProvider |

이번 자동 이식으로 새로 추가된 조립 스토리: Theme/ThemeProvider, Dashboard/View, Dashboard/CustomizingFlow, Widget/WidgetPreview, Domain/ResourceFlowView.

## 2. Features 스토리 (141개) — UI Kit 소비자

`Features/*`는 화면·기능 시나리오 스토리다. UI Kit을 가져다 쓰는 쪽이라 중복이 아니다. 삭제 대상이 아니라 "UI Kit 위에서 동작을 보여주는 레이어"로 남긴다.

| 영역 | 파일 수 | 성격 |
|---|---|---|
| Resources | 27 | 자료 대시보드·범위·분류·승인 시나리오 |
| Agent | 18 | 후보·승인·근거·작업 상태 |
| Settings | 17 | 테마·접근성·데이터 정리 |
| Widget | 16 | 위젯 4상태·투과·도크·폰트배율 |
| Communication | 14 | 소통·알림 도크 |
| ProjectRoom | 13 | 룸 초대·시드·위임 |
| ManagedFolder | 6 | 관리 폴더·용량·S3 핸드오프 |
| PublicSite | 4 | 공개 사이트 |
| Calendar | 4 | 일정·충돌 |
| Dashboard | 4 | 기존 대시보드 패널(아래 폐기 후보 참고) |
| Todo / Timer / WBS / Auth | 3+3+3+3 | 할 일·타이머·WBS·인증 |
| Memo / Notification | 2+2 | 메모·알림 |
| Download / Activity | 1+1 | 다운로드·활동 |

## 3. Deprecated / Dev-only 분류

지금 삭제하지 않는다(절대 금지: 기존 컴포넌트 삭제). 다음 단계에서 사람이 판단하도록 후보만 표시한다.

- 레거시 후보: `Bubbles/BubbleCard` — 새 `BubbleMark` + bubbles 세트로 역할이 대체됨. index 노출은 유지. 호환을 위해 남기되, 신규 화면은 BubbleMark/AgentBubble/DockOrb를 쓴다.
- 중복 가능 후보: `Features/Dashboard`의 기존 패널(`dashboard-overview-panel`, `dashboard-five-card-panel`, `dashboard-card-library-panel`, `daily-summary-panel`)은 새 `Dashboard/View` 조립과 목적이 겹친다. View가 정식 채택되면 일부는 dev-only로 내릴 수 있다.
- Dev-only 후보 없음: `src/components/examples`에는 스토리가 없다.

폐기 절차 제안: index에서 먼저 내리지 말고, 스토리 meta에 `tags: ["deprecated"]`를 달아 Storybook에서 숨김 처리 → 한 스프린트 관찰 → 참조 0 확인 후 제거.

## 4. 누락 variant 목록 (다음에 채울 것)

- UI/Button: `icon-only`(아이콘 단독) variant 없음. 위젯·도크에서 필요.
- UI/Chip: `removable`(x 달린 칩) variant 없음. 필터 칩에서 필요.
- Domain/ResourceCard: `Loading`(스켈레톤) 단독 스토리 없음. 현재는 ResourceFlowView 안에서만 확인.
- Widget/WidgetShell: `Translucent`와 `Ghost`의 다크 동시 비교 스토리 없음(개별만 있음).
- Dashboard/View: `편집 모드 진입 후` 화면은 CustomizingFlow에만 있음. View 자체의 edit 모드 스토리 분리 필요.
- Theme/ThemeProvider: `System`에서 OS가 다크일 때의 스냅샷 스토리는 환경 의존이라 수동 확인 필요.

## 5. 정리 원칙

1. 새 화면·컴포넌트는 `src/components/**`(uikit 태그)에서만 만든다.
2. `Features/*`는 UI Kit을 소비한다. 색·표면·상태를 직접 새로 만들지 않는다.
3. 폐기는 태그 → 관찰 → 제거 3단계로만 한다.
4. 모든 신규 스토리는 최소 Default·Empty·Dark를 포함한다. 상태가 있으면 Loading·Error도 추가한다.
