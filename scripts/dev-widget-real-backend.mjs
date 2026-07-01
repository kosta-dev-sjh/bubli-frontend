import { createHmac, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const COMMAND = process.argv[2] ?? "seed";
const API_BASE_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080");
const JWT_SECRET = process.env.JWT_SECRET ?? "local-development-jwt-secret-key-32-bytes-minimum";
const ACCESS_TOKEN_EXPIRE_SECONDS = Number(process.env.BUBLI_DEV_ACCESS_TOKEN_EXPIRE_SECONDS ?? 60 * 60);

const DOCKER_CONTAINER = process.env.BUBLI_DEV_POSTGRES_CONTAINER ?? "bubli-postgres";
const POSTGRES_USER = process.env.BUBLI_DEV_POSTGRES_USER ?? "bubli";
const POSTGRES_DB = process.env.BUBLI_DEV_POSTGRES_DB ?? "bubli";

const SEED_USER_ID = "11111111-1111-4111-8111-111111111111";
const SEED_ROOM_ID = "22222222-2222-4222-8222-222222222222";

if (!["seed", "token", "tauri"].includes(COMMAND)) {
  console.error("Usage: node scripts/dev-widget-real-backend.mjs [seed|token|tauri]");
  process.exit(1);
}

const token = createLocalAccessToken(SEED_USER_ID);

if (COMMAND === "token") {
  process.stdout.write(token);
  process.exit(0);
}

seedPostgres();
await smokeBackend(token);

if (COMMAND === "tauri") {
  await runTauriDev(token);
} else {
  console.log("\nReal backend widget seed is ready.");
  console.log("Use this token for local widget/Tauri dev:");
  console.log(maskToken(token));
  console.log("\nPowerShell:");
  console.log(`$env:NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN = (node scripts/dev-widget-real-backend.mjs token)`);
  console.log(`$env:NEXT_PUBLIC_API_BASE_URL = "${API_BASE_URL}"`);
  console.log("npm run tauri:dev");
}

function seedPostgres() {
  console.log(`Seeding ${DOCKER_CONTAINER}/${POSTGRES_DB} for user ${SEED_USER_ID}...`);

  const result = spawnSync(
    "docker",
    ["exec", "-i", DOCKER_CONTAINER, "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB],
    {
      encoding: "utf8",
      env: withDockerPath(process.env),
      input: buildSeedSql(),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  if (result.error) {
    throw new Error(`Could not run docker. ${result.error.message}`);
  }

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`PostgreSQL seed failed with exit code ${result.status}.`);
  }

  console.log("Seed rows are present.");
}

async function smokeBackend(accessToken) {
  console.log(`Checking backend API at ${API_BASE_URL}...`);

  const headers = { Authorization: `Bearer ${accessToken}` };
  const [summary, settings, dashboard] = await Promise.all([
    apiGet("/api/widget/summary", headers),
    apiGet("/api/widget/settings", headers),
    apiGet("/api/dashboard/work", headers),
  ]);

  const taskTitles = summary.tasks?.map((task) => task.title) ?? [];
  const scheduleTitles = summary.schedules?.map((schedule) => schedule.title) ?? [];
  const agentSummaries = summary.agentSuggestionSummary ?? [];

  assert(summary.context?.selectedRoomId === SEED_ROOM_ID, "widget summary selected room did not match the seed room");
  assert(settings.bubbles?.length >= 6, "widget settings did not include the six backend-supported bubbles");
  assert(taskTitles.includes("Tauri widget real API smoke task"), "widget summary did not include the seeded task");
  assert(scheduleTitles.includes("Desktop widget backend sync check"), "widget summary did not include the seeded schedule");
  assert(
    agentSummaries.some((line) => line.includes("Review desktop widget live backend response")),
    "widget summary did not include the seeded agent suggestion",
  );
  assert(dashboard.todayTasks !== undefined, "dashboard response did not include todayTasks");

  const personalWidgetContext = await apiPatch("/api/widget/context", headers, { selectedRoomId: null });
  assert(personalWidgetContext.mode === "PERSONAL", "widget context did not switch to PERSONAL mode");

  const roomWidgetContext = await apiPatch("/api/widget/context", headers, { selectedRoomId: SEED_ROOM_ID });
  assert(roomWidgetContext.selectedRoomId === SEED_ROOM_ID, "widget context did not switch back to the seeded room");
  assert(roomWidgetContext.mode === "ROOM", "widget context did not return ROOM mode");

  const todoSetting = settings.bubbles.find((bubble) => bubble.bubbleType === "TODO");
  assert(todoSetting?.id, "widget settings did not include a TODO bubble setting id");

  const today = new Date().toISOString().slice(0, 10);
  const usageSummary = await apiPost("/api/widget/usage-summaries", headers, {
    bubbleSettingId: todoSetting.id,
    deviceId: "codex-tauri-smoke",
    interactionCount: 2,
    openCount: 1,
    rollupKey: `codex-tauri-smoke:${todoSetting.id}:${today}`,
    summaryDate: today,
    syncedAt: new Date().toISOString(),
    visibleSeconds: 2,
  });
  const todayUsage = await apiGet("/api/widget/usage-summaries/today", headers);

  assert(usageSummary.bubbleSettingId === todoSetting.id, "usage summary save did not return the TODO setting id");
  assert(todayUsage.totalInteractionCount >= 2, "today usage summary did not include the smoke interaction count");

  const localFileSync = await apiPost("/api/local-file-events/sync", headers, {
    events: [
      {
        eventType: "CREATED",
        fileName: "codex-local-sync-smoke.txt",
        fileSizeBytes: 42,
        mimeType: "text/plain",
        resourceId: null,
      },
    ],
  });

  assert(
    localFileSync.results?.[0]?.status === "SYNCED",
    "local file event sync did not return a SYNCED result",
  );
  const syncedResourceId = localFileSync.results[0].resourceId;
  assert(syncedResourceId, "local file event sync did not return a resource id");

  const localFileDelete = await apiPost("/api/local-file-events/sync", headers, {
    events: [
      {
        eventType: "DELETED",
        fileName: "codex-local-sync-smoke.txt",
        fileSizeBytes: 42,
        mimeType: "text/plain",
        resourceId: syncedResourceId,
      },
    ],
  });
  assert(
    localFileDelete.results?.[0]?.status === "SYNCED",
    "local file event delete sync did not return a SYNCED result",
  );

  const [dailySummaries, generatedDocuments, roomMemorySummaries] = await Promise.all([
    apiGet("/api/daily-summaries", headers),
    apiGet(`/api/project-rooms/${SEED_ROOM_ID}/generated-documents`, headers),
    apiGet(`/api/project-rooms/${SEED_ROOM_ID}/memory-summaries`, headers),
  ]);
  const dailySummary = dailySummaries.items?.find((item) => item.summaryJson?.includes("Codex backend daily summary"));
  const generatedDocument = generatedDocuments.items?.find((item) => item.title === "Codex generated document smoke");

  assert(dailySummary?.id, "daily summaries did not include the seeded summary");
  assert(generatedDocument?.id, "generated documents did not include the seeded document");
  assert(
    roomMemorySummaries.some((item) => item.summaryJson?.includes("Codex room memory smoke")),
    "room memory summaries did not include the seeded memory summary",
  );

  const approvedDailySummary = await apiPatch(`/api/daily-summaries/${dailySummary.id}`, headers, {
    action: "APPROVE",
  });
  assert(approvedDailySummary.status === "APPROVED", "daily summary approve did not return APPROVED");

  const generatedDocumentExport = await apiGetRaw(`/api/generated-documents/${generatedDocument.id}/export`, headers);
  assert(generatedDocumentExport.ok, "generated document export did not return HTTP 2xx");
  assert(
    generatedDocumentExport.headers.get("Content-Type")?.includes("text/markdown"),
    "generated document export did not return markdown content",
  );
  assert(
    (await generatedDocumentExport.text()).includes("Codex generated document"),
    "generated document export did not include the seeded markdown",
  );

  console.log(
    "Backend smoke passed: /api/widget/summary, /api/widget/settings, /api/widget/context, /api/dashboard/work, /api/widget/usage-summaries, /api/local-file-events/sync, /api/daily-summaries, /api/generated-documents/{id}/export, /api/project-rooms/{roomId}/memory-summaries.",
  );
}

async function runTauriDev(accessToken) {
  console.log("\nStarting Tauri dev with real backend widget token...");
  const command = tauriDevCommand();

  const child = spawn(command.file, command.args, {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
      NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN: accessToken,
      NEXT_PUBLIC_BUBLI_PREVIEW_DATA: "false",
    },
    shell: false,
    stdio: "inherit",
  });

  const exitCode = await new Promise((resolve) => {
    child.on("exit", resolve);
  });

  process.exit(exitCode ?? 0);
}

async function apiGet(path, headers) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload.data;
}

async function apiPost(path, headers, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload.data;
}

async function apiPatch(path, headers, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload.data;
}

async function apiGetRaw(path, headers) {
  return fetch(`${API_BASE_URL}${path}`, { headers });
}

function createLocalAccessToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    exp: now + ACCESS_TOKEN_EXPIRE_SECONDS,
    iat: now,
    jti: randomUUID(),
    sub: userId,
  };
  const body = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function buildSeedSql() {
  return `
INSERT INTO users (id, google_sub, bubli_id, name, avatar_url, locale, timezone, status, deleted_at, created_at, updated_at)
VALUES ('${SEED_USER_ID}', 'codex-local-widget-user', 'codex-widget', 'Codex Widget User', NULL, 'ko-KR', 'Asia/Seoul', 'ACTIVE', NULL, now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = now();

INSERT INTO project_rooms (id, created_by_user_id, name, client_name, contract_amount, payment_status, payment_due_date, paid_at, status, closed_at, created_at, updated_at)
VALUES ('${SEED_ROOM_ID}', '${SEED_USER_ID}', 'Codex Local Room', 'Bubli QA', 1200000.00, 'PENDING', current_date + 7, NULL, 'ACTIVE', NULL, now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = now();

INSERT INTO room_members (id, room_id, user_id, role, status, created_at, updated_at)
VALUES ('33333333-3333-4333-8333-333333333333', '${SEED_ROOM_ID}', '${SEED_USER_ID}', 'PROJECT_LEADER', 'ACTIVE', now(), now())
ON CONFLICT (room_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, updated_at = now();

INSERT INTO widget_context_settings (id, user_id, selected_room_id, mode, created_at, updated_at)
VALUES ('44444444-4444-4444-8444-444444444444', '${SEED_USER_ID}', '${SEED_ROOM_ID}', 'ROOM', now(), now())
ON CONFLICT (user_id) DO UPDATE SET selected_room_id = EXCLUDED.selected_room_id, mode = EXCLUDED.mode, updated_at = now();

INSERT INTO widget_bubble_settings (id, user_id, bubble_type, enabled, x, y, width, height, minimized, opacity, ghost_mode, alert_enabled, created_at, updated_at)
VALUES
('55555555-5555-4555-8555-555555555551', '${SEED_USER_ID}', 'TODO', true, 40, 48, 320, 260, false, 0.96, false, true, now(), now()),
('55555555-5555-4555-8555-555555555552', '${SEED_USER_ID}', 'SCHEDULE', true, 380, 48, 320, 260, false, 0.96, false, true, now(), now()),
('55555555-5555-4555-8555-555555555553', '${SEED_USER_ID}', 'AGENT', true, 40, 332, 320, 220, false, 0.94, false, true, now(), now()),
('55555555-5555-4555-8555-555555555554', '${SEED_USER_ID}', 'CHAT', true, 380, 332, 320, 220, false, 0.94, false, true, now(), now()),
('55555555-5555-4555-8555-555555555555', '${SEED_USER_ID}', 'TIMER', true, 720, 48, 280, 200, false, 0.94, false, true, now(), now()),
('55555555-5555-4555-8555-555555555556', '${SEED_USER_ID}', 'MEMO', true, 720, 272, 280, 200, false, 0.94, false, true, now(), now())
ON CONFLICT (user_id, bubble_type) DO UPDATE SET enabled = EXCLUDED.enabled, x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width, height = EXCLUDED.height, minimized = EXCLUDED.minimized, opacity = EXCLUDED.opacity, ghost_mode = EXCLUDED.ghost_mode, alert_enabled = EXCLUDED.alert_enabled, updated_at = now();

INSERT INTO tasks (id, owner_user_id, assignee_user_id, room_id, wbs_item_id, title, description, status, due_at, created_at, updated_at)
VALUES
('66666666-6666-4666-8666-666666666661', '${SEED_USER_ID}', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, 'Tauri widget real API smoke task', 'Seeded through PostgreSQL for desktop widget integration verification.', 'IN_PROGRESS', now() + interval '3 hours', now(), now()),
('66666666-6666-4666-8666-666666666662', '${SEED_USER_ID}', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, 'Confirm backend summary rendering', 'This item should arrive through /api/widget/summary.', 'TODO', now() + interval '1 day', now(), now())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, due_at = EXCLUDED.due_at, updated_at = now();

INSERT INTO schedules (id, owner_user_id, room_id, task_id, wbs_item_id, google_event_id, title, starts_at, ends_at, is_all_day, sync_status, last_synced_at, created_at, updated_at)
VALUES ('77777777-7777-4777-8777-777777777777', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, NULL, NULL, 'Desktop widget backend sync check', now() + interval '2 hours', now() + interval '3 hours', false, 'LOCAL_ONLY', NULL, now(), now())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, updated_at = now();

INSERT INTO notifications (id, user_id, source_type, source_id, title, body, status, read_at, created_at)
VALUES ('88888888-8888-4888-8888-888888888888', '${SEED_USER_ID}', 'AGENT', NULL, 'Widget real data notification', 'Unread count should include this seeded notification.', 'UNREAD', NULL, now())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, status = EXCLUDED.status, read_at = NULL;

INSERT INTO agent_suggestions (id, user_id, room_id, job_id, resource_id, suggestion_type, payload_json, evidence_json, status, created_at, updated_at, reviewed_by, reviewed_at)
VALUES ('99999999-9999-4999-8999-999999999999', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, NULL, 'TASK', '{"title":"Review desktop widget live backend response"}'::jsonb, '{"source":"codex-local-seed"}'::jsonb, 'DRAFT', now(), now(), NULL, NULL)
ON CONFLICT (id) DO UPDATE SET payload_json = EXCLUDED.payload_json, evidence_json = EXCLUDED.evidence_json, status = EXCLUDED.status, updated_at = now();

INSERT INTO agent_suggestions (id, user_id, room_id, job_id, resource_id, suggestion_type, payload_json, evidence_json, status, created_at, updated_at, reviewed_by, reviewed_at)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, NULL, 'DOCUMENT_DRAFT', '{"title":"Codex generated document smoke"}'::jsonb, '{"source":"codex-local-seed"}'::jsonb, 'APPROVED', now(), now(), '${SEED_USER_ID}', now())
ON CONFLICT (id) DO UPDATE SET payload_json = EXCLUDED.payload_json, evidence_json = EXCLUDED.evidence_json, status = EXCLUDED.status, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at, updated_at = now();

INSERT INTO generated_documents (id, user_id, room_id, suggestion_id, resource_id, title, document_type, content_markdown, metadata_json, created_at, updated_at)
VALUES (
'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
'${SEED_USER_ID}',
'${SEED_ROOM_ID}',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
NULL,
'Codex generated document smoke',
'DAILY_BRIEF',
E'# Codex generated document\\n\\nThis markdown came from the real backend seed and export endpoint.',
'{"source":"codex-local-seed","screen":"/app/agent"}'::jsonb,
now(),
now()
)
ON CONFLICT (suggestion_id) DO UPDATE SET title = EXCLUDED.title, document_type = EXCLUDED.document_type, content_markdown = EXCLUDED.content_markdown, metadata_json = EXCLUDED.metadata_json, updated_at = now();

INSERT INTO daily_summaries (id, user_id, summary_date, summary_json, status, approved_at, created_at, updated_at)
VALUES (
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'${SEED_USER_ID}',
current_date,
'{"title":"Codex backend daily summary","summary":"Seeded daily summary for the Tauri agent screen.","items":["real backend daily summary","approve action smoke"]}'::jsonb,
'DRAFT',
NULL,
now(),
now()
)
ON CONFLICT (user_id, summary_date) DO UPDATE SET summary_json = EXCLUDED.summary_json, status = EXCLUDED.status, approved_at = EXCLUDED.approved_at, updated_at = now();

INSERT INTO room_memory_summaries (id, room_id, from_sequence, to_sequence, summary_json, created_by_user_id, status, created_at, updated_at)
VALUES (
'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
'${SEED_ROOM_ID}',
1,
12,
'{"title":"Codex room memory smoke","summary":"Seeded room memory summary for the Tauri agent screen."}'::jsonb,
'${SEED_USER_ID}',
'DRAFT',
now(),
now()
)
ON CONFLICT (id) DO UPDATE SET summary_json = EXCLUDED.summary_json, status = EXCLUDED.status, updated_at = now();
`;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stripTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function withDockerPath(env) {
  if (process.platform !== "win32") return env;
  const dockerBin = "C:\\Program Files\\Docker\\Docker\\resources\\bin";
  return {
    ...env,
    PATH: `${dockerBin};${env.PATH ?? ""}`,
  };
}

function tauriDevCommand() {
  if (process.platform === "win32") {
    return { args: ["/d", "/s", "/c", "npm run tauri:dev"], file: "cmd.exe" };
  }

  return { args: ["run", "tauri:dev"], file: "npm" };
}

function maskToken(value) {
  return `${value.slice(0, 18)}...${value.slice(-12)}`;
}
