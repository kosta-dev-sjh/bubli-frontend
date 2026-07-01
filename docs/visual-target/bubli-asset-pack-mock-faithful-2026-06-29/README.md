# Bubli Mock-Faithful Asset Pack (2026-06-29)

이 폴더는 원본 목업의 청량한 Liquid Glass / Bubble 느낌을 가장 우선해서 만든 PNG 에셋팩이다.

이전 실험 에셋팩은 혼선을 줄이기 위해 제거했다. 원본 목업 충실도가 중요한 작업에서는 이 폴더를 먼저 쓴다.

## 먼저 볼 파일

| 용도 | 파일 |
|---|---|
| 전체 미리보기 | `previews/mock-faithful-preview.png` |
| 원본 목업 보드 보관본 | `source/original-mock-board.png` |
| 원본 목업 1번 패널 | `source/mock-section-01-mood.png` |
| 원본 목업 3번 Liquid Glass 패널 | `source/mock-section-03-liquid-glass.png` |
| 원본 목업 8번 Bubble UI 패널 | `source/mock-section-08-bubble-ui.png` |
| 원본 목업 9번 데스크탑 floating 패널 | `source/mock-section-09-floating-desktop.png` |

## 핵심 에셋

| 용도 | 파일 |
|---|---|
| 밝은 프리즘 배경 | `textures/glass-prism-bg-light-1920.png` |
| 부드러운 밝은 프리즘 배경 | `textures/glass-prism-bg-light-soft-1920.png` |
| 다크 프리즘 배경 | `textures/glass-prism-bg-dark-1920.png` |
| 부드러운 다크 프리즘 배경 | `textures/glass-prism-bg-dark-soft-1920.png` |
| 데스크탑 floating 배경 | `textures/mountain-widget-bg-1920.png` |
| 밝은 glass card 배경 | `surfaces/glass-card-bg-light-800.png` |
| 다크 glass card 배경 | `surfaces/glass-card-bg-dark-800.png` |
| 큰 glass panel | `surfaces/glass-panel-lg-600x400.png` |
| 기본 오팔 버블 | `bubbles/bubble-large-512.png` |
| 작은 기능 버블 | `bubbles/bubble-medium-256.png`, `bubbles/bubble-small-128.png`, `bubbles/bubble-tiny-64.png` |
| 에이전트 오브 | `bubbles/orb-agent-128.png`, `bubbles/orb-agent-96.png`, `bubbles/orb-agent-64.png` |
| 도크 오브 | `bubbles/dock-orb-96.png`, `bubbles/dock-orb-64.png` |
| 고스트 오브 | `bubbles/ghost-indicator-96.png`, `bubbles/ghost-indicator-64.png` |
| 프로젝트 시간 링 | `widgets/progress-ring-200.png`, `widgets/widget-ring-blue-120.png` |
| 타이머 링 | `widgets/timer-circle-120.png` |
| 최소화 바 | `widgets/minimized-bar-160x32.png` |

## 사용 규칙

- 원본 목업을 맞추는 작업에서는 이 폴더를 1순위로 쓴다.
- `source/mock-section-*` 파일은 비교 기준이다. 컴포넌트 배경으로 그대로 깔기보다 색, 흐림, 깊이, rim light를 맞출 때 본다.
- `textures/*`는 디자인보드, Tauri 위젯, 데스크탑 floating 맥락에서만 쓴다. 회원 웹 앱 `/app/**` 라우트 전체 배경으로 크게 깔지 않는다.
- `bubbles/*`는 장식 배경이 아니라 기능 단위 Bubble로 쓴다. 예: AgentBubble, DockOrb, BubbleMark, Badge, Notification, Ghost signal.
- 에이전트 얼굴 오브는 선명한 눈코입을 키우면 무섭다. 64~96px 안에서 낮은 대비로만 쓴다.
- 새로 CSS/SVG로 비슷하게 그리기보다, 이 PNG의 흐릿한 프리즘과 오팔 rim을 보존한다.

## 관련 폴더

| 폴더 | 역할 |
|---|---|
| `../bubli-brand-assets-2026-06-29/` | 로고와 앱 아이콘. 투명 배경 PNG/WebP |
| `../BUILD_VS_ASSET_BOUNDARY.md` | 에셋으로 둘 것과 실제로 제작할 창의 경계 |

한마디로, 이 팩은 "깨끗한 유리 도형"이 아니라 원본 목업의 물빛, 안개, 프리즘, 오팔버블을 살리는 기준이다.
