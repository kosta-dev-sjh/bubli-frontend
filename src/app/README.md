# app 라우트

Next.js App Router 화면을 둔다.

| 라우트 그룹 | 역할 |
|---|---|
| `(public)` | 비회원 공개 사이트. 실제 URL은 `/`, `/features`, `/download`, `/faq` |
| `(auth)` | 구글 OAuth 로그인과 시작 진입. 실제 URL은 `/login`, `/signup` |
| `(workspace)/app` | 로그인 후 회원 앱. 실제 URL은 `/app` 아래 |

회원 앱은 브라우저와 Tauri WebView에서 같은 `/app` 화면을 사용한다.
Tauri 전용 소통 창은 `/app/desktop/communication` 아래에 둔다.
