# Bubli Visual Target Guide (2026-06-26)

이 문서는 앞으로 Bubli UI/디자인 작업의 **최상위 시각 기준**이다. 첨부된 목표 이미지 3장에서 추출한 규칙을 담는다. 텍스트 Bible보다 이 가이드와 이미지가 우선한다.

충돌 시 판단 순서:
1. 첨부 이미지 3장
2. 이 Visual Target Guide
3. Brand Art Direction Bible
4. Interaction Bible
5. 기존 UI Kit 문서
6. 현재 구현 코드

핵심 한 줄: Bubli는 장식 버블 앱이 아니라, 프리랜서를 위한 깨끗한 Bubble Workspace다. Bubble은 큰 장식이 아니라 UI 기능 단위다. 표면은 거의 흰/어두운 유리, 깊이는 heavy shadow가 아니라 border·rim·highlight로 만든다.

---

## 1. Visual Reference Priority

| 순위 | 이미지 | 역할 | 가장 중요한 추출 대상 |
|---|---|---|---|
| 1 | 최종 UI 목표 보드 | 회원 웹앱·위젯 UI의 최종 방향 | 라이트 밝기/여백, Paper Glass 질감, shadow 크기, 위젯 4상태 구성, Bubble=기능단위, Night Bubble 다크 |
| 2 | 전체 레퍼런스 보드 | 분위기·정보 구조 | Drifty식 시간 흐름→프로젝트 귀속, Liquid Glass 재질, floating widget(=Tauri 맥락) 조건, Bubble을 Badge/Status/Ring/Orb/Bar에 쓰는 법 |
| 3 | Sky Opal Color System | 색·비율 | Main Palette, Usage Ratio, Color Rules, 금지색, 색은 면이 아니라 빛 |

1순위 이미지가 회원 웹앱과 위젯 UI의 최종 방향에 가장 가깝다. 의심되면 1순위 이미지대로 한다.

## 2. What To Copy (이미지에서 그대로 가져올 것)

**1순위 이미지에서**
- 라이트 모드의 밝은 바탕(거의 흰색)과 넉넉한 여백, 카드 사이 공기감.
- 카드 표면: 거의 흰 Paper Glass. 얇은 테두리 + 아주 작은 soft shadow로 살짝 떠 보임. 박스처럼 막히지 않음.
- 위젯 4상태(기본/반투명/고스트/최소화)를 **정돈된 4개 비교 카드**로 보여주는 구성. (배경 wallpaper·큰 구슬 없음)
- 오늘 요약을 한 줄 숫자 묶음(자료·후보·승인대기·할일·일정·프로젝트시간)으로 압축.
- 프로젝트 시간 링(2h15m) = sky→lilac 그라데이션 도넛 + 프로젝트 귀속 범례.
- Night Bubble 다크: 어두운 glass 카드, 얇은 rim, 낮은 채도. 하단 도크 바(`Bubli · 3 · 2` + 아이콘).
- Bubble UI 요소: 버블 버튼, 상태 배지, 진행 링(75%), 도킹 오브(스마일), 알림 버블(벨+카운트). 전부 작은 기능 단위.

**2순위 이미지에서**
- Drifty식 좌측 내비 + "Good morning" 톤의 차분한 정보 구조. 단, 시간 흐름은 **프로젝트 귀속**(ClientA 리뉴얼·회의·자료정리…)으로 바꾼다.
- Liquid Glass: 빛이 스며드는 얇은 유리막. 단 회원 앱 카드에는 절제해서.
- Bubble = 기능 단위 매핑: Badge / Status / Notification / Progress Ring / Agent Signal / Timer State / Project Ring / Dock Orb / Minimized Bar / Ghost Indicator.
- 자료→후보→승인→오늘 할 일: 승인형(자동 확정 아님) + 근거 동반.

**3순위 이미지에서**
- 팔레트·사용 비율·색 규칙·금지색(아래 11장).

## 3. What Not To Copy (가져오면 안 되는 것)

- 무드보드/랜딩의 **포토리얼 비눗방울·유리 텍스처**를 회원 웹앱 라우트 배경으로 가져오지 않는다. (1순위 8번 "무드 보드", 2순위 1번은 랜딩/무드 전용)
- 바탕화면 wallpaper 사진 위 floating 연출은 **Tauri 위젯 실제 맥락**에서만. 회원 웹앱 라우트(WidgetPreview 포함)에 wallpaper 캔버스를 만들지 않는다.
- 큰 오팔 구슬 오브젝트를 화면에 배치하지 않는다.
- 2순위 이미지의 photoreal 히어로 분위기를 앱 화면 밀도로 착각하지 않는다.

## 4. Bubble Usage Rules

**Public Landing**
- 브랜드 히어로에 제한적으로 큰 버블 사용 가능. 포토리얼/오팔도 과하지 않게. 회원 앱과 명확히 구분.

**Member Web App** (대시보드·자료·설정 등 모든 `/app/**`)
- 대형 배경 장식 버블 금지. 배경에 큰 구슬 오브젝트 배치 금지.
- Bubble은 다음 UI 기능 단위에만: `BubbleMark`(로고/엠티스테이트), `AgentBubble`, `DockOrb`, `BubbleBar`, Notification bubble, Badge, Progress Ring, Ghost signal.

**Tauri Floating Widget** (실제 데스크톱 위젯)
- Bubble UI의 핵심 사용처. BubbleBar / DockOrb / Ghost signal / AgentBubble / Notification.
- 실제 위젯 상태와 연결될 때만. 장식용 큰 버블 금지.

**Widget Preview Route** (`/app/desktop/widgets`)
- Tauri 위젯 설정/미리보기 화면이다. 브랜드 무드보드가 아니다.
- 큰 오브젝트 버블 금지. 4상태를 제품 UI처럼 차분히 정리.

**Dark Mode**
- 큰 orb/glow 금지. 작은 rim/highlight만. 회색 구슬 금지.

## 5. Surface / Shadow Rules

원칙: 깊이는 heavy shadow가 아니라 **border + rim + inner highlight**로 만든다. shadow는 작고 맑은 보조.

**제안 토큰 (목표 이미지 기준, 작고 맑게)**

| 토큰 | 제안값 | 용도 |
|---|---|---|
| `--shadow-surface-light` | `0 1px 2px rgba(35,48,59,.05), 0 6px 14px -10px rgba(35,48,59,.12)` | 라이트 기본 카드 |
| `--shadow-floating-light` | `0 10px 22px -14px rgba(35,48,59,.18)` | 라이트 위젯/팝오버 |
| `--rim-light` | `1px solid rgba(255,255,255,.85)` (+ 외곽 `#E5E7EB` hairline) | 라이트 표면 경계 |
| `--inner-highlight-light` | `inset 0 1px 0 rgba(255,255,255,.9)` | 위쪽 흰 하이라이트 |
| `--shadow-surface-dark` | `0 1px 2px rgba(0,0,0,.16)` | 다크 기본 카드(아주 약하게) |
| `--shadow-floating-dark` | `0 12px 26px -18px rgba(0,0,0,.5)` | 다크 위젯/팝오버(먹먹하지 않게) |
| `--rim-dark` | `1px solid rgba(150,170,215,.16)` hairline | 다크 표면 경계 |
| `--inner-highlight-dark` | `inset 0 1px 0 rgba(180,205,240,.07)` | 다크 위쪽 미세 하이라이트 |
| `--glow-sky` (focus 한정) | `0 0 0 3px rgba(158,216,255,.20)` | sky 포커스 글로우(아주 약) |

규칙:
- 기본 카드에 큰 ambient/blur shadow 쓰지 않는다.
- 다크는 검은 drop shadow 과다 금지. rim + inner highlight로 깊이.
- glow는 sky/lilac 아주 약하게만.
- 모든 카드가 같은 shadow scale을 공유(토큰화). 현재 `--surface-shadow`/`--surface-shadow-float`가 과하면 위 값으로 낮춘다.

## 6. Light Mode Rules

- 배경: 거의 흰색(`#FCFDFF`) + 아주 옅은 sky/lilac 광원만.
- 카드: Paper Glass = 거의 흰 표면 + 얇은 테두리 + 위쪽 흰 하이라이트 + 작은 soft shadow.
- 플라스틱 흰 카드/회색 박스로 보이면 실패. 카드와 배경의 깊이는 미세하게, 맑게.
- 컬러는 ring·icon·hover·progress·dot·rim에만. 면을 컬러로 채우지 않는다.

## 7. Dark Mode Rules

- Night Bubble = 어두운 **투명 유리**. 불투명 남색 박스 금지.
- 표면: 낮은 채도 dark glass + hairline rim + 약한 inner highlight.
- 검은 drop shadow 과다 금지. 회색 구슬/큰 glow 금지. 네온 금지.
- 텍스트: 밝은 ink + 낮은 채도 blue-gray 보조.
- sky/lilac glow는 포커스/활성 신호에만 아주 약하게.

## 8. WidgetPreview Rules

목적: Tauri 위젯 4상태를 설명하는 **설정/미리보기 화면**. 사용자가 Default/Translucent/Ghost/Minimal 차이를 이해하는 제품 UI. 실제 Tauri IPC는 아직 미연결.

시각 기준(1순위 이미지 "데스크탑 위젯 4가지 상태" 섹션):
- 4상태를 **정돈된 비교 카드**(예: 4열 또는 2x2)로. 각 카드는 깨끗한 AppShell content surface 위.
- 큰 장식 버블 없음. 배경 wallpaper 과장 없음.
- Default: 또렷한 작업 보조(오늘 할 일·타이머·일정).
- Translucent: 방해 없는 반투명 상태(같은 내용, opacity·대비 낮춤).
- Ghost: 신호만(링/카운트/클릭 통과), 카드 안에서 균형 있게.
- Minimal: BubbleBar / DockOrb로 접힌 상태.
- 설명은 짧은 제품 문장.
- 라이트는 맑고 깨끗하게, 다크는 Night Bubble glass.

금지: 대형 bubble object, dark canvas 위 구슬, 배경 wallpaper 과장, 회색 orb, 디자인보드식 장면, AppShell 무시한 독립 아트보드.

## 9. Dashboard Rules

- 1순위 Bubble Workspace / Dashboard Customizing 기준.
- 카드가 너무 밋밋한 흰 박스가 되면 안 된다(rim·하이라이트·작은 그림자로 살짝 떠 보이게).
- 오늘 요약(숫자 묶음), 프로젝트 시간 링, 에이전트 제안, 위젯 팔레트는 차분하게.
- 커스터마이징은 네이버 블로그 가젯식(추가/드래그/크기/숨김)으로 읽혀야 함.

## 10. ResourceFlow Rules

- 자료 → 후보 → 승인 → 오늘 할 일이 한눈에. 승인형 UX 강조(자동 확정처럼 보이면 안 됨).
- 후보에는 근거(출처) 동반.
- 카드 표면은 공통 Paper Glass / Night Glass.

## 11. Color Usage Rules

**Main Palette**: Background `#FCFDFF` · Surface `#FFFFFF` · Pearl `#F8F6F4` · Mist `#F2F7FC` · Sky Light `#D8F0FF` · Sky `#9ED8FF` · Bubble Blue `#6FB8F2` · Opal Lilac `#DCD8F8` · Soft Pink `#F6DDEB`.

**Usage Ratio**: White/Near-White 85% · Pearl/Mist 10% · Sky Light 3% · Bubble Blue 1% · Lilac/Pink 1%.

**Rules**
- Background/Surface는 거의 흰색.
- Sky / Bubble Blue = accent, ring, icon, hover, progress에만.
- Opal Lilac / Soft Pink = agent, alert, highlight에만.
- 색은 면이 아니라 **빛**으로 사용. 카드/배경을 컬러로 채우지 않는다.

**금지색 (전면 금지)**: Aqua / Teal / Mint 계열 — `#2E8E8A`, `#8FD8D3`, `#56B3AB`, `#5FC9D6`.

참고: 1순위 이미지 "Bubble Rim" 예시에 "민트" 라벨 칸이 있으나, Sky Opal 색 시스템의 금지색 규칙이 우선한다. Rim은 스카이/리일락/펄/로즈만 쓰고 민트/틸은 쓰지 않는다.

## 12. Forbidden Patterns

- 회원 웹앱 배경에 큰 버블 오브젝트.
- `bubble-opal.webp`(또는 어떤 에셋)를 배경 장식으로.
- 대형 dark canvas 위 구슬 배치.
- 웹앱 라우트를 무드보드/아트보드처럼 구성.
- 위젯 프리뷰를 데모 박스나 디자인보드처럼.
- 청록/민트/aqua/teal 재도입.
- 검은 heavy shadow / 과한 ambient shadow.
- 다크에서 회색 구슬/큰 glow.

## 13. Current Implementation Problems (실패 기록)

최근 Visual Target Alignment Sprint의 WidgetDesktopBoard / bubble-opal.webp 방향은 **실패**로 기록한다.
1. Bubble을 UI 언어가 아니라 큰 배경 장식으로 오해.
2. 회원 웹앱 라우트 안에 대형 오팔 구슬 배치.
3. 목표는 기능 단위 Bubble UI인데 장식 구슬을 넣어 장난감처럼 보임.
4. Shadow/surface가 목표 이미지보다 무겁고 탁함.
5. 다크가 Night Bubble glass가 아니라 남색 박스 + 회색 구슬처럼 보임.
6. WidgetPreview가 설정/미리보기 화면이 아니라 디자인보드/무드보드처럼 변함.

이 방향은 앞으로 금지한다.

## 14. Rollback Candidates

- `public/assets/bubble-opal.webp` (배경 장식 용도)
- `WidgetDesktopBoard` 컴포넌트 + index export
- `.bubli-desk*` 대형 데스크톱 캔버스 CSS + `.bubli-desk-head`
- `/app/desktop/widgets` 라우트의 WidgetDesktopBoard 사용부
- `widget-preview.tsx`의 배경 DecorBubble(웹앱 내 장식 버블)
- `.widget-modes-board` / `.widget-mode-card` 등 실험 레이아웃
- `bubble-mark.tsx`의 `BUBBLE_ASSET` opal 전환(결정 필요: sky 복원 vs opal 마크 한정)
- 다크 decor의 screen-blend/밝기 보정 등 "회색 구슬 보정" 흔적
- 과한 ambient/heavy dark shadow를 쓰는 surface 토큰
- `docs/visual-qa/Visual_Delta_Report_2026-06-26.md`(거부된 방향 기준) — 아카이브

## 15. 유지할 것 / Next Approved Work Queue

**유지(확정)**: Sky Opal 토큰 · UI Kit 이식 전체 · Button/Chip/StatusBadge/GlassPanel/ProgressBar/Ring · BubbleMark/DockOrb/AgentBubble/BubbleBar 컴포넌트 · WidgetShell 4상태 · ThemeProvider · DashboardView/ResourceFlowView flag · AppShell 다크 정합화 · visual:qa 자동화/CI · 기존 fallback.

**다음 작업 큐(승인 후 순서대로)**
1. 롤백: WidgetDesktopBoard·`.bubli-desk*`·웹앱 배경 버블 제거. WidgetPreview 라우트를 1순위 이미지의 "4상태 비교 카드"로 정리.
2. Surface/Shadow 토큰을 5장 제안값으로 재정의(라이트 작고 맑게, 다크 rim+inner highlight). 모든 카드 공통 적용.
3. 버블 사용을 기능 단위로 제한(배경 장식 제거). BubbleMark 에셋 결정 반영.
4. 라이트/다크 카드 표면을 Paper Glass / Night Glass 기준으로 통일.
5. Dashboard/ResourceFlow 카드 밀도·여백·타이포를 1순위 이미지 기준으로 미세 정리.
6. visual:qa 재실행 + 1순위 이미지와 비교 보고 → 사용자 승인.

각 단계는 코드 수정 전 승인을 받는다. "visual:qa 통과"는 기능 검증이며, 디자인 합격은 첨부 이미지와 비교해 사용자가 승인한다.
