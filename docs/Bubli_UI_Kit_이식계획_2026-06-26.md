# Bubli UI Kit 이식 계획

작성일: 2026-06-26 · 기준(최상위): Brand Art Direction Bible v1.0(시각) + Interaction Bible v1.0(행동) · 상태: 계획 단계(코드 수정 없음)

목적: 코덱스가 만든 React 컴포넌트 구조(라우트·feature·props·data 자리)를 **유지한 채**, 시각 디자인을 Sky Opal로, 행동을 Interaction Bible로 안전하게 이식한다. 화면부터 감으로 다시 만들지 않고 `components/ui → bubbles → widget shell → domain cards → page assembly` 순서로 간다.

핵심 진단(좋은 소식): 현재 아키텍처는 **얇은 React 래퍼 + `bubli-*` CSS 클래스(globals.css 집중)** 패턴이다. `src/styles/globals.css :root` 토큰이 이미 Sky 계열(#6FB8F2 blue·#8ECDF6 sky·#E6DDF8 lilac·#E8C4A0 pearl·#E89898 rose)이라 **청록/aqua/teal이 없다.** 따라서 이식 = 갈아엎기가 아니라 **(1) 토큰 Sky Opal 잠금 → (2) `bubli-*` 클래스 Bible 기준 재정의 → (3) React 래퍼에 variant prop 보강**이다. props/route/data는 건드리지 않는다.

---

## 1. 현재 컴포넌트 목록 분석

### 1.1 공통(components/)
| 폴더 | 컴포넌트 | 패턴 | 스토리 |
|---|---|---|---|
| ui | Button(variant: primary/secondary/quiet/ghost, size sm/md/lg) | 래퍼+`bubli-button*` | 있음 |
| ui | StatusBadge(tone: agent/communication/timer/todo…) | 래퍼+클래스 | 있음 |
| ui | Chip / ProgressBar / GlassPanel(`bubli-surface`) / EmptyState / PageHeading / SectionHeading / PlaceholderPanel | 래퍼+클래스 | 없음 |
| bubbles | BubbleCard(type 8종, displayMode: default/ghost/minimized, progress·items·actions) | 래퍼+`bubli-bubble*` | 있음(1) |
| domain | ResourceCard / SuggestionCard / WorkItemCard / ChatMessage | 래퍼+클래스 | 있음(4) |
| layout | AppShell / AppNav / WorkspaceTopbar / PublicHeader | 래퍼 | 일부 |

### 1.2 feature 스토리 분포(144개)
resources 27 · agent 18 · settings 17 · widget 16 · communication 14 · project-room 13 · managed-folder 6 · public-site 4 · dashboard 4 · calendar 4 · wbs 3 · todo 3 · timer 3 · auth 3 · notification 2 · memo 2 · 기타. → 핵심 화면은 대부분 스토리 보유. components/ui 스토리는 2개뿐(보강 필요).

### 1.3 토큰/스타일 현황
- `globals.css`(약 8034줄)에 `:root` 토큰 + `bubli-*` 클래스가 집중. 컴포넌트는 className만 조합.
- 토큰은 v20(Sky 계열). 다크 토큰(`--bubli-night-*`)도 존재(Brand Bible 8장).
- 모션 토큰 일부(`--ease-out`, `--spring`)만 존재 → Interaction Bible Part 5 토큰으로 확장 필요.

---

## 2. 살릴 / 병합 / 새로 만들 컴포넌트

### 살린다(구조·래퍼 그대로, 시각만 재정의)
Button · StatusBadge · Chip · ProgressBar · GlassPanel · EmptyState · PageHeading · SectionHeading · BubbleCard · ResourceCard · SuggestionCard · WorkItemCard · ChatMessage · AppShell · AppNav · WorkspaceTopbar · PublicHeader.

### 병합/정리
- PlaceholderPanel ↔ EmptyState: 빈/자리 표시 역할 중복 → EmptyState로 수렴(Interaction Bible Part 10 톤).
- 도메인 카드(Resource/Suggestion/WorkItem)는 내부 표면을 GlassPanel/공통 Card 토큰으로 통일(중복 그림자·테두리 제거).
- StatusBadge tone 세트를 Sky Opal 신호색(todo 하늘·agent 라일락·memo 펄·alert 로즈·ok soft-green)으로 일원화.

### 새로 만든다(Bible에 있으나 코드에 없음)
| 신규 | 역할 | 비고 |
|---|---|---|
| BubbleMark | 브랜드 로고 버블 | 이미지 에셋(bubble-sky.webp) |
| BubbleOrb / DockOrb | 떠있는 오브·메뉴 핸들 | 이미지 에셋 + 중앙 카운트 |
| AgentBubble(스마일) | 에이전트 신호 | 이미지 막 + SVG 미소 |
| Ring(Progress/Time) | 도넛 링 | SVG gradient stroke(Sky+Lilac) |
| WidgetShell | Tauri 위젯 셸(4상태) | default/translucent/ghost/minimal variant |
| BubbleBar | 최소화 바 | "Bubli · 떠 있는 일 3" |
| DecorBubble | 배경 장식 버블(소수) | 이미지 에셋, float |
| ActivityTimeline / TimeRing | 시간 흐름(프로젝트 귀속) | SVG/CSS |
| ThemeProvider + 토큰 | Light/Night Bubble | CSS 변수 양면 |
| DashboardGrid + Palette | 커스터마이징 | dnd kit(설치됨) |

> 원칙: 둥근 투명 버블(로고·오브·장식·에이전트 막)은 **이미지 에셋**. 위젯 카드·패널은 **CSS Paper Glass**(BubbleCard 유지). CSS로 포토리얼 버블 흉내 금지.

---

## 3. Brand Bible 기준 위반 항목(현재 코드)

| 항목 | 현재 | Bible 조항 | 수정 |
|---|---|---|---|
| 토큰 명칭/값 | v20 명칭(water-blue 등), 일부 누락 | Part4 Sky Opal | Sky Opal 토큰으로 잠금(값 동기화) |
| Button primary | 채움 버튼일 가능성 | Part4 §4.4 | White Glass + Blue outline + Blue ink로 |
| 둥근 버블 | `bubli-bubble`(CSS) 일부 장식적 | Part6 | 로고·오브·장식·에이전트는 이미지 에셋으로 분리 |
| 색 사용 | 신호색이 면에 들어갈 여지 | 비율 85/10/3/1/1 | 색은 rim·ring·dot·outline·glow로 |
| 다크 | 토큰만, variant 미적용 | Part8 | Night Bubble variant(blue navy, no teal) |
| 청록/민트 | 없음(양호) | 금지 | 재도입 금지 유지 |

(현재 코드가 청록을 안 쓰는 점은 큰 장점 — 위반은 "토큰 명칭 미정합·primary 채움·버블 에셋화" 정도.)

---

## 4. Interaction Bible 기준 누락 variant

각 컴포넌트가 가져야 할 표준 Interaction Variant 중 현재 비어 있는 것:
- 전 컴포넌트: **Hover · Focus · Loading · Disabled · Dark** 스토리 대부분 없음 → 신설.
- BubbleCard: displayMode에 **translucent** 없음(default/ghost/minimized만) → 4상태로 확장.
- WidgetShell: 미존재 → **Default/Translucent/Ghost/Minimal/Sleep** 신설.
- Agent: **Idle/Listening/Thinking/Suggesting/Waiting** 상태 없음.
- Ring/Notification/DockOrb/CommandPalette: 상태 variant 없음.
- 빈 상태: 화면별 Empty(감정 톤) 미정리.

모션: hover/press/spawn/destroy/ghost-enter 등 모션 토큰(Part 5) 미연결 → Storybook play function으로 시연 추가.

---

## 5. components/ui 이식 순서

토큰 먼저, 그다음 원자 컴포넌트. 각 단계는 globals.css `bubli-*` 재정의 + 래퍼 variant 보강.

1. **토큰 레이어 잠금** — `:root`에 Sky Opal 토큰 + 모션 토큰(Part 5) 정의. 기존 변수는 alias로 매핑(깨짐 방지). 다크 변수 `[data-theme="dark"]` 정의.
2. **Button** — primary=White Glass+Blue outline+Blue ink, secondary=glass, quiet/ghost. hover lift·press squish.
3. **Chip / StatusBadge** — Sky Opal 신호색 일원화, dot=신호.
4. **GlassPanel(Card/Panel)** — Paper Glass(흰색·1px 흰 테두리·넓고 옅은 그림자). 표면 토큰 단일화.
5. **Input**(없으면 신설) — 흰 유리 필 + Sky focus 링.
6. **ProgressBar / Ring** — Ring 신규(SVG Sky+Lilac gradient).
7. **EmptyState** — Interaction Part 10 톤.

> 화면 파일은 이 단계에서 건드리지 않는다. globals.css 클래스 + 래퍼만 수정.

---

## 6. bubbles → widget shell → domain cards 이식 순서

8. **bubbles**: BubbleMark·BubbleOrb·DockOrb·AgentBubble·DecorBubble 신규(이미지 에셋). BubbleCard는 CSS 유지하되 Sky Opal·4상태 정합.
9. **WidgetShell(Tauri 4상태)**: Default/Translucent/Ghost/Minimal variant + BubbleBar/DockOrb. (Part 10 상세)
10. **domain cards**: ResourceCard/SuggestionCard/WorkItemCard/ChatMessage를 공통 Card 토큰으로 통일, 신호색·상태 variant 적용.
11. **page assembly**: 검수 통과한 컴포넌트로 화면 조립(7장 순서).

---

## 7. Storybook 검수 순서

각 컴포넌트는 아래 Variant가 Storybook에서 통과해야 다음 단계로.
1. ui 원자(Button→Chip/Badge→Card/Panel→Input→Ring): Default·Hover·Focus·Loading·Disabled·Dark.
2. bubbles: BubbleMark/Orb/Agent — Idle·Hover·Spawn·Dark. BubbleCard — 4상태.
3. WidgetShell: Default·Translucent·Ghost·Minimal·Sleep·Dark.
4. domain cards: 상태별(Resource: Analyzing/Analyzed/Shared; Task: Todo/InProgress/Done/Overdue) + Dark.
5. 화면 단위 스토리(조립)는 위 통과 후.
검수 기준: Brand Bible 3초 테스트 + Interaction 3초 테스트 + reduced-motion 정지.

---

## 8. 화면 적용 순서(page assembly)

components/ui가 통과한 뒤에만 화면 적용. 우선순위:
1. 공개 사이트(랜딩) — 위험 낮음, 브랜드 첫인상.
2. 로그인/진입.
3. 대시보드(`/app`) — 위젯 그리드.
4. 프로젝트룸 / 자료보드.
5. 작업판(WBS/TODO).
6. 소통/보이스.
7. Tauri 전용(위젯·desktop).
각 화면은 빈/로딩/에러/정상 4상태 + Dark를 갖춘 채 적용.

---

## 9. API 연동 순서(디자인 안정화 후, 화면 단위)

먼저 붙여도 되는 화면(목 → 실데이터 교체 쉬움): 대시보드 요약·오늘 할 일·일정·타이머(단일 도메인). 인증(모든 화면 전제 → 1순위).
미뤄야 하는 화면(계약·payload 확정 필요): 에이전트 후보/job 이벤트, 채팅 WebSocket, 보이스 LiveKit 토큰, 활동 캡처(Tauri), 파일 업로드(presigned), 위젯 동기화, 대시보드 레이아웃(dashboard_layouts 신규).
원칙: 디자인 시스템(2~7단계) 안정화 → 화면 단위로 TanStack Query 연결. zustand 목으로 인터랙션 선행, 계약 확정 시 교체.

---

## 10. Tauri 위젯 4상태 구현 순서

WidgetShell variant로 별도 구현(칩 라벨 금지, 실제 시각·행동 차이).
1. **Default** — 흰 유리·오팔 rim·떠있는 그림자·호흡(breathe). 콘텐츠 풀.
2. **Translucent** — opacity+rim+blur+대비 함께↓(단순 opacity 아님).
3. **Ghost** — 거의 투명·점선·신호 링만 + 클릭 투과(setIgnoreCursorEvents 전체).
4. **Minimal** — BubbleBar/DockOrb로 접힘 + Tray 연동.
각 상태는 Storybook variant + Interaction Bible Part 3/5 전이·모션. per-region 투과는 P3(검증 위험).

---

## 11. Dark Mode 적용 순서

1. 토큰 양면 정의(`:root` Light / `[data-theme="dark"]` Night Bubble: blue navy #161E2E, 어두운 유리, Sky/Lilac 글로우 rim — 청록 금지).
2. ThemeProvider + 토글(Light/Dark/System) — user_preferences.theme.
3. 컴포넌트는 변수만 참조(hex 직접 금지) → 자동 대응.
4. Storybook Dark variant로 컴포넌트별 검수.
5. 화면은 컴포넌트 통과 후 일괄.

---

## 12. 절대 건드리면 안 되는 파일/구조

- `src/app/**` 라우트 구조·route group(공개/인증/workspace). URL 변경 금지.
- `src/features/*/` feature 폴더 경계·책임.
- 컴포넌트 **props/타입 시그니처**(BubbleCardProps 등)·data 자리. 시각/클래스만 바꾼다.
- `src/lib/api`·`types/api`·`lib/tauri`·`lib/websocket` 경계.
- 기존 컴포넌트 **삭제 금지**(병합은 내부 흡수로, 파일 제거는 정합화 계획 따라 별도).
- `tauri.conf.json`·capabilities(권한)·`src-tauri` 경계는 위젯 구현 단계에서만, 합의 후.
- 토큰은 **alias 매핑**으로 추가(기존 변수 즉시 삭제 금지 — 화면 깨짐 방지).

---

## 13. 다음 단계

이 계획 승인 후: **5단계 1번(토큰 레이어 잠금)부터** 시작 — globals.css `:root`에 Sky Opal + 모션 토큰을 추가/alias하고, Button부터 Storybook variant로 검수. 화면은 건드리지 않는다.

요약: 구조는 유지, 토큰·클래스·variant만 Bible로 교체. 둥근 버블은 이미지 에셋, 위젯 카드는 CSS, 색은 빛으로. 순서는 ui → bubbles → widget shell → domain → assembly.
