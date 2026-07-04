# 피드백 일괄 개선: UI/UX 전면 개편 + 백엔드 기능 전수 연결

## 작업 내용

디자인 피드백과 기능 QA를 반영해 프론트 전 화면을 개편하고, 백엔드에 있으나 연결되지 않았던 기능을 전수 조사해 연결했다. develop 최신(~#220 및 이후 11커밋)을 두 차례 머지해 팀원 작업을 모두 포함한다.

## 변경 사항

- 네비/셸: 대시보드 아이콘 제거(로고=홈), 일정 최상단, 호버 라벨+활성 바, 프로필 드롭다운(설정/언어/로그아웃), 알림 패널(읽음/보관)
- 로그인/랜딩: 중앙 단일 카드+타이포 계층, 세션 감지 시 "앱으로 이동", 섹션 인디케이터 클릭 이동, /download 페이지
- 홈: dnd 위젯 보드(추가/제거/재배치, 위젯별 룸 선택), 통계 위젯 8종, 수동 타이머 기록 제거
- 일정: 단일 패널 재구축, 구글 캘린더 라이브 표시(/api/calendar/groups, 전체 캘린더+색상 칩), pull calendarIds 전달, 읽기 전용 구글 이벤트
- WBS/칸반: 플랫 테이블 재설계(상위/하위 태그 제거, 들여쓰기 계층), 항목별 진행 표시, 순서 저장, 룸 캘린더 상태 팝오버(신규 백엔드 계약 연동)
- AI 후보함: 모바일 알림함형 단일 피드(카테고리 태그+필터 칩), 승인 결과 태그, evidence JSON 노출 차단, 보류함
- 자료보드: 단일 패널 플랫 재구축, 이름 변경/버전/연관 자료/AI 문서, 로컬 인덱스 검색 이식
- 소통: 룸 채팅을 활성 룸 1개로 스코프, 참여 토큰 노출 제거, 이모지 피커, 초대 링크 생성/수락(/app/invite/[token])
- 설정: 탭 전환 구조, 웹/데스크톱 기능 분리(desktopOnly 패턴), 기본 시작 화면, 회원 탈퇴, 저장공간 NaN 수정
- 전역: 폰트 최소 14px 기준 상향, keep-all 줄바꿈, 다크모드 전면 정비(배경 얼룩 제거, Night Bubble 토큰 통일), 반응형 360/768/1024 재점검, i18n ko/en/ja 7,293키 패리티

## 테스트 방법

1. `npm run dev` 후 라이트/다크 모드 전환하며 홈→일정→프로젝트룸(WBS)→자료보드→소통→AI 후보함→설정 순회
2. 구글 캘린더 연결 후 일정 페이지에서 내 구글 이벤트 라이브 표시 확인, 동기화 팝오버 동작 확인
3. 360/768 뷰포트에서 각 페이지 가로 넘침 없는지 확인
4. `npm run typecheck && npm run check:i18n && npm run check:design-tokens && npm run check:tauri-boundaries && npm run check:product-rules && npm run lint`

## 체크리스트

- [x] typecheck / i18n / design-tokens / tauri-boundaries / product-rules 통과
- [x] ESLint 0 errors
- [x] develop 최신 머지 포함
- [ ] 백엔드 `codex/room-google-calendar-20260704` 머지 후 룸 캘린더 팝오버 동작 확인 필요

## 백엔드 팀 전달 사항

- 자료 버전 업로드: JSON 메타 계약이라 웹 실파일 업로드 불가 (multipart/presigned 필요) — 자료함 담당 팀원 확인
- `GET /api/widget/items/states` 프론트 호출에 대응 매핑 없음
- 받은 초대 목록(`GET /api/me/invitations`) 부재 재확인 → 초대 링크 방식으로 대체함
- `VoiceParticipantResponse`에 micStatus 없음 재확인 → 본인 로컬 상태만 표시
