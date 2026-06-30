# Bubli UI Kit 자동 이식 결과보고 (2026-06-26)

자동 이식 러너로 Phase 1부터 6까지 단계별 검증을 통과하며 진행한 결과다. 각 단계는 타입체크, 금지색 검사, Brand/Interaction Bible 점검, Storybook variant 생성, 수정 파일 보고를 모두 통과한 뒤 다음 단계로 넘어갔다. 라우트 구조, 화면 파일 대규모 재작성, props/API/Tauri 경계, 기존 컴포넌트 삭제는 한 번도 건드리지 않았다.

## 1. 완료 Phase

| Phase | 내용 | 결과 |
|---|---|---|
| 1 | ThemeProvider / Dark Mode 정식 연결 | 통과 |
| 2 | Dashboard 화면 조립 1차 | 통과 |
| 3 | Widget Preview 화면 조립 | 통과 |
| 4 | Resource / Agent / Work 화면 1차 | 통과 |
| 5 | Storybook 정합화 | 통과 |
| 6 | 최종 결과보고 문서 | 이 문서 |

전 단계 타입체크 `tsc --noEmit` exit 0, 금지색(청록/민트/aqua/teal, `#2E8E8A·#8FD8D3·#56B3AB·#5FC9D6`) 0건 유지.

## 2. 수정 파일 목록

기존 파일 수정(additive):

- `src/app/providers.tsx` — ThemeProvider 래핑 1줄 연결(라우트·화면 아님)
- `src/styles/globals.css` — `.bubli-seg`(테마 토글), `.bubli-dash-view*`, `.bubli-widget-stage*` / `.bubli-widget-notif*`, `.bubli-flow*` 블록 추가
- `src/components/ui/index.ts`, `src/components/domain/index.ts`, `src/components/widget/index.ts`, `src/components/bubbles/index.ts`, `src/components/dashboard/index.ts` — export 추가
- `src/components/**/*.stories.tsx` 27개 — `tags` 추가(정합화)
- 이전 단계 누적: `button.tsx`, `chip.tsx`, `status-badge.tsx`, `glass-panel.tsx`, `progress-bar.tsx` — optional prop·상태 modifier 추가

## 3. 새 컴포넌트 목록

이번 자동 이식 단계에서 추가:

- 테마: `src/components/theme/theme-provider.tsx`(ThemeProvider, useTheme), `theme-toggle.tsx`(ThemeToggle), `index.ts`
- 대시보드 조립: `src/components/dashboard/dashboard-view.tsx`(DashboardView + MOCK_DASHBOARD)
- 위젯 프리뷰: `src/components/widget/widget-preview.tsx`(WidgetPreview)
- 흐름 조립: `src/components/domain/resource-flow-view.tsx`(ResourceFlowView + MOCK_FLOW)

직전까지 누적된 UI Kit(같은 세션 이전 단계): UI 프리미티브(Button/Chip/StatusBadge/GlassPanel/ProgressBar/Ring), bubbles(BubbleMark/BubbleOrb/DockOrb/AgentBubble/DecorBubble/BubbleBar), WidgetShell, 도메인 카드(Resource/Suggestion/WorkItem/Chat), 대시보드(Grid/WidgetTile/Palette/Dropzone).

## 4. Storybook에서 확인 가능한 항목

- Theme/ThemeProvider: Light, Dark, System, ToggleOnly
- Dashboard/View: Default, Loading, Empty, Dark
- Dashboard/Grid·WidgetTile·Palette·Dropzone·CustomizingFlow: 상태·다크 포함
- Widget/WidgetPreview: Default, Translucent, Ghost, Minimal, Notification, Dark
- Widget/WidgetShell: Default~AllStates
- Domain/ResourceFlowView: Default, Loading, Empty, Error, Dark
- Domain 카드 4종, UI 프리미티브 6종, Bubbles 6종 각 상태·다크

`tags: ["uikit", ...]`로 새 UI Kit만 필터링 가능. 분류 상세는 `docs/Storybook_정합화_2026-06-26.md` 참고.

## 5. 남은 위반 / 누락

- 위반: 없음. 금지색 0, 색 채움 버튼·카드·위젯 0, 이모지 0.
- 누락 variant(정합화 문서 4장): Button icon-only, Chip removable, ResourceCard Loading 단독, WidgetShell Translucent/Ghost 다크 비교, DashboardView edit 모드 단독.
- 폐기 후보(미삭제, 표시만): Bubbles/BubbleCard, Features/Dashboard 기존 패널 일부.

## 6. API 연결 전 해야 할 일

지금은 전부 목 데이터다. 실제 연결 전에:

1. 테마: `user_preferences.theme`를 `GET/PUT`로 연결. 현재 localStorage(`bubli-theme`) 키를 서버 값과 동기화하는 어댑터 한 겹 필요.
2. 대시보드: `dashboard_layouts` API. 저장 형태는 `{ user_id, widget_id, x, y, w, h, hidden, order, config_json }`. 현재 CustomizingFlow의 `ids 배열 + hidden Set + size`가 `order/widget_id/hidden/w·h`로 1:1 매핑된다.
3. 자료·후보·할 일: 업로드 → 에이전트 job → 후보 → 승인 → 할 일 생성까지의 실제 엔드포인트. 현재 `MOCK_FLOW`가 데이터 계약의 형태 제안서 역할을 한다.
4. 로딩·에러: 각 View가 이미 `loading`·`error`·`empty` prop을 받는다. TanStack Query 상태를 그대로 이 prop에 연결하면 된다.

## 7. Tauri 연결 전 해야 할 일

WidgetPreview는 화면 시뮬레이션이다. 실제 데스크탑 위젯 전에:

1. 위젯 모드(default/translucent/ghost/minimal) 전환을 Tauri 창 속성(투명도·always-on-top·click-through)에 연결.
2. 알림 버블을 별도 작은 창 또는 오버레이로 띄우는 IPC.
3. 최소화 → BubbleBar, 펼치기 → WidgetShell 전환을 트레이/단축키 이벤트와 연결.
4. ghost 모드의 click-through 실제 구현(현재는 시각 표현만).

## 8. 다음 개발 순서 (제안)

1. DashboardView·ResourceFlowView를 실제 라우트에 정식 채택할지 별도 승인 단계로 결정(라우트 변경은 자동 진행에서 제외했음).
2. 테마 → `user_preferences` 연결(가장 작고 위험 낮음).
3. 대시보드 `dashboard_layouts` 읽기 전용 연결 → 저장 연결 순서.
4. 자료 흐름 API 연결(업로드 → job → 후보).
5. Tauri 위젯 창 속성 연결.
6. 정합화 문서의 누락 variant 채우기, 폐기 후보 태그 처리.
