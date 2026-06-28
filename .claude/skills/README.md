# 프론트엔드 디자인 스킬

bubli-frontend에서 UI/UX 작업을 할 때 자동으로 참고하는 스킬 모음이다. Claude Code나 에이전트가 이 레포 안에서 작업하면 `.claude/skills/` 아래 스킬이 자동으로 인식된다.

## 설치된 스킬

### frontend-design
출처: anthropics/skills (skills/frontend-design)

새 UI를 만들거나 기존 화면을 다시 잡을 때 쓰는 디자인 방향 가이드다. 템플릿처럼 보이지 않게 팔레트, 타이포그래피, 레이아웃을 의도적으로 고르는 방법을 다룬다. 색·폰트·구조를 "기본값"이 아니라 이 제품에 맞는 선택으로 만들도록 돕는다.

언제 쓰나: 랜딩, 대시보드 같은 화면의 비주얼 방향을 잡을 때. "왜 이 디자인인지"를 먼저 정하고 코드로 옮기고 싶을 때.

### ui-ux-pro-max
출처: nextlevelbuilder/ui-ux-pro-max-skill (v2.6.2, MIT)

검색 가능한 디자인 지식 데이터베이스다. 스타일, 색 팔레트, 폰트 페어링, 제품 유형별 추론 규칙, UX 가이드라인, 차트 유형을 CSV로 담고 있고, 파이썬 스크립트로 조회한다. Next.js, React, Tailwind, shadcn 등 스택별 가이드도 들어 있다.

언제 쓰나: 스타일·색·폰트를 고를 때, 컴포넌트를 만들거나 리팩터링할 때, UI 코드를 점검할 때.

### ui-styling
출처: nextlevelbuilder/ui-ux-pro-max-skill

shadcn/ui + Tailwind로 컴포넌트와 레이아웃을 만드는 가이드다. 다이얼로그, 드롭다운, 폼, 테이블 같은 접근성 좋은 컴포넌트, 다크모드, 반응형 패턴, 테마 커스터마이징을 다룬다. Bubli 스택(shadcn + Tailwind)과 정확히 같다. 캔버스 디자인용 폰트(canvas-fonts)도 포함돼 있어 용량이 크다.

언제 쓰나: 실제 컴포넌트를 코드로 구현하거나 테마·다크모드를 잡을 때.

### design-system
출처: nextlevelbuilder/ui-ux-pro-max-skill

디자인 토큰을 3단계(원시값 → 의미값 → 컴포넌트값)로 나누고 CSS 변수, 간격·타이포 스케일을 체계화한다. CLAUDE.md의 평면 색 토큰을 코드에서 쓰는 토큰 시스템으로 정리할 때 쓴다.

언제 쓰나: 토큰 구조를 잡거나 컴포넌트 스펙을 문서화할 때.

### slides
출처: nextlevelbuilder/ui-ux-pro-max-skill

Chart.js를 쓰는 HTML 발표 자료 생성기다. 파이널 프로젝트 발표덱을 만들 때 참고한다.

언제 쓰나: 발표 자료를 만들 때.

## 사용법 (ui-ux-pro-max)

스크립트는 파이썬 표준 라이브러리만 쓴다. 별도 설치가 필요 없다.

```bash
cd .claude/skills/ui-ux-pro-max/scripts

# 도메인 검색 (style, color, chart, landing, product, ux, typography, icons, react, web, google-fonts)
python3 search.py "glassmorphism" --domain style --max-results 3

# 스택별 가이드
python3 search.py "card" --stack nextjs

# 디자인 시스템 추천 생성
python3 search.py "freelancer dashboard" --design-system --project-name Bubli
```

자세한 동작 기준은 각 스킬 폴더의 `SKILL.md`를 본다.

## Bubli 디자인 토큰 우선

이 스킬들은 일반 디자인 지식을 준다. 실제 색·반경·폰트는 프로젝트 루트 `CLAUDE.md`의 디자인 토큰(워터블루 `#D7EAF4`, 진한색 `#6B8FA8`, Pretendard, Rain Glass 톤)이 먼저다. 스킬이 제안하는 색이 토큰과 충돌하면 토큰을 쓴다. 네온 보라, 쨍한 핑크·주황은 금지다.
