# Visual QA 실행 가이드

이 폴더는 Storybook 기반 시각 QA 결과를 모으는 곳이다.

현재 맥 로컬 환경에서는 자동 캡처가 정상 동작한다. 클로드가 이 레포에서 시각 QA가 필요하면 아래 명령만 실행하면 된다.

```bash
cd "04_개발_작업공간/repos/bubli-frontend"
npm run visual:qa
```

## 최초 준비

처음 실행하는 환경이면 한 번만 설치한다.

```bash
npm install
npx playwright install chromium
```

리눅스 CI처럼 시스템 브라우저 라이브러리가 없는 환경에서는 아래처럼 실행한다.

```bash
npx playwright install --with-deps chromium
npm run visual:qa
```

## 실행 결과

- 자동 리포트: `docs/visual-qa/visual-qa-report.md`
- 스크린샷: `docs/visual-qa/screenshots/`

현재 자동 캡처 대상은 `scripts/visual-qa.mjs`의 `TARGETS`에 모여 있다. 스토리 URL은 직접 추측하지 않고, Storybook 정적 빌드의 `index.json`에서 story id를 찾아 캡처한다.

빠른 재실행이 필요하면 정적 빌드를 재사용할 수 있다.

```bash
SKIP_BUILD=1 npm run visual:qa
```

타입체크를 잠시 빼고 캡처만 다시 볼 때는 아래처럼 실행한다.

```bash
SKIP_TSC=1 npm run visual:qa
```

## 실제 라우트 스냅샷

`visual:qa`는 Storybook 16컷에 더해, 실제 Next 라우트도 캡처한다. 내부에서 `next dev`를 `NEXT_PUBLIC_BUBLI_NEW_DASHBOARD=true`로 잠깐 띄워 `/app`(DashboardView)을 찍는다.

- `route-dashboard-light.png`
- `route-dashboard-dark.png` (Playwright colorScheme=dark → ThemeProvider가 data-theme=dark 적용)

라우트 캡처가 느리거나 필요 없으면 생략할 수 있다.

```bash
SKIP_ROUTES=1 npm run visual:qa
```

실제 앱에서 새 대시보드를 보려면 `.env.local`에 `NEXT_PUBLIC_BUBLI_NEW_DASHBOARD=true`를 넣는다. 기본은 false라 기존 화면이 그대로 뜬다.
