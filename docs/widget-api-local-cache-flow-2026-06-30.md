# 위젯 API와 로컬 캐시 연결 흐름

이 문서는 UI 연결 전 단계의 non-UI 기준이다. 화면, CSS, Tauri Rust 코드는 바꾸지 않고, 위젯 데이터가 서버 API와 로컬 SQLite 캐시 사이에서 어떻게 이어질지만 정리한다.

## 기준 API

- `GET /api/widget/summary`: 현재 위젯 컨텍스트와 버블별 표시 데이터 조회
- `GET /api/widget/settings`: 버블 켜짐, 위치, 크기, 표시 옵션 조회
- `PATCH /api/widget/settings`: 버블 설정 저장
- `GET /api/widget/context`: 위젯 전체가 바라보는 프로젝트룸 조회
- `PATCH /api/widget/context`: 위젯 전체 프로젝트룸 컨텍스트 저장
- `PATCH /api/widget/items/{id}/state`: 버블 항목 확인, 숨김, 고정, 다시 보기 상태 저장
- `POST /api/widget/usage-summaries`: Tauri 로컬 집계를 서버 날짜별 집계로 반영
- `GET /api/widget/usage-summaries/today`: 오늘 위젯 사용 집계 조회

## Summary 읽기

`src/lib/widget/readWidgetSummary`는 UI가 아니라 데이터 연결 준비용 함수다.

1. Tauri 런타임이고 로컬 summary reader가 주입되면 로컬 캐시를 먼저 읽는다.
2. 로컬 캐시가 비어 있거나 reader가 아직 없으면 `/api/widget/summary`로 fallback한다.
3. 브라우저와 SSR에서는 로컬 SQLite를 직접 읽지 않는다.
4. 서버 API도 실패하면 `status: "failed"`로 반환한다.

현재 프론트에는 로컬 summary 전용 Tauri 명령이 없다. 그래서 `readLocalSummary`는 주입형으로 두었다. Rust 쪽에 `local_widget_display_cache` reader가 생기면 이 함수에 연결하면 된다.

## 항목 상태와 사용 이벤트

- `saveWidgetItemState`: 서버 API로 항목 상태를 저장한다.
- `recordLocalWidgetUsageEvent`: Tauri 로컬 SQLite에 상세 사용 이벤트를 남긴다.
- `recordApiWidgetUsageEvent`: 서버 API 타입의 버블 이름을 Tauri 로컬 이름으로 바꿔 상세 사용 이벤트를 남긴다.
- `rollupLocalWidgetUsage`: 로컬 상세 이벤트를 날짜별, 버블별 집계로 압축한다.
- `stageLocalWidgetUsageSummary`: 로컬 집계를 동기화 대기열에 올린다.
- `syncWidgetUsageRollupsToServer`: 승인된 서버 전송 단계에서 `/api/widget/usage-summaries`로 보낸다.

상세 사용 이벤트는 기기 안에 둔다. 서버에는 날짜별, 기기별, 버블별 집계만 보낸다.

## 보존해야 하는 버블 타입

위젯 타입은 8개를 유지한다.

`todo`, `schedule`, `timer`, `memo`, `chat`, `agent`, `resource`, `alert`

서버 API 타입은 대문자 값을 쓴다.

`TODO`, `SCHEDULE`, `TIMER`, `MEMO`, `CHAT`, `AGENT`, `RESOURCE`, `ALERT`

## 다음 UI 연결 위치

- 데스크탑 위젯 창: `src/app/desktop-widget/page.tsx`
- 회원 앱 위젯 설정/미리보기: `src/app/(workspace)/app/desktop/widgets/page.tsx`
- 위젯 API wrapper: `src/features/widget/api/widgetApi.ts`

이번 단계에서는 위 파일들을 연결하지 않는다.
