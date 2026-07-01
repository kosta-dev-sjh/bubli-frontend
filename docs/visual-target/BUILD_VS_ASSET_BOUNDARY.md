# Bubli Build vs Asset Boundary

원본 목업을 볼 때 전부 이미지로 자르면 안 된다. Bubli가 필요한 것은 `맑은 Paper Glass + Apple Liquid Glass + Air UI`에 가까운 실제 인터페이스다.

## 에셋으로 남길 것

| 항목 | 이유 | 위치 |
|---|---|---|
| 프리즘 배경 질감 | CSS gradient만으로는 빛 굴절과 안개감이 부족하다 | `bubli-asset-pack-mock-faithful-2026-06-29/textures/` |
| 오팔 버블 | rim, specular highlight, 내부 투명감은 래스터가 더 정확하다 | `bubli-asset-pack-mock-faithful-2026-06-29/bubbles/` |
| 로고/앱 아이콘 | 오팔 재질 마크는 자동 SVG화하면 깨진다 | `bubli-brand-assets-2026-06-29/` |
| 자료용 비교 크롭 | 원본의 밀도, 밝기, 깊이를 맞추는 눈금자다 | `bubli-asset-pack-mock-faithful-2026-06-29/source/` |
| 데스크탑 배경 사진 | floating 위젯의 공간감을 보여주는 장면 자료다 | `textures/mountain-widget-bg-1920.png` |

## 실제로 제작해야 하는 것

| 목업 영역 | 제작 방식 | 에셋 사용 범위 |
|---|---|---|
| 2. Drifty 스타일 대시보드 | 실제 sidebar, topbar, card, ring, list, agent toast 컴포넌트로 제작 | 버블/질감은 작은 보조만 |
| 4. Tauri 데스크탑 위젯 4상태 | 기본/반투명/고스트/최소화 상태를 실제 layout state로 제작 | 배경과 orb만 사용 |
| 5. 대시보드 위젯 커스터마이징 | drag grid, widget tile, empty dropzone, resize state로 제작 | card texture를 통째 배경으로 쓰지 않음 |
| 6. 자료 -> 후보 -> 승인 -> 오늘 할 일 | 실제 step column, file row, approval card, button state로 제작 | agent orb만 작은 신호로 사용 |
| 7. Dark Mode 예시 | tokenized dark glass surface, inner highlight, rim, shadow system으로 제작 | 다크 프리즘은 보드/검수용 |
| 8. Bubble UI 요소 | Badge, Status, Notification, ProgressRing, AgentSignal, DockOrb 컴포넌트로 제작 | 버블 PNG는 signal/icon 재료 |
| 9. 바탕화면 floating 느낌 | 실제 floating panel, dock, widget placement, backdrop blur로 제작 | mountain background와 dock orb만 사용 |

## 기술 사용 기준

- CSS: layout, spacing, typography, responsive, token, state.
- CSS glass: `backdrop-filter`, translucent fill, border, inner highlight, layered shadow.
- SVG filter: refraction, displacement, turbulence, highlight distortion.
- Canvas/WebGL: 필요할 때만. 실시간 버블이나 비싼 굴절 효과에 한정한다.
- PNG/WebP: 프리즘 질감, 오팔 버블, 브랜드 마크처럼 CSS/SVG로 품질이 안 나오는 재료.
- React: dashboard, widget, approval flow, drag state, dark/light variants.

## 금지

- 대시보드 패널을 PNG 한 장으로 붙이지 않는다.
- 글자와 버튼이 들어간 카드를 이미지로 박제하지 않는다.
- 원본 목업 크롭을 실제 컴포넌트 배경으로 깔고 위에 투명 버튼을 올리지 않는다.
- 큰 장식 버블을 회원 웹 앱 배경으로 되살리지 않는다.
- 로고 마크를 자동 trace SVG로 바꾸지 않는다.

한마디로, 이미지는 재료이고 창은 제품이다. 제품처럼 눌리고, 반응하고, 줄어들고, 다크 모드에서도 버티는 부분은 실제로 만든다.
