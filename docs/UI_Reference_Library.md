# Bubli UI Reference Library

작성일: 2026-06-29

이 문서는 리서치 기준이다. 코드 수정 지시가 아니다.

Bubli의 방향은 일반적인 Glassmorphism이 아니라 `맑은 Paper Glass + Apple Liquid Glass + Air UI`다. 목적은 이후 화면 작업에서 "이 화면은 몇 번 레퍼런스의 원리로 간다"라고 말할 수 있게 기준을 만드는 것이다.

## 적용 원칙

- 배경 전체를 흐리게 덮는 glass가 아니라, 읽기 쉬운 white surface 위에 얇은 투명감과 rim을 얹는다.
- Shadow는 하나가 아니라 ambient, contact, inner highlight, rim highlight를 겹친다.
- Bubble은 장식 배경이 아니라 상태와 기능을 담는 단위다.
- 자료, 승인, 일정, 위젯 같은 창은 실제 HTML/CSS/React로 만든다.
- PNG/WebP는 프리즘 질감, 오팔 버블, 로고처럼 재질 품질을 위한 재료로 쓴다.

## 레퍼런스 목록

| No | 영역 | 레퍼런스 | 형태 | Bubli에 적용할 부분 | 적용하면 안 되는 부분 |
|---:|---|---|---|---|---|
| 1 | Glass Panel | [Glass CSS Generator](https://css.glass/) | CSS 도구 | border, opacity, blur, shadow 값을 빠르게 비교 | generator 결과를 그대로 토큰화 없이 복붙 |
| 2 | Glass Panel | [ui.glass](https://ui.glass/) | 사례 모음 | 기본 glass card 밀도와 blur 감각 | 모든 카드에 같은 blur 적용 |
| 3 | Glass Panel | [FreeFrontend Glassmorphism Examples](https://freefrontend.com/css-glassmorphism/) | 사례 모음 | 다양한 panel과 button reference | 화려한 배경/네온 계열 |
| 4 | Frosted Glass | [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) | CSS 문서 | 브라우저 기준 속성 확인 | fallback 없이 필수 효과로 고정 |
| 5 | Frosted Glass | [MDN filter](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) | CSS 문서 | blur, contrast, saturation 조절 | 텍스트 영역 전체에 과한 filter |
| 6 | Frosted Glass | [Backdrop Filter Blur Demo](https://codepen.io/codesuey/pen/mdbxmGo) | CodePen | blur 배경 검수 | 실 UI에 데모 수치 그대로 적용 |
| 7 | Paper Glass | [Glassmorphism CSS Panels and Buttons](https://codepen.io/kanishkkunal/pen/QWGzBwz) | CodePen | panel/button 구조 참고 | 강한 stroke와 어두운 배경 |
| 8 | Paper Glass | [Glassmorphism UI CodePen](https://codepen.io/drprime01/pen/ByKvyed) | CodePen | 기본 card surface 구조 | 카드 위주의 랜딩 페이지화 |
| 9 | Paper Glass | Tailwind backdrop blur docs | CSS 구현 | utility 설계 참고 | Tailwind class만으로 질감 끝내기 |
| 10 | Apple Liquid Glass | [Getting Clarity on Apple's Liquid Glass](https://css-tricks.com/getting-clarity-on-apples-liquid-glass/) | 설명 글 | Liquid Glass의 의도와 주의점 | Apple UI를 무비판적으로 복제 |
| 11 | Apple Liquid Glass | [Liquid Glass on the Web](https://frontendmasters.com/blog/liquid-glass-on-the-web/) | 구현 글 | SVG filter, refraction, blur 조합 | 모든 컴포넌트에 비싼 필터 적용 |
| 12 | Apple Liquid Glass | [How to create Liquid Glass effects with CSS and SVG](https://blog.logrocket.com/how-create-liquid-glass-effects-css-svg/) | React 구현 글 | React에서 SVG filter를 묶는 방식 | 글자 가독성보다 효과 우선 |
| 13 | SVG Refraction | [MDN feDisplacementMap](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap) | SVG 문서 | 굴절/왜곡 필터의 핵심 | 작은 텍스트 위 과한 왜곡 |
| 14 | SVG Refraction | [MDN feGaussianBlur](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feGaussianBlur) | SVG 문서 | 안개감과 soft edge | 흐림으로 계층을 가림 |
| 15 | SVG Refraction | [MDN feTurbulence](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence) | SVG 문서 | 미세한 유리 결 | 움직이는 noise 남발 |
| 16 | SVG Refraction | [MDN feSpecularLighting](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feSpecularLighting) | SVG 문서 | rim/highlight 실험 | 과한 금속 느낌 |
| 17 | 실제 코드 | [nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) | GitHub | Container, Button, Text 단위 구조 | 의존 구조를 검토 없이 통째 이식 |
| 18 | 실제 코드 | [Pure CSS Liquid Glass UI Kit](https://codepen.io/Margarita-the-solid/fullpage/NPRPBjd) | CodePen | 버튼/패널 liquid 표현 | Bubli 토큰과 다른 색을 그대로 사용 |
| 19 | Bubble UI | [Soap Bubble](https://codepen.io/Inrade/pen/gOZOJgg) | CodePen | bubble rim과 highlight | 장식 버블을 화면 배경으로 크게 사용 |
| 20 | Bubble UI | [Bubble Animation](https://codepen.io/Mark_Bowley/pen/PozwyP) | CodePen | float motion 감각 | 업무 UI에 산만한 무한 애니메이션 |
| 21 | Bubble UI | [Unsplash soap bubble search](https://unsplash.com/s/photos/soap-bubble) | 이미지 참고 | 실제 비누방울 빛과 투명감 | 사진을 앱 배경으로 직접 사용 |
| 22 | Shadow | [Designing Beautiful Shadows in CSS](https://www.joshwcomeau.com/css/designing-shadows/) | 설명 글 | ambient/contact shadow 분리 | 어두운 그림자를 과하게 사용 |
| 23 | Shadow | [CSS Scan shadow examples](https://getcssscan.com/css-box-shadow-examples) | 사례 모음 | 여러 shadow stack 비교 | copy-paste shadow를 토큰 없이 사용 |
| 24 | Shadow | Material Design elevation | 디자인 시스템 | elevation 단계 참고 | Material 스타일로 제품 정체성 변경 |
| 25 | Shadow | Radix Themes shadows | 디자인 시스템 | surface elevation 레벨 참고 | Radix 기본 룩으로 흡수 |
| 26 | Dashboard Layout | [Linear](https://linear.app/) | 제품 참고 | 조용한 사이드바, 밀도, typography | Linear 색/구성을 그대로 복제 |
| 27 | Dashboard Layout | [Notion Calendar](https://www.notion.com/product/calendar) | 제품 참고 | 일정 UI의 여백과 초점 | 캘린더 중심 제품처럼 보이기 |
| 28 | Dashboard Layout | [Craft](https://www.craft.do/) | 제품 참고 | 문서/작업 흐름의 부드러운 표면 | 문서 앱 정체성으로 이동 |
| 29 | Dashboard Layout | [Amie](https://amie.so/) | 제품 참고 | 일정/할 일의 친근한 밀도 | 지나치게 playful한 생산성 앱 톤 |
| 30 | Air UI | [Arc](https://arc.net/) | 제품 참고 | floating chrome과 가벼운 surface | 브라우저 UI를 그대로 따라 하기 |
| 31 | Air UI | macOS translucent sidebars | OS 참고 | vibrancy와 sidebar 깊이 | OS chrome처럼 보이는 과한 모방 |
| 32 | Widget Layout | Apple Widgets | OS 참고 | glanceable hierarchy | iOS 위젯처럼 독립 카드화 |
| 33 | Widget Layout | macOS menu bar apps | OS 참고 | 작고 빠른 status surface | 기능을 너무 숨기는 미니멀 |
| 34 | Interaction | [Motion](https://motion.dev/) | React motion | hover, drag, layout transition | 장식 animation 남발 |
| 35 | Interaction | [dnd kit](https://dndkit.com/) | React drag | dashboard widget 배치 | 복잡한 drag를 첫 구현부터 과하게 |
| 36 | HTML/CSS 구현 | CSS custom properties | 웹 표준 | glass token, shadow token 관리 | 컴포넌트마다 임의 색 사용 |
| 37 | HTML/CSS 구현 | CSS Grid | 웹 표준 | dashboard/widget layout | flex percentage hack |
| 38 | HTML/CSS 구현 | Container queries | 웹 표준 | 위젯 내부 반응형 | viewport 기준만 사용 |
| 39 | React 구현 | Compound component pattern | React 구조 | Panel, Header, Content, Footer 분리 | 추상화만 늘리고 화면 완성 지연 |
| 40 | React 구현 | Storybook states | QA 도구 | light/dark/hover/empty/loading 비교 | 성공 상태만 캡처 |
| 41 | Accessibility | WCAG contrast | 접근성 기준 | glass 위 텍스트 대비 | 낮은 contrast를 감성으로 포장 |
| 42 | Accessibility | prefers-reduced-motion | 웹 표준 | bubble float와 refraction motion 제한 | 모든 사용자에게 애니메이션 강제 |
| 43 | Performance | CSS Paint/Filter cost | 성능 기준 | 비싼 filter 범위 제한 | dashboard 전체에 SVG filter 적용 |
| 44 | Performance | Static raster texture | 구현 전략 | 배경 질감은 PNG/WebP로 고정 | 모든 표면을 이미지로 대체 |
| 45 | Bubli Asset | `docs/visual-target/bubli-asset-pack-mock-faithful-2026-06-29/` | 로컬 기준 | 원본 질감, 버블, 프리즘 | 컴포넌트 화면을 이미지로 박제 |
| 46 | Bubli Brand | `docs/visual-target/bubli-brand-assets-2026-06-29/` | 로컬 기준 | 투명 로고/아이콘 | 원본 로고 시트 직접 사용 |
| 47 | Bubli Build | `docs/visual-target/BUILD_VS_ASSET_BOUNDARY.md` | 로컬 기준 | 제작 경계 | 에셋과 구현 목표 혼동 |

## Bubli 적용 메모

### Glass Panel

- `background: rgba(255,255,255,.78~.88)`
- `backdrop-filter: blur(18px) saturate(1.12)`
- border는 흰색 1px 하나가 아니라 외곽 rim과 안쪽 highlight를 나눈다.
- 그림자는 최소 ambient/contact 두 겹으로 본다.

### Paper Glass

- 일반 회원 웹 앱은 Paper Glass가 기본이다.
- panel 안의 텍스트는 glass 효과보다 가독성이 먼저다.
- 배경에 큰 버블을 깔지 말고, card surface 자체를 맑게 만든다.

### Apple Liquid Glass

- Bubli에서는 전체 UI 언어가 아니라 강조 표면과 Bubble 신호에 제한한다.
- SVG filter는 card 전체가 아니라 버튼, pill, orb, focused panel처럼 작은 면적부터 적용한다.

### Bubble UI

- Bubble은 logo, dock orb, agent signal, badge, progress ring 같은 기능 단위다.
- 장식용 배경 버블은 디자인보드와 브랜드 장면에만 둔다.

### Shadow System

- Ambient shadow: 넓고 아주 흐림.
- Contact shadow: 패널 바로 아래의 짧은 그림자.
- Inner highlight: 위쪽 안쪽 흰 rim.
- Rim highlight: 외곽 얇은 푸른/흰 빛.

### Dashboard Layout

- 데이터 밀도는 Drifty/Linear처럼 조용하게 간다.
- 카드가 많아도 landing page처럼 보이면 실패다.
- 실제 route에서는 sidebar, topbar, card, timeline, approval flow를 컴포넌트로 만든다.

## 컴포넌트 라이브러리 (React + Tailwind, 재조합 대상)

일반 glassmorphism 검색 대신 Liquid Glass + Widget + Floating을 실제 구현한 컴포넌트 모음을 본다. 색은 Bubli 토큰으로 치환하고, 모션은 나중에 붙인다.

| 이름 | URL | 가져올 것 | 주의 |
|---|---|---|---|
| Magic UI | https://magicui.design | Dock, Bento Grid, Animated List, Blur Fade, Shine/Border Beam | 네온 beam 과용 금지 |
| Motion Primitives | https://motion-primitives.com | Dock, Magnetic, Progressive Blur, Floating, Glass | 본문 가독성 해치는 blur 금지 |
| React Bits | https://reactbits.dev | Floating, Glass, Magnet, Dock, Bubble, Orb | 회원앱 배경 대형 Orb 금지 |
| Aceternity UI | https://ui.aceternity.com | Floating Dock, Glass Card, Hover Border | 풀스크린 배경 애니 과함 |
| Origin UI | https://originui.com | Button, Input, Search, Card, Panel | 과한 보더 강조 |
| Park UI | https://park-ui.com | semantic 토큰 설계 | 기본 팔레트 흡수 |
| shadcn/ui | https://ui.shadcn.com | 컴포넌트 구조(색 아님) | 회색 기본 톤 |

## 제품 톤 · 3D 히어로 레퍼런스

| 이름 | URL | 보는 것 |
|---|---|---|
| Voiceflow | https://www.voiceflow.com | 3D 히어로 오브 + 부드러운 인터랙션 |
| Kastle | https://www.kastle.ai | 3D 글래스 오브, floating 위젯 연출 |
| Anchor | https://getanchor.co | floating workspace 무드 |
| Raycast | https://www.raycast.com | command / hover / focus 디테일 |

3D 히어로(Voiceflow/Kastle/Anchor)는 **랜딩·에이전트 orb** 벤치마크다. 회원 작업 화면엔 그대로 넣지 않는다.

## 3D / Motion (정적 톤 확정 후 구현)

- React Three Fiber + drei: 랜딩·에이전트 "살아있는" 3D 버블 orb. 상주 위젯·작업화면은 CSS만.
- Motion(#34) 진입/hover/layout, dnd kit(#35) 대시보드 위젯 배치.
- 순서: 정적 글래스 톤이 보드와 맞은 뒤 가산. visual:qa는 reducedMotion+정적이라 모션 검증 트랙은 별도.

## 디자인 소스 혼합 기준 (2026-06-29 갱신)

화면을 만들 때 아래 셋을 적절히 섞는다. 하나만 베끼지 않는다.

1. **v20 디자인보드** — 위젯 디자인 1순위 기준(가장 완성도 높음). 단 **v20의 위젯 리사이즈 시 방울 뜨는 연출은 보류**(나중에 개선).
2. **버블리 디자인 개념 보드(제일 맘에듬)** — 전체 톤·색·공기감·글래스 질감 기준.
3. **HTML/CSS 예시본**(`docs/visual-target/Bubli_디자인보드_완성_v20_*.html`) — 실제 마크업/CSS 구현 패턴 참고.

추가 확정:
- 파비콘: 포토리얼 PNG 대신 **손으로 그린 벡터 SVG**로 교체 완료(공개=투명 버블, 회원=다크 타일). 큰 앱아이콘/히어로만 포토리얼 PNG.
- `bubli-screen-mockups`·asset PNG·디자인보드 = **시각 참고만**. 화면은 React/CSS로 직접 제작(BUILD_VS_ASSET_BOUNDARY).
- Safari 주의: `backdrop-filter: url()`(SVG filter) 미지원 → frosted blur로 graceful degrade.

## 다음 조사 후보

- 실제 Bubli 컴포넌트별 적용표: Button, Chip, GlassPanel, Card, ProgressRing, AgentBubble, DockOrb.
- SVG filter 성능 검수표.
- Storybook visual QA 캡처 기준.
