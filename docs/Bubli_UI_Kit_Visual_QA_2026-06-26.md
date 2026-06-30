# Bubli UI Kit Visual QA (2026-06-26)

라우트에 붙이기 전에, 새 UI Kit canonical 스토리와 조립 뷰의 실제 렌더 품질을 점검한 결과다. 타입체크가 아니라 시각 품질이 목표다. 이번 단계에서는 라우트·API·Tauri·WebSocket을 건드리지 않았다.

## 1. 점검 대상

UI Kit: UI/Button, UI/Chip, UI/StatusBadge, UI/GlassPanel, UI/ProgressBar, UI/Ring
Bubbles: Bubbles/BubbleMark, Bubbles/BubbleOrb, Bubbles/AgentBubble, Bubbles/BubbleBar
Widget: Widget/WidgetShell AllStates, Widget/WidgetPreview(Default·Ghost·Minimal·Dark)
Dashboard: Dashboard/View(Default·Empty), Dashboard/CustomizingFlow, Dashboard/Grid Edit, Dashboard/Palette
Domain: Domain/ResourceFlowView(Default·Empty·Dark), Domain/ResourceCard, Domain/SuggestionCard, Domain/WorkItemCard

## 2. Storybook 실행 방법

스크린샷 자동화는 이번 환경에서 불가능했다(아래 3장). 사람이 직접 보는 절차는 다음과 같다.

1. 터미널에서 프로젝트 폴더로 이동: `cd 04_개발_작업공간/repos/bubli-frontend`
2. 의존성 설치(최초 1회): `npm install`
3. Storybook 실행: `npm run storybook` → 브라우저가 `http://localhost:6006` 로 열린다.
4. 좌측 사이드바에서 위 1장 항목을 찾는다. 새 UI Kit만 보려면 상단 검색에 태그 `uikit`를 입력하거나, 트리에서 `UI / Bubbles / Widget / Dashboard / Domain / Theme` 그룹을 본다.
5. Light/Dark 비교: 각 스토리에 `Dark` variant가 따로 있다. 조립 뷰(View·WidgetPreview·ResourceFlowView)의 Dark 스토리는 미리보기 박스 안에서만 `data-theme="dark"`를 적용하므로, Storybook 전역 테마와 무관하게 바로 비교된다.
6. reduced-motion 확인: OS 설정에서 "동작 줄이기"를 켜고 Bubbles/AgentBubble, Widget/WidgetPreview Notification을 다시 본다. 애니메이션이 멈춰야 정상이다.

정적 빌드로 보고 싶으면: `npm run build-storybook` 후 `storybook-static/index.html`을 브라우저로 연다.

## 3. 스크린샷 저장 여부

자동 캡처: 하지 않았다(못 했다). 이유는 샌드박스에 headless 브라우저 엔진이 없다. playwright·playwright-core·@storybook/test-runner 미설치, 시스템 chromium·chrome 부재. 브라우저 없이 Storybook(React)을 픽셀로 렌더할 방법이 없다.

대신: 위 2장의 수동 확인 절차를 문서화했고, `docs/visual-qa/` 폴더를 만들어 두었다. 사람이 Storybook에서 아래 파일명으로 직접 저장하면 핸드오프에 그대로 쓸 수 있다.

- `dashboard-view-light.png` — Dashboard/View Default
- `dashboard-view-dark.png` — Dashboard/View Dark
- `widget-preview-all-states.png` — Widget/WidgetPreview Default·Translucent·Ghost·Minimal 한 화면
- `widget-preview-dark.png` — Widget/WidgetPreview Dark
- `resource-flow-light.png` — Domain/ResourceFlowView Default
- `resource-flow-dark.png` — Domain/ResourceFlowView Dark
- `ui-kit-overview.png` — UI 프리미티브 6종 + Bubbles 4종

이번 QA는 픽셀 스냅샷 대신, 실제 구현 코드(globals.css 토큰·클래스, 컴포넌트 JSX)를 기준값과 대조하는 정적 검증으로 수행했다. 즉 "이 클래스가 이런 색·블러·투과·모션을 실제로 갖는다"를 코드에서 확인했다. 최종 눈 검증 1회는 사람이 Storybook에서 해주는 것을 전제로 한다.

## 4. 시각 QA 표

| # | 항목 | 통과/실패 | 근거 / 문제 | 수정 필요 | 우선순위 |
|---|---|---|---|---|---|
| 1 | Sky Opal 하늘빛 계열 | 통과 | `--sky #9ED8FF`, `--bubble-blue #6FB8F2`, `--blue-ink #3A78B8`, `--mist #F2F7FC`, 배경 `--bg #FCFDFF` | 아니오 | - |
| 2 | 청록/민트 재출현 없음 | 통과 | 전체 src grep `#2E8E8A·#8FD8D3·#56B3AB·#5FC9D6·aqua·teal·mint` = 0 | 아니오 | - |
| 3 | Button 채움 아님 | 통과 | `--primary`는 흰 글래스(rgba(255,255,255,.62)) + Bubble Blue 외곽선 + Blue Ink 글자 + blur(6px) | 아니오 | - |
| 4 | Card/Panel 회색 박스 아님 | 통과 | surface = 흰 글래스 + `backdrop-blur(18px)` + 흰 하이라이트 테두리, dash-tile `rgba(255,255,255,.82)` | 아니오 | - |
| 5 | Bubble이 이미지 버블 | 통과 | BubbleMark가 `<img src="/assets/bubble-sky.webp">`, CSS 원 아님 | 아니오 | - |
| 6 | WidgetShell 4상태 실제 차이 | 통과 | default(불투명 글래스) / translucent(rgba .3 + blur4) / ghost(blur 없음·신호만) / minimal(BubbleBar+DockOrb) 각기 다른 CSS·마크업 | 아니오 | - |
| 7 | Ghost = 신호만 | 통과 | `--ghost` backdrop-filter none, 본문 숨김, Ring+신호+클릭투과만 렌더 | 아니오 | - |
| 8 | Minimal = Bar/Orb | 통과 | minimal 분기에서 `<BubbleBar/> + <DockOrb/>` 반환, 작은 카드 아님 | 아니오 | - |
| 9 | DashboardGrid 가젯식 커스터마이징 | 통과 | edit 모드 핸들·숨김·삭제, dnd-kit 재정렬, Palette 추가, Dropzone active | 아니오 | - |
| 10 | Domain Cards 밋밋/Bootstrap 아님 | 통과 | GlassPanel 표면 + Chip/StatusBadge + 신호 dot + 근거(source) 노출 | 아니오 | - |
| 11 | Dark = Night Bubble | 통과 | `#161E2E` 네이비 + `--surface-bg-dark rgba(34,46,72,.5)` 글래스, 단순 반전 아님 | 아니오 | - |
| 12 | 타이포 위계 | 통과 | Pretendard, 제목 18/700·섹션 14·위젯 13/700·hint 11~12, faint 톤 분리 | 아니오 | - |
| 13 | 여백/밀도/그리드 | 통과 | 12-col grid, 카드 14~16 / 위젯 20~24 반경, gap 12~18, 4열 흐름 반응형(920/560) | 아니오 | - |
| 14 | 깨진 컴포넌트 없음 | 조건부 통과 | tsc exit 0, 클래스·아이콘 참조 정상. 단 런타임 픽셀 검증은 사람 1회 필요 | 사람 확인 | 중 |
| 15 | reduced-motion 동작 | 통과 | globals.css에 `prefers-reduced-motion` 블록 9개(버블·위젯·알림·세그·토글 포함) | 아니오 | - |

## 5. 발견된 문제

1. (수정함) `widget-shell.tsx` ghost 모드의 일정 신호 dot이 토큰에 없는 임의색 `#ECC0D2`였고 클래스도 `d-memo`로 잘못 붙어 있었다. 일정 신호는 pearl 계열이어야 한다.
2. (블로커 아님) 누락 variant 6건: Button icon-only, Chip removable, ResourceCard Loading 단독, WidgetShell Translucent/Ghost 다크 비교, DashboardView edit 단독, Theme System(다크 OS) 스냅샷. 정합화 문서에 기록됨.
3. (한계) 픽셀 스냅샷을 자동으로 못 남겼다. 버블 이미지의 실제 질감과 밀도감은 사람이 Storybook에서 1회 확인해야 100% 확정된다.

## 6. 즉시 수정한 소규모 항목

- `src/components/widget/widget-shell.tsx`: 일정 신호 dot `#ECC0D2`(임의색·`d-memo`) → `#E6C49C`(pearl·`d-schedule`). 토큰 정합성 회복. tsc exit 0 재확인.

그 외 컴포넌트 내 하드코딩 hex는 전부 문서화된 Sky Opal 정규값(ring 색, widget-preview 신호 dot, agent ink `#6E63B8`, opal-lilac `#DCD8F8`)이라 손대지 않았다.

## 7. 라우트 적용 전에 반드시 고칠 항목

블로커는 없다. 다만 라우트에 붙이기 전에 사람이 한 번은 해줘야 하는 것:

1. Storybook에서 Light/Dark 1회 눈 검증 — 특히 버블 이미지 질감(`/assets/bubble-sky.webp` 로드 확인)과 대시보드 밀도감.
2. WidgetPreview의 4상태가 한눈에 구분되는지 확인.
3. (선택) 누락 variant 6건 중 라우트에서 실제로 쓸 것만 먼저 채우기.

## 8. 라우트 적용 가능 여부 판단

판단: B. 소규모 polish 후 라우트 적용 가능.

근거: 15개 기준 모두 코드 레벨에서 통과했고, 발견된 유일한 실제 버그(임의색 dot)는 이번에 수정했다. 구조·색·표면·모션·다크가 전부 기준과 일치한다. 다만 자동 픽셀 스냅샷을 남기지 못했으므로, 라우트 채택의 마지막 관문으로 "사람이 Storybook에서 Light/Dark 1회 눈 검증"을 둔다. 이 눈 검증이 통과하면 곧바로 A(라우트 적용 가능)로 올라간다. 방향 재검토(D)나 큰 polish(C)는 필요 없다.
