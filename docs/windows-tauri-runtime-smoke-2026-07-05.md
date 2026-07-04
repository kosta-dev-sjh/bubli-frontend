# Windows Tauri Runtime Smoke Evidence - 2026-07-05

## 기준 커밋

- Frontend base: `a86ed5d0`
- Backend base: `eb646b4`
- Branch: `codex/tauri-runtime-smoke-server-context-isolation`

## 변경 목적

- Windows Tauri runtime smoke가 기존 AppShell active-room restore 경로를 통해 `/api/widget/context`에 예전 프로젝트룸을 반영하지 않도록 smoke env에서 server mirror를 격리했다.
- 실제 백엔드 seed 일정이 UTC 날짜 경계에서 widget summary 밖으로 밀려 smoke가 실패하지 않도록 seed schedule 시간을 현재 UTC day 안으로 고정했다.
- 활동 감지는 synthetic record만 남기지 않고 `readActivityContext`로 실제 Windows foreground window/app capture를 검증한 뒤 그 값을 SQLite stage에 기록한다.
- README의 SQLite 백업 설명을 현재 구현과 맞게 평문 `.sqlite3` 백업으로 정정했다.

## 실행 증거

### Real backend seed

Command:

```powershell
node scripts/dev-widget-real-backend.mjs seed
```

Result:

- `/api/widget/summary`
- `/api/widget/settings`
- `/api/widget/context`
- `/api/widget/items/{id}/state`
- `/api/widget/items/states`
- `/api/me/privacy-consents`
- `/api/chat/rooms`, message send/read
- `/api/voice/rooms`, token/mic/leave
- `/api/time-logs/start`, heartbeat, pause, resume, stop
- `/api/dashboard/work`
- `/api/widget/usage-summaries`
- `/api/local-file-events/sync` for `CREATED/UPDATED/DELETED`
- `/api/local-file-analyses`
- `/api/activity/current-app`, `/api/activity/today`, `DELETE /api/activity/{id}`
- `/api/daily-summaries`
- `/api/generated-documents/{id}/export`
- `/api/project-rooms/{roomId}/memory-summaries`

All passed against `http://localhost:8080`.

### Windows Tauri runtime smoke

Command:

```powershell
npm run check:tauri-windows-runtime-smoke
```

Result: passed.

Important report excerpts:

- Opened native widget windows: `bar`, `todo`, `chat`, `timer`
- `todo.selectedRoomId`: `22222222-2222-4222-8222-222222222222`
- SQLite quick_check: `ok`, journal mode: `wal`
- Native foreground activity captured: `appName = bubli`, `windowTitle = Bubli`
- Activity record staged from SQLite with the captured app/window values
- Widget usage rollup created
- Managed folder scan/search/preview/event staging passed for a temp folder
- Widget windows cleaned up at the end

No `server-widget-context` 403 log appeared in the successful run after the smoke server-mirror guard.

## 남은 미검증

- Windows runtime smoke still verifies local file scan/search/preview/staging for a created temp file, but it does not yet prove live watcher `UPDATED`/`DELETED` events from `watchManagedFolder`.
- SQLite backup/restore has Rust unit coverage and runtime integrity smoke, but the Windows smoke does not yet perform an isolated backup, queued restore, restart, and restored-data assertion.
- Full local outbox server transfer is covered by backend seed API smoke and frontend sync code, but the Windows runtime smoke still stops at local staging/rollup evidence rather than asserting every local pending row becomes `SYNCED`.

## CSV 정책

`docs/기능_API연결_명세_2026-07-01.csv` is intentionally ignored and was updated locally with this evidence. Do not commit the CSV or workbook artifacts.
