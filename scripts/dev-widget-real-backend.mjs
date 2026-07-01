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

  console.log("Backend smoke passed: /api/widget/summary, /api/widget/settings, /api/dashboard/work.");
}

async function runTauriDev(accessToken) {
  console.log("\nStarting Tauri dev with real backend widget token...");

  const child = spawn(npmCommand(), ["run", "tauri:dev"], {
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

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function maskToken(value) {
  return `${value.slice(0, 18)}...${value.slice(-12)}`;
}
