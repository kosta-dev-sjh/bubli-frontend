# 🌿 Bubli Git 협업 규칙

> KOSTA Final Project Team · Hae Maeil  
> 백엔드: `bubli-backend` (Java/Spring Boot) · 프론트: `bubli-frontend` (Tauri + React)

---

## 📁 레포지토리 구조

| 레포 | 역할 |
|------|------|
| `bubli-backend` | Spring Boot API, AI 에이전트, DB 연동 |
| `bubli-frontend` | Tauri 데스크탑 앱 (React 웹뷰) |

---

## 🌱 브랜치 구조

```
main      ← 배포 브랜치 (EC2에 실제로 나가는 코드)
develop   ← 기능 통합 브랜치 (다음 배포 전까지 여기서 합침)
feature/기능명   ← 개인 기능 개발
fix/버그명        ← 버그 수정
chore/작업명      ← 설정, 문서, 빌드 등 코드 외 작업
```

---

## ✏️ 브랜치 이름 규칙

작업 시작 전 **반드시 `develop`에서 브랜치를 딸 것**

```bash
git switch develop
git pull origin develop
git switch -c feature/기능명
```

### 브랜치명 예시

| 유형 | 예시 |
|------|------|
| 기능 개발 | `feature/auth-jwt` |
| 기능 개발 | `feature/voice-chat-livekit` |
| 버그 수정 | `fix/oracle-db-connection` |
| 설정/문서 | `chore/ci-pipeline-setup` |
| 설정/문서 | `chore/gitignore-update` |

---

## 📝 커밋 메시지 규칙

```
타입: 작업 내용 요약
```

| 타입 | 사용 상황 |
|------|-----------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 코드 리팩토링 |
| `chore` | 설정, 빌드, 문서 작업 |
| `style` | 포맷, 공백 등 코드 의미 변경 없는 수정 |
| `test` | 테스트 코드 추가/수정 |

### 커밋 예시

```
feat: JWT 로그인 API 구현
fix: Oracle DB 연결 오류 수정
chore: .gitignore application-secret.yml 추가
refactor: UserService 의존성 주입 방식 변경
```

---

## 🔀 PR(Pull Request) 규칙

### 기본 원칙
- `main`, `develop`에 **직접 push 금지** — 반드시 PR로만
- PR 올리면 **팀원 1명 이상 리뷰 후** 머지
- 머지 방식은 **Squash merge만 사용**

### PR 흐름

```
feature/기능명 → develop   (기능 완성 시)
develop → main             (스프린트/마일스톤 완료 시, 배포 타이밍)
```

### PR 제목 규칙

```
[feat] JWT 로그인 API 구현
[fix] Oracle DB 연결 오류 수정
[chore] .gitignore 업데이트
```

---

## 🚫 주의사항

- `application-secret.yml`, `.env` 파일 **절대 커밋 금지**
- 커밋 전 `.gitignore` 확인 필수
- 작업 전 항상 `git pull origin develop` 먼저

---

## 🚀 배포 흐름

```
develop → main PR 머지
    ↓
GitHub Actions 자동 실행
    ↓
Docker 빌드 → AWS EC2 배포
```
