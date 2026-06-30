# Visual Target — 최상위 시각 기준 이미지

이 폴더는 Bubli UI/디자인 작업의 **최상위 시각 기준 이미지**를 둔다. 텍스트 문서(`docs/Bubli_Visual_Target_Guide_2026-06-26.md`)보다 이 폴더의 이미지들이 우선한다.

충돌 시 판단 순서: 이 폴더 이미지 > Visual Target Guide > Brand Bible > Interaction Bible > UI Kit 문서 > 코드.

## 현재 이 폴더에 있는 실제 파일 (2026-06-29 점검)

처음 계획했던 `01_target.png / 02_widget.png / 03_color.png` 이름으로는 저장되지 않았다. 실제로는 아래 한글 파일명으로 들어와 있다. 색·구도·질감의 기준은 이 파일들이다.

| 실제 파일명 | 역할 | 무엇을 본다 |
|---|---|---|
| `버블리 디자인 개념 보드(제일 맘에듬 컨셉이).png` | 1순위 — 대표 목표 보드(작성자가 가장 선호) | 9패널 종합 보드: Bubble Workspace 첫 화면, Drifty식 대시보드, Liquid Glass, 데스크탑 위젯 4상태, 대시보드 커스터마이징, 자료→후보→승인→오늘 할 일, Night Bubble 다크, Bubble UI 요소, 바탕화면 floating |
| `버블리 UI 디자인 개념 보드.png` | 1순위 보조 — UI 목표 보드(라이트 중심) | 라이트 밝기·여백, Paper Glass 질감, shadow 크기, 위젯 4상태, Bubble=기능 단위, 다크 대비 |
| `컨셉이미지1.jpg` | 질감 무드 참고 | 오팔/홀로그래픽 글래스 재질(투명 중심 + sky/lilac/pink 굴절). 면을 색으로 채우지 말고 빛으로 |
| `컨셉이미지2.jpg` | 버블 형태감 참고 | 투명 3D 비눗방울 asset 느낌(중심 투명, 오팔 rim, 흰 specular). 단 회원 웹앱에는 큰 장식 버블로 넣지 않는다 |

색 시스템(Main Palette, Usage Ratio, 금지색)은 별도 단독 이미지가 아니라 위 보드 안 패널과 `../Bubli_Visual_Target_Guide_2026-06-26.md` 11장에 정리돼 있다.

## 파일명을 정리하고 싶다면

- 위 파일명을 그대로 두고 읽어도 된다. Claude Code는 한글 경로도 그대로 읽는다.
- 이름을 통일하려면 1순위 보드를 `01_target.png`로 바꾸는 식으로 정리하고, 이 표도 함께 고친다. 한 곳만 고치면 다시 어긋난다.
- 주의: 현재 `docs/`는 `.gitignore`에 걸려 있어 이 이미지들은 로컬에만 있고 원격 저장소에는 올라가지 않는다.

## 참고: 디스크에 있는 근접 자료

원본 3장을 저장하기 전이라도, 아래 기존 디자인 캡처가 가장 가깝다(절대경로).

- 라이트 위젯 floating: `/Users/maren/EDU/Final Project/00_현재_프로젝트/최종_프리랜서_v4/03_디자인_시안/디자인톤_정돈_2026-06-12/Bubli_v19_QA_2026-06-19/v19-desktop-widget-default-834.png`
- 다크 위젯 글래스 캔버스: `…/Bubli_v19_QA_2026-06-19/v19-widget-v13-night-black-1184.png`
- Sky Opal 전체 보드: `…/Bubli_v20_QA_2026-06-19/v20-1440.png`

상세 규칙은 `../Bubli_Visual_Target_Guide_2026-06-26.md` 참고.

## 에셋팩

2026-06-29에 런타임 CSS/SVG로 표현하기 어려운 유리 질감, 버블 오브, 도크 오브, 링, Tauri 배경을 PNG로 고정한 에셋팩을 추가했다.

- 우선 사용: `bubli-asset-pack-mock-faithful-2026-06-29/`
- 우선 미리보기: `bubli-asset-pack-mock-faithful-2026-06-29/previews/mock-faithful-preview.png`
- 먼저 읽을 파일: `bubli-asset-pack-mock-faithful-2026-06-29/README.md`
- 기계가 읽을 목록: `bubli-asset-pack-mock-faithful-2026-06-29/manifest.json`

이전 1차 팩과 `rain-glass-v2` 팩은 혼선을 줄이기 위해 제거했다. 원본 목업을 맞추는 작업에서는 `mock-faithful` 팩만 본다.

## 브랜드 에셋

로고와 앱 아이콘은 별도 폴더로 분리했다.

- 위치: `bubli-brand-assets-2026-06-29/`
- 미리보기: `bubli-brand-assets-2026-06-29/preview/brand-assets-preview.png`
- 먼저 읽을 파일: `bubli-brand-assets-2026-06-29/README.md`
- 기계가 읽을 목록: `bubli-brand-assets-2026-06-29/manifest.json`

로고 마크는 투명 배경 PNG/WebP로 쓴다. 오팔 질감이 있는 마크를 자동 trace SVG로 바꾸면 재질이 깨진다.

## 제작 경계

에셋과 실제 구현 대상은 `BUILD_VS_ASSET_BOUNDARY.md`에 분리했다.

주의: 대시보드, 위젯 4상태, 자료 승인 플로우, 다크 모드, floating desktop 장면은 PNG 에셋이 아니라 실제 HTML/CSS/React로 제작해야 한다. 에셋팩은 재질과 기능 단위 Bubble을 위한 재료다.
