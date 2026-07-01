# WBS 작업판 요구사항 2026-07-01

## 기준

회원 웹 앱의 프로젝트룸 작업판은 소개 화면이 아니다. 사용자가 선택한 프로젝트룸 안에서 확정된 WBS와 TODO를 실제로 관리하는 화면이다.

## 화면 책임

- `/app/project-rooms/{roomId}/work`는 프로젝트룸에 귀속된다.
- 프로젝트룸을 선택하면 해당 룸의 WBS, TODO, 일정 연결 상태만 보여준다.
- WBS, 칸반, 후보는 한 화면에 억지로 몰아넣지 않고 보기 전환으로 제공한다.
- 에이전트가 만든 항목은 `후보` 보기에서 따로 다룬다. 사용자가 승인하기 전에는 실제 WBS/TODO가 아니다.

## WBS 보기

- WBS는 트리 구조로 보여준다.
- 부모 WBS와 하위 WBS의 관계가 보이게 들여쓰기한다.
- 선택한 WBS의 연결 TODO, 기한, 하위 작업 수를 보여준다.
- 상위 WBS를 선택하면 하위 WBS에 연결된 TODO도 함께 보여준다.
- 빈 상태는 "현재 데이터가 없습니다"로만 표시한다.

## 칸반 보기

- 칸반은 TODO 상태를 기준으로 보여준다.
- 상태는 `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, `BLOCKED`를 따른다.
- `BLOCKED`는 검토 칼럼에서 함께 다룬다.
- 카드는 드래그해서 상태를 바꿀 수 있어야 한다.
- 카드 제목이 세로로 찢어지거나 좁게 접히면 안 된다.
- 화면에서 뺄 때도 드래그 제거 영역을 지원한다.

## 후보 보기

- 후보는 실제 작업판 옆에 항상 붙어 있는 보조 카드가 아니다.
- 후보 보기에서만 따로 확인하고, 승인 후 WBS 또는 TODO로 반영한다.
- 후보 목록은 `후보 관리` 화면으로 이어진다.

## API 기준

- WBS/작업판 데이터: `GET /api/project-rooms/{roomId}/wbs-board`
- WBS 목록: `GET /api/project-rooms/{roomId}/wbs-items`
- WBS 생성: `POST /api/project-rooms/{roomId}/wbs-items`
- WBS 순서 변경: `PATCH /api/project-rooms/{roomId}/wbs-items/reorder`
- WBS 수정: `PATCH /api/wbs-items/{id}`
- WBS 삭제: `DELETE /api/wbs-items/{id}`
- 프로젝트룸 TODO: `GET /api/project-rooms/{roomId}/tasks`
- 후보 승인: `PATCH /api/agent/suggestions/{id}`

## 금지

- WBS, 칸반, 후보를 3열 보드처럼 동시에 눌러 담지 않는다.
- 후보를 실제 작업처럼 표시하지 않는다.
- "둘러보기", "소개", "시작하기" 같은 랜딩 문구를 넣지 않는다.
- 사용자에게 새로고침을 주요 행동처럼 요구하지 않는다.
- 기획에서 삭제된 받을돈/페이 위젯 흐름을 작업판에 되살리지 않는다.
