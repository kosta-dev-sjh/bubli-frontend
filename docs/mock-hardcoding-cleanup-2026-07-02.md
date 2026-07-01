# 목업·하드코딩 데이터 정리 2026-07-02

기준: `src` 디렉터리. 테스트, Storybook 전용 파일, `workspace-preview-data` 개발 fallback은 제외한다.

## 처리한 것

- `ResourceFlowView`가 프로덕션 코드에서 샘플 데이터를 기본 렌더링하지 않도록 변경했다. 데이터가 없으면 빈 상태를 보여준다.
- Storybook 확인용 샘플은 `resource-flow-view.stories.tsx` 안으로만 이동했다.
- 사용자 화면에 노출될 수 있는 한국인 이름, 임의 프로젝트명, 임의 파일명을 중립 기본값으로 바꿨다.
- UI 문구의 `계약`, `납품` 중심 표현을 `업무 범위 문서`, `마감일`, `결과물`, `API 기준`처럼 제품 문맥에 맞는 표현으로 교체했다.
- 공개 사이트와 위젯 설명의 개발자 관점 문구를 사용자 관점 문장으로 바꿨다.
- `hybrid-frame__mock`, `bubbleMock`처럼 프로덕션 CSS/컴포넌트에 남아 있던 mock 명칭을 skeleton/preview 명칭으로 바꿨다.
- 설정과 일부 화면의 불필요한 `Promise.resolve(...)` 래퍼를 제거했다.

## 검증

- `npm run typecheck`
- `npm run check:tauri-boundaries`
- `npm run check:product-rules`
- `rg` 기준 `src`에서 아래 키워드가 남지 않음을 확인했다:
  - `MOCK_FLOW`, `mock`, `Mock`
  - `정현`, `김정현`, `박민수`, `박미연`, `이준호`
  - `계약`, `번역계약서`, `요구사항_초안`
  - `납품`
  - `배포된`, `배포 파일`, `릴리스`
  - `Promise.resolve(`

## 남은 주의

- Storybook 파일에는 컴포넌트 검사용 샘플 데이터가 남아 있다. 제품 화면에 주입되는 데이터가 아니다.
- `workspace-preview-data`는 개발 환경 fallback으로 유지한다. 실제 배포에서는 API 우선 흐름을 따른다.
