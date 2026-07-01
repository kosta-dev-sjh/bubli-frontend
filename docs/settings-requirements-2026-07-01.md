# 회원앱 설정 화면 요구사항 (2026-07-01)

## 기준

설정 화면은 소개 페이지가 아니라 회원이 실제 작업 환경을 조정하는 곳이다. 계정, 표시, 알림, 동의, 로컬 앱, 데스크탑 버블, 외부 캘린더 연결 상태를 한 화면에서 확인하고 바로 조작할 수 있어야 한다.

## 화면 원칙

- 큰 설명 카드, 의미 없는 새로고침 버튼, 랜딩식 문구를 두지 않는다.
- 서버 연결 실패, 로그인 필요, 브라우저 실행, Tauri 앱 실행 상태를 서로 다르게 보여준다.
- 직접 조작 가능한 설정 행을 중심으로 구성한다.
- 데이터가 아직 없으면 "현재 데이터가 없습니다" 또는 "앱에서 사용 가능"처럼 조용하게 표시한다.
- `localStorage`를 직접 쓰지 않는다. 서버 API 또는 Tauri IPC wrapper를 통해 상태를 읽고 저장한다.

## 섹션별 요구사항

### 계정

- 구글 로그인 사용자 이름, 이메일, 프로필 이미지 상태를 보여준다.
- 표시 이름, 언어, 시간대처럼 서버에 저장되는 사용자 기본값을 수정할 수 있어야 한다.
- 로그아웃은 명확한 단일 버튼으로 제공한다.

### 표시

- 언어는 한국어, 영어, 일본어를 선택할 수 있어야 한다.
- 테마 전환은 기존 `ThemeToggle`을 사용한다.
- 표시 밀도는 API가 확정되기 전까지 별도 저장 기능을 만들지 않는다.

### 알림

- 기존 알림 설정 API를 사용한다.
- 작업, 일정, 소통, 데스크탑 버블 알림을 각각 켜고 끌 수 있어야 한다.
- 저장 실패 시 이전 화면 상태를 유지하고 오류 메시지를 남긴다.

### 개인정보와 동의

- 활동 감지 동의와 창 제목 수집 동의 상태를 보여준다.
- 활동 감지는 동의가 켜진 경우에만 앱 이름과 창 제목 수준의 맥락을 다룬다.
- 화면 내용, 키 입력, 문서 전체 내용 수집 기능으로 확장하지 않는다.

### 로컬 앱

- 현재 실행 환경이 브라우저인지 Tauri 앱인지 표시한다.
- Tauri 앱에서는 SQLite 무결성 확인, 백업, 복구를 실행할 수 있어야 한다.
- 개인 폴더는 업로드가 아니라 로컬 폴더 선택, 스캔, 검색, 감시로 관리한다.
- 브라우저에서는 같은 기능을 "앱에서 사용 가능"으로 안내한다.

### 데스크탑 버블

- 기존 버블 설정 API와 Tauri sync wrapper를 사용한다.
- 버블별 표시 여부, 오늘 사용량, 동기화 대기 상태를 보여준다.
- 타이머 복구는 Tauri 로컬 상태가 있을 때만 의미가 있다.

### 외부 연동

- Google Calendar 연결 상태와 재연결 진입점을 설정에서 확인할 수 있어야 한다.
- 실제 일정 원본은 Bubli 서버의 일정 API를 기준으로 두고, Google Calendar는 외부 캘린더 연결 대상으로 표시한다.
- 설정 화면에서는 새 캘린더 API 경로를 만들지 않고 기존 `calendarApi.getGoogleConnectUrl`만 사용한다.
- 연결 상태를 세분화하는 서버 API가 생기기 전까지는 "연결 준비" 또는 "서버 연결 대기"처럼 현재 확인 가능한 상태만 표시한다.

## 연결 기준

| 영역 | 현재 연결 |
| --- | --- |
| 계정 | `authApi.getMe`, `authApi.updateMe`, `authApi.logout` |
| 알림 | `settingsApi.getNotificationPreferences`, `settingsApi.updateNotificationPreferences` |
| 동의 | `settingsApi.getPrivacyConsents`, `settingsApi.updatePrivacyConsents`, `readCurrentActivityContext` |
| 로컬 폴더 | `settingsApi.getManagedFolders`, `settingsApi.createManagedFolder`, `selectPersonalManagedFolder`, `scanPersonalManagedFolder`, `searchPersonalLocalFiles`, `watchPersonalManagedFolder` |
| SQLite | `checkLocalSqliteIntegrity`, `backupLocalSqlite`, `restoreLocalSqliteBackup`, `recoverLocalTimerState` |
| 저장소 | `settingsApi.getStorageUsage` |
| 버블 | `widgetApi.getBubbles`, `widgetApi.updateBubbles`, `widgetApi.getTodayUsageRollups`, `stageWidgetUsageSummary` |
| 외부 캘린더 | `calendarApi.getGoogleConnectUrl` |

## 남은 Gap

- 표시 밀도 저장 API가 아직 없다.
- 창 제목 수집은 개인정보 동의 API에 연결했지만, 더 세분화된 동의 항목이 필요하면 백엔드 필드가 추가돼야 한다.
- Tauri 폴더 선택, 파일 감시, SQLite 백업/복구는 실제 데스크탑 앱 런타임에서 추가 검증이 필요하다.
- 버블 사용량 동기화는 로컬 대기열 상태를 볼 수 있지만, 서버 전송 성공 상태는 백엔드 동기화 완료 이벤트가 붙어야 확정할 수 있다.
- Google Calendar의 실제 연결 여부를 읽는 서버 상태 API가 아직 없다. 현재 설정 화면은 연결 또는 재연결 진입점만 제공한다.
