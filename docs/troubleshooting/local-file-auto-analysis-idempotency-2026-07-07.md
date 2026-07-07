# 로컬 파일 자동 분석 중복 Job 생성 트러블슈팅 2026-07-07

## 증상

- 개인 관리 폴더에서 임시 파일이 서버 자료로 동기화된 뒤, 같은 파일 분석 알림이 특정 사용자에게 대량으로 쌓였다.
- 당시 화면에서는 `agent_jobs` 재시도 제한이 3회로 보였지만, 실제로는 자료 분석 요청이 계속 이어졌다.
- 문서 다운로드와 문서 초안 Markdown 다운로드도 함께 점검 대상이 됐다.

## 영향

- 같은 로컬 파일에 대해 `ANALYZE_RESOURCE` Job이 반복 생성될 수 있었다.
- Job 단위 성공/실패 알림이 매번 생성되어 사용자 알림함이 과도하게 늘어났다.
- 서버의 AWS/S3 권한 오류나 에이전트 실패가 있으면 실패 Job과 실패 알림이 더 빠르게 누적될 수 있었다.

## 원인

프론트의 로컬 파일 자동 동기화는 관리 폴더 이벤트를 서버에 반영한 뒤 분석 가능한 파일을 자동 분석 요청으로 보냈다.

백엔드에는 Job 내부 재시도 제한이 있었지만, `POST /api/local-file-analyses` 요청 자체는 멱등하지 않았다. 따라서 같은 사용자, 같은 자료, 같은 checksum 또는 localFileId, 같은 추출 방식으로 다시 요청해도 기존 Job을 재사용하지 않고 새 `agent_jobs` row를 만들 수 있었다.

결과적으로 기존 Job이 3회 실패 후 멈춰도, 다음 자동 동기화 요청이 들어오면 retryCount가 0인 새 Job이 만들어졌다. 알림은 Job ID 기준으로 생성되므로 같은 파일이어도 새 Job마다 알림이 추가됐다.

## 임시 차단

프론트 PR #472에서 로컬 파일 자동 분석을 일시 중단했다.

- 관리 폴더 이벤트 서버 동기화는 유지했다.
- 동기화 시점의 자동 분석 요청과 자동 backfill 드레인은 제거했다.
- 자료 상세에서 사용자가 직접 누르는 개인 로컬 파일 분석 액션은 유지했다.

이 조치로 더 이상의 자동 Job 증식은 멈췄지만, 자동 분석 경험은 일시적으로 약해졌다.

## 근본 조치

백엔드 PR #277에서 로컬 파일 분석 요청에 멱등성을 추가했다.

- `agent_jobs.idempotency_key` 컬럼을 추가했다.
- `idempotency_key IS NOT NULL` 조건의 unique index를 추가했다.
- 로컬 파일 분석 요청은 `LOCAL_FILE_ANALYSIS:{hash}` 형태의 안정적인 key를 만든다.
- key 구성 기준은 사용자, resourceId, checksum 또는 localFileId, extractionMethod, analysisVersion이다.
- 같은 key의 기존 Job이 있으면 `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED` 상태와 관계없이 새 Job을 만들지 않고 기존 Job을 반환한다.
- 동시 요청으로 unique 충돌이 나도 기존 Job을 다시 조회해 반환한다.

이후 같은 파일이 자동 동기화로 다시 들어와도 새 `agent_jobs`가 반복 생성되지 않는다.

## 프론트 복구

백엔드 PR #277이 `develop`에 머지되고 CI가 통과한 뒤, 프론트에서는 자동 분석을 다시 켤 수 있다.

복구 조건은 아래와 같다.

- 관리 폴더 이벤트 동기화 후 `SYNCED`된 파일만 분석 후보로 본다.
- 삭제 이벤트는 분석하지 않는다.
- 지원 확장자 목록에 포함된 파일만 분석한다.
- 자동 backfill은 첫 실행 3건, 이후 1건씩만 처리한다.
- 로컬 SQLite의 `maxAttempts: 3` 제한은 유지한다.
- 서버는 `idempotency_key`로 같은 분석 요청을 한 번만 Job으로 만든다.

## 다운로드 점검

같은 백엔드 PR #277과 프론트 PR #469에서 다운로드 흐름도 함께 보강됐다.

- 자료 다운로드는 서버의 `downloadUrl` 또는 `url` 응답을 받아 절대 URL로 열도록 정리됐다.
- 생성 문서 Markdown export는 `/api/generated-documents/{id}/export` 응답 Blob과 `Content-Disposition` filename을 사용한다.
- 문서 초안 본문은 `contentMarkdown`, `markdown`, `draftMarkdown`, nested `document.contentMarkdown`, nested `draft.contentMarkdown`, `content`, `description` 순서로 fallback한다.
- 빈 본문으로 생성되는 경우는 백엔드에서 `AGENT_400_001`로 거절하고, export 시에도 저장 본문과 metadata fallback을 확인한다.

## 재발 방지 기준

- 자동 작업은 프론트 로컬 retry 제한만 믿지 않는다.
- 서버에서 사용자와 대상 자료 기준의 idempotency key를 가진다.
- Job ID 단위 알림은 대량 자동 작업에 그대로 쓰지 않는다. 필요하면 파일 또는 배치 기준으로 집계한다.
- 서버 권한 오류처럼 시스템성 실패는 retry와 알림 폭주로 이어지지 않도록 별도 회로 차단 기준을 둔다.
- 자동 분석을 다시 켤 때는 같은 파일을 여러 번 넣어도 `agent_jobs` row가 늘지 않는지 확인한다.
