# 🌿 Bubli Git 협업 규칙

> KOSTA AI Java DevOps 파이널 프로젝트 · 해 매일
> 백엔드: `bubli-backend` (Java/Spring Boot) · 프론트: `bubli-frontend` (Next.js + Tauri)

---

## 📁 레포지토리 구조

| 레포 | 역할 |
|------|------|
| `bubli-backend` | Spring Boot API, AI 에이전트, DB 연동 |
| `bubli-frontend` | Tauri 데스크탑 앱 (Next.js 웹뷰) |

---

## 💻 최초 1회, 로컬 환경 설정

Mac/Windows 혼용 팀이라 **반드시** 아래 설정을 먼저 해야 함. 안 하면 코드 내용은 그대로인데 줄바꿈 문자(LF/CRLF) 차이로 모든 줄이 변경된 것처럼 보여서 PR마다 불필요한 충돌이 남.

```bash
git config --global core.autocrlf input
```

레포에는 `.gitattributes`가 적용되어 있어 줄바꿈을 자동으로 LF로 통일함. 이미 클론해둔 사람은 한 번만 아래 실행:

```bash
git rm -rf --cached .
git reset --hard
```

---

## 🌱 브랜치 구조

```
main      ← 배포 브랜치 (EC2에 실제로 나가는 코드)
develop   ← 기능 통합 브랜치 (다음 배포 전까지 여기서 합침)
feature/기능명   ← 개인 기능 개발
fix/버그명        ← 버그 수정
chore/작업명      ← 설정, 문서, 빌드 등 코드 외 작업
```

## ✏️ 브랜치 이름 규칙

작업 시작 전 **반드시 `develop`에서 브랜치를 딸 것**

```bash
git switch develop
git pull origin develop
git switch -c feature/기능명
```

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
| `chore` | 설정, 빌드, 문서 등 그 외 작업 |

```
feat: JWT 로그인 API 구현
fix: Oracle DB 연결 오류 수정
chore: .gitignore application-secret.yml 추가
```

---

## 🐛✨ Issue 사용법

작업을 시작하기 전, 단위 작업은 **Issue로 먼저 등록**한다. (사소한 오타 수정 등은 생략 가능)

### Issue 만드는 법

레포 **Issues 탭 → New issue** → 템플릿 2종 중 선택:

| 템플릿 | 용도 |
|------|------|
| 🐛 버그 리포트 | 동작 오류, 예상과 다른 결과를 발견했을 때 |
| ✨ 기능 요청 | 새로운 기능을 제안하거나 작업 단위를 정의할 때 |

### 흐름

1. 작업 시작 전 Issue 생성 (없으면 먼저 만들기)
2. Issue 번호 확인 (예: `#12`)
3. 브랜치 작업 시작
4. PR 본문에 `Closes #12` 작성 → 머지되면 Issue 자동 닫힘

### Project 보드 연동

Org의 **`Bubli 개발 보드`** 에서 Issue를 카드로 추가해 진행 상황(Todo / In Progress / Done)을 관리한다. Issue 생성 후 보드에서 `+` → `#이슈번호`로 검색해 추가.

---

## 🔀 Pull Request 규칙

### 보호 설정 (Ruleset 기준)

| 브랜치 | PR 필수 | 승인 필요 인원 | 직접 push |
|------|------|------|------|
| `main` | ✅ | 1명 이상 | ❌ 불가 |
| `develop` | ✅ | 1명 이상 | ❌ 불가 |

`develop`, `main` 모두 PR을 열고 팀원 1명 이상의 승인을 받아야 머지할 수 있다.

### PR 흐름

```
feature/기능명 → develop   (기능 완성 시, 팀원 1명 승인 후 머지)
develop → main             (스프린트/마일스톤 완료 시, 팀원 1명 승인 후 배포)
```

### PR 작성

PR을 열면 템플릿이 자동으로 채워짐:

```markdown
## 작업 내용
## 변경 사항
## 테스트 방법
## 체크리스트
```

각 항목 채우고, 관련 Issue가 있으면 본문에 `Closes #이슈번호` 추가.

### PR 제목 규칙

```
[feat] JWT 로그인 API 구현
[fix] Oracle DB 연결 오류 수정
[chore] .gitignore 업데이트
```

### 머지 방식

**Squash merge만 사용** (다른 방식은 막혀있음). feature 브랜치의 잡다한 커밋들이 `develop`/`main`에는 PR당 깔끔한 커밋 1개로 합쳐져 들어감. 머지 후 원본 브랜치는 자동 삭제됨.

---

## 🚫 주의사항

- `application-secret.yml`, `.env` 파일 **절대 커밋 금지** (`.gitignore`에 이미 등록됨)
- 커밋 전 `.gitignore` 확인 필수
- 작업 전 항상 `git pull origin develop` 먼저
- `main`, `develop`에 직접 push 시도 시 GitHub가 자동으로 막음 (Ruleset 적용됨)

---

## 🚀 배포 흐름

```
develop → main PR 머지 (팀원 1명 승인 필요)
    ↓
GitHub Actions 자동 실행
    ↓
Docker 빌드 → AWS EC2 배포
```
