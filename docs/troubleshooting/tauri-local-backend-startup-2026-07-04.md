# Tauri 로컬 백엔드 실행 오류 정리 (2026-07-04)

## 증상

맥에서 `npm run tauri:dev:backend` 실행 시 Tauri 창이 뜨기 전에 멈췄다.

실패 지점은 Rust 빌드가 아니라 사전 백엔드 smoke 확인이었다.

```text
/api/widget/summary returned HTTP 500
```

## 원인

로컬 Postgres에 남아 있던 기존 일정 데이터가 최신 백엔드 enum과 맞지 않았다.

- 기존 로컬 값: `schedules.sync_status = 'PENDING'`
- 최신 백엔드 허용 값: `LOCAL_ONLY`, `SYNCED`, `SYNC_FAILED`

프론트의 Tauri 개발 시드 스크립트는 일정 row를 만들 때 `LOCAL_ONLY`를 넣고 있었지만, 이미 같은 id의 row가 있으면 `ON CONFLICT`에서 `sync_status`를 갱신하지 않았다. 그래서 오래된 `PENDING` 값이 남아 `/api/widget/summary` 조회 중 enum 변환 오류가 났다.

## 수정

`scripts/dev-widget-real-backend.mjs`의 로컬 시드 SQL에 두 가지 보정을 넣었다.

1. 기존 로컬 DB의 `PENDING` 일정 상태를 `LOCAL_ONLY`로 정리한다.
2. seed 일정이 이미 있을 때도 `sync_status`, `last_synced_at`을 최신 값으로 덮어쓴다.

추가로 develop rebase 뒤 `src-tauri/src/lib.rs`에 `normalize_main_window_route` 이름이 두 번 생겨 Rust 컴파일이 깨졌다. 위젯 메뉴 전용 helper를 `normalize_widget_menu_route`로 분리해 충돌을 없앴다.

## 검증

아래 상태까지 확인했다.

- 백엔드 `origin/develop` 기준 bootRun 성공
- `npm run tauri:dev:backend` 백엔드 smoke 통과
- Rust/Tauri 컴파일 통과
- Next dev server `http://localhost:3000` 기동
- `/app` HTTP 200
- `/desktop-widget?bubble=bar...` HTTP 200

## 재발 시 확인 순서

1. `localhost:8080` 백엔드가 떠 있는지 확인한다.
2. `npm run tauri:dev:backend` 로그에서 실패한 API를 확인한다.
3. `/api/widget/summary`가 500이면 로컬 DB 일정 상태를 확인한다.

```sql
select sync_status, count(*)
from schedules
group by sync_status;
```

`PENDING`이 있으면 아래처럼 정리한다.

```sql
update schedules
set sync_status = 'LOCAL_ONLY',
    updated_at = now()
where sync_status = 'PENDING';
```
