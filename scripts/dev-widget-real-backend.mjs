import { createHmac, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";

const COMMAND = process.argv[2] ?? "seed";
const API_BASE_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080");
const JWT_SECRET = process.env.JWT_SECRET ?? "local-development-jwt-secret-key-32-bytes-minimum";
const ACCESS_TOKEN_EXPIRE_SECONDS = Number(process.env.BUBLI_DEV_ACCESS_TOKEN_EXPIRE_SECONDS ?? 60 * 60);

const DOCKER_CONTAINER = process.env.BUBLI_DEV_POSTGRES_CONTAINER ?? "bubli-postgres";
const POSTGRES_USER = process.env.BUBLI_DEV_POSTGRES_USER ?? "bubli";
const POSTGRES_DB = process.env.BUBLI_DEV_POSTGRES_DB ?? "bubli";

const SEED_USER_ID = "11111111-1111-4111-8111-111111111111";
const SEED_ROOM_ID = "22222222-2222-4222-8222-222222222222";
const SEED_TASK_ID = "66666666-6666-4666-8666-666666666661";
const SEED_WIDGET_TASK_ITEM_STATE_ID = "12121212-1212-4121-8121-121212121212";

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

  runPostgresSql(buildSeedSql(), "PostgreSQL seed");
  console.log("Seed rows are present.");
}

function runPostgresSql(sql, label, extraArgs = []) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", DOCKER_CONTAINER, "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB, ...extraArgs],
    {
      encoding: "utf8",
      env: withDockerPath(process.env),
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  if (result.error) {
    throw new Error(`Could not run docker. ${result.error.message}`);
  }

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }

  return result.stdout;
}

function queryPostgresScalar(sql) {
  const stdout = runPostgresSql(sql, "PostgreSQL scalar query", ["-t", "-A"]);
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) ?? "";
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

  const privacyConsents = await apiGet("/api/me/privacy-consents", headers);
  assertPrivacyConsent(privacyConsents, "ACTIVITY_CONTEXT", true, "seeded activity consent");
  assertPrivacyConsent(privacyConsents, "MANAGED_FOLDER", true, "seeded managed folder consent");

  const managedFolderDisabled = await apiPatch("/api/me/privacy-consents", headers, {
    items: [{ consentType: "MANAGED_FOLDER", enabled: false }],
  });
  assertPrivacyConsent(managedFolderDisabled, "MANAGED_FOLDER", false, "managed folder consent disable");

  const managedFolderEnabled = await apiPatch("/api/me/privacy-consents", headers, {
    items: [{ consentType: "MANAGED_FOLDER", enabled: true }],
  });
  assertPrivacyConsent(managedFolderEnabled, "MANAGED_FOLDER", true, "managed folder consent re-enable");

  const personalWidgetContext = await apiPatch("/api/widget/context", headers, { selectedRoomId: null });
  assert(personalWidgetContext.mode === "PERSONAL", "widget context did not switch to PERSONAL mode");

  const roomWidgetContext = await apiPatch("/api/widget/context", headers, { selectedRoomId: SEED_ROOM_ID });
  assert(roomWidgetContext.selectedRoomId === SEED_ROOM_ID, "widget context did not switch back to the seeded room");
  assert(roomWidgetContext.mode === "ROOM", "widget context did not return ROOM mode");

  const pinnedItemState = await apiPatch(`/api/widget/items/${SEED_WIDGET_TASK_ITEM_STATE_ID}/state`, headers, {
    bubbleType: "TODO",
    itemId: SEED_TASK_ID,
    itemType: "TASK",
    state: "PINNED",
  });
  assert(pinnedItemState === null || pinnedItemState === undefined, "widget item state update should not return a body");
  assert(
    queryPostgresScalar(`SELECT state FROM widget_item_states WHERE id = '${SEED_WIDGET_TASK_ITEM_STATE_ID}';`) ===
      "PINNED",
    "widget item state PATCH did not persist PINNED",
  );

  await apiPatch(`/api/widget/items/${SEED_WIDGET_TASK_ITEM_STATE_ID}/state`, headers, {
    bubbleType: "TODO",
    itemId: SEED_TASK_ID,
    itemType: "TASK",
    state: "CONFIRMED",
  });
  assert(
    queryPostgresScalar(`SELECT state FROM widget_item_states WHERE id = '${SEED_WIDGET_TASK_ITEM_STATE_ID}';`) ===
      "CONFIRMED",
    "widget item state PATCH did not persist CONFIRMED",
  );

  await apiPatch(`/api/widget/items/${SEED_TASK_ID}/state`, headers, {
    bubbleType: "TODO",
    itemId: SEED_TASK_ID,
    itemType: "TASK",
    state: "SNOOZED",
  });
  assert(
    queryPostgresScalar(`SELECT state FROM widget_item_states WHERE id = '${SEED_WIDGET_TASK_ITEM_STATE_ID}';`) ===
      "SNOOZED",
    "widget item state PATCH did not persist SNOOZED when called with the task item id",
  );
  const itemStates = await apiGet(`/api/widget/items/states?itemIds=${SEED_TASK_ID}`, headers);
  assert(
    itemStates.some(
      (itemState) =>
        itemState.itemId === SEED_TASK_ID &&
        itemState.bubbleType === "TODO" &&
        itemState.itemType === "TASK" &&
        itemState.state === "SNOOZED",
    ),
    "widget item state query did not return the persisted task state",
  );

  const chatRooms = await apiGet("/api/chat/rooms?page=0&size=20", headers);
  const roomChat = chatRooms.items?.find((room) => room.roomId === SEED_ROOM_ID);
  assert(roomChat?.id, "chat room list did not include the seeded project room chat");

  const chatSend = await apiPost(`/api/chat/rooms/${roomChat.id}/messages`, headers, {
    body: { text: "Codex widget communication send smoke" },
    clientMessageId: `codex-widget-send-${Date.now()}`,
    messageType: "TEXT",
  });
  assert(chatSend.body?.text === "Codex widget communication send smoke", "widget chat send did not echo the message body");

  const chatRead = await apiPatch(`/api/chat/rooms/${roomChat.id}/read`, headers, {
    lastReadSequence: chatSend.roomSequence,
  });
  assert(chatRead.lastReadSequence === chatSend.roomSequence, "widget chat read marker did not return the sent sequence");

  const voiceRoom = await apiPost("/api/voice/rooms", headers, { roomId: SEED_ROOM_ID });
  assert(voiceRoom.roomId === SEED_ROOM_ID, "voice room create did not return the seeded project room id");
  assert(voiceRoom.createdByUserId === SEED_USER_ID, "voice room create did not return the creator user id");
  assert(voiceRoom.status === "OPEN", "voice room create did not return OPEN status");
  assert(
    voiceRoom.participants?.some((participant) => participant.userId === SEED_USER_ID),
    "voice room create did not include the seed user as a participant",
  );

  const voiceRoomState = await apiGet(`/api/voice/rooms/${voiceRoom.id}`, headers);
  assert(voiceRoomState.createdByUserId === SEED_USER_ID, "voice room read did not return the creator user id");
  assert(voiceRoomState.participants?.length >= 1, "voice room read did not include participants");

  const voiceParticipant = await apiPatch(`/api/voice/rooms/${voiceRoom.id}/mic`, headers, {
    micStatus: "MUTED",
  });
  assert(voiceParticipant.userId === SEED_USER_ID, "voice mic update did not return the seed user participant");

  const voiceToken = await apiPost(`/api/voice/rooms/${voiceRoom.id}/token`, headers, {});
  assert(voiceToken.voiceRoomId === voiceRoom.id, "voice token did not return the voice room id");
  assert(voiceToken.participantId, "voice token did not return a participant id");
  assert(voiceToken.serverUrl, "voice token did not include serverUrl");
  assert(voiceToken.token, "voice token did not include token");
  assert(voiceToken.expiresAt, "voice token did not include expiresAt");

  const voiceRoomLeft = await apiPatch(`/api/voice/rooms/${voiceRoom.id}/leave`, headers, {});
  assert(voiceRoomLeft.id === voiceRoom.id, "voice leave did not return the same voice room");

  const timeLog = await apiPost("/api/time-logs/start", headers, {
    idempotencyKey: `codex-tauri-timer-smoke-${Date.now()}`,
    roomId: SEED_ROOM_ID,
    timerType: "WORK",
  });
  assert(timeLog.status === "RUNNING", "timer start did not return RUNNING status");
  assert(timeLog.roomId === SEED_ROOM_ID, "timer start did not return the seeded room id");
  assert(timeLog.timerType === "WORK", "timer start did not return WORK timer type");

  const timerDashboard = await apiGet("/api/dashboard/work", headers);
  assert(timerDashboard.runningTimer?.id === timeLog.id, "dashboard work did not include the running smoke timer");
  const timerWidgetSummary = await apiGet("/api/widget/summary", headers);
  assert(timerWidgetSummary.runningTimer?.id === timeLog.id, "widget summary did not include the running smoke timer");

  const heartbeatTimer = await apiPatch(`/api/time-logs/${timeLog.id}/heartbeat`, headers, {});
  assert(heartbeatTimer.status === "RUNNING", "timer heartbeat did not keep the timer RUNNING");
  assert(heartbeatTimer.lastHeartbeatAt, "timer heartbeat did not return lastHeartbeatAt");

  const pausedTimer = await apiPatch(`/api/time-logs/${timeLog.id}/pause`, headers, {});
  assert(pausedTimer.status === "PAUSED", "timer pause did not return PAUSED status");

  const resumedTimer = await apiPatch(`/api/time-logs/${timeLog.id}/resume`, headers, {});
  assert(resumedTimer.status === "RUNNING", "timer resume did not return RUNNING status");

  const stoppedTimer = await apiPatch(`/api/time-logs/${timeLog.id}/stop`, headers, {});
  assert(stoppedTimer.status === "ENDED", "timer stop did not return ENDED status");
  assert(stoppedTimer.endedAt, "timer stop did not return endedAt");

  const todoSetting = settings.bubbles.find((bubble) => bubble.bubbleType === "TODO");
  assert(todoSetting?.id, "widget settings did not include a TODO bubble setting id");

  const todayUsageBefore = await apiGet("/api/widget/usage-summaries/today", headers);
  const today = todayUsageBefore.date;
  const smokeUsageDeviceId = `codex-tauri-${Date.now()}`;
  const usageRollupKey = `${smokeUsageDeviceId}:${todoSetting.id}:${today}`;
  const usageSummary = await apiPost("/api/widget/usage-summaries", headers, {
    bubbleSettingId: todoSetting.id,
    deviceId: smokeUsageDeviceId,
    interactionCount: 2,
    openCount: 1,
    rollupKey: usageRollupKey,
    summaryDate: today,
    syncedAt: new Date().toISOString(),
    visibleSeconds: 2,
  });
  const todayUsage = await apiGet("/api/widget/usage-summaries/today", headers);

  assert(usageSummary.bubbleSettingId === todoSetting.id, "usage summary save did not return the TODO setting id");
  assert(
    todayUsage.totalInteractionCount >= todayUsageBefore.totalInteractionCount + 2,
    "today usage summary did not include the smoke interaction count",
  );
  assert(
    todayUsage.byDevice?.some((item) => item.id === usageSummary.id),
    "today usage summary did not include the saved smoke rollup",
  );

  const createdLocalEventId = `codex-local-sync-created-${Date.now()}`;
  const localFileSync = await apiPost("/api/local-file-events/sync", headers, {
    events: [
      {
        eventType: "CREATED",
        fileName: "codex-local-sync-smoke.txt",
        fileSizeBytes: 42,
        localEventId: createdLocalEventId,
        mimeType: "text/plain",
        resourceId: null,
      },
    ],
  });

  assert(
    localFileSync.results?.[0]?.status === "SYNCED",
    "local file event sync did not return a SYNCED result",
  );
  assertOptionalLocalEventId(localFileSync.results?.[0], createdLocalEventId, "local file event sync");
  const syncedResourceId = localFileSync.results[0].resourceId;
  assert(syncedResourceId, "local file event sync did not return a resource id");

  const updatedLocalEventId = `codex-local-sync-updated-${Date.now()}`;
  const localFileUpdate = await apiPost("/api/local-file-events/sync", headers, {
    events: [
      {
        eventType: "UPDATED",
        fileName: "codex-local-sync-smoke-updated.txt",
        fileSizeBytes: 112,
        localEventId: updatedLocalEventId,
        mimeType: "text/plain",
        resourceId: syncedResourceId,
      },
    ],
  });
  assert(
    localFileUpdate.results?.[0]?.status === "SYNCED",
    "local file event update sync did not return a SYNCED result",
  );
  assertOptionalLocalEventId(localFileUpdate.results?.[0], updatedLocalEventId, "local file event update sync");
  assert(
    localFileUpdate.results?.[0]?.resourceId === syncedResourceId,
    "local file event update sync did not preserve the synced resource id",
  );

  const localFileAnalysis = await apiPost("/api/local-file-analyses", headers, {
    analyzedCharCount: 112,
    checksum: "codex-local-analysis-smoke-checksum",
    combinedText:
      "Codex local file analysis smoke verifies that managed folder text extraction reaches the backend analysis queue.",
    extractionMethod: "BM25_MMR_KEY_SENTENCE_V1",
    fileName: "codex-local-sync-smoke.txt",
    keySentences: [
      {
        endOffset: 112,
        index: 0,
        score: 1,
        startOffset: 0,
        text: "Codex local file analysis smoke verifies that managed folder text extraction reaches the backend analysis queue.",
      },
    ],
    localFileId: `codex-local-file-${Date.now()}`,
    mimeType: "text/plain",
    resourceId: syncedResourceId,
    sourceCharCount: 112,
    textTruncated: false,
  });
  assert(localFileAnalysis.jobId, "local file analysis did not return an agent job id");
  assert(localFileAnalysis.resourceId === syncedResourceId, "local file analysis did not return the synced resource id");
  assert(
    localFileAnalysis.jobType === "ANALYZE_RESOURCE",
    "local file analysis did not create an ANALYZE_RESOURCE job",
  );

  const deletedLocalEventId = `codex-local-sync-deleted-${Date.now()}`;
  const localFileDelete = await apiPost("/api/local-file-events/sync", headers, {
    events: [
      {
        eventType: "DELETED",
        fileName: "codex-local-sync-smoke.txt",
        fileSizeBytes: 42,
        localEventId: deletedLocalEventId,
        mimeType: "text/plain",
        resourceId: syncedResourceId,
      },
    ],
  });
  assert(
    localFileDelete.results?.[0]?.status === "SYNCED",
    "local file event delete sync did not return a SYNCED result",
  );
  assertOptionalLocalEventId(localFileDelete.results?.[0], deletedLocalEventId, "local file event delete sync");

  const activityStartedAt = new Date(Date.now() - 120_000).toISOString();
  const activityEndedAt = new Date().toISOString();
  const activitySmoke = await apiPost("/api/activity/current-app", headers, {
    appName: "Codex Tauri activity smoke",
    durationSeconds: 120,
    endedAt: activityEndedAt,
    roomId: SEED_ROOM_ID,
    startedAt: activityStartedAt,
    windowTitle: "Real backend activity roundtrip",
  });
  assert(activitySmoke.appName === "Codex Tauri activity smoke", "activity record did not return the smoke app name");
  assert(activitySmoke.roomId === SEED_ROOM_ID, "activity record did not return the seeded room id");

  const todayActivities = await apiGet("/api/activity/today", headers);
  assert(
    todayActivities.some((activity) => activity.id === activitySmoke.id),
    "today activities did not include the saved smoke activity",
  );

  await apiDelete(`/api/activity/${activitySmoke.id}`, headers);
  const todayActivitiesAfterDelete = await apiGet("/api/activity/today", headers);
  assert(
    !todayActivitiesAfterDelete.some((activity) => activity.id === activitySmoke.id),
    "today activities still included the deleted smoke activity",
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
    "Backend smoke passed: /api/widget/summary, /api/widget/settings, /api/widget/context, /api/widget/items/{id}/state, /api/widget/items/states, /api/me/privacy-consents, /api/chat/rooms, /api/chat/rooms/{id}/messages, /api/chat/rooms/{id}/read, /api/voice/rooms, /api/voice/rooms/{id}, /api/voice/rooms/{id}/token, /api/voice/rooms/{id}/mic, /api/voice/rooms/{id}/leave, /api/time-logs/start, /api/time-logs/{id}/heartbeat, /api/time-logs/{id}/pause, /api/time-logs/{id}/resume, /api/time-logs/{id}/stop, /api/dashboard/work, /api/widget/usage-summaries, /api/local-file-events/sync CREATED/UPDATED/DELETED, /api/local-file-analyses, /api/activity/current-app, /api/activity/today, DELETE /api/activity/{id}, /api/daily-summaries, /api/generated-documents/{id}/export, /api/project-rooms/{roomId}/memory-summaries.",
  );
}

function assertPrivacyConsent(response, consentType, enabled, label) {
  const item = response.items?.find((entry) => entry.consentType === consentType);
  assert(item, `${label} did not include ${consentType}`);
  assert(item.enabled === enabled, `${label} expected ${consentType}=${enabled}`);
}

async function runTauriDev(accessToken) {
  console.log("\nStarting Tauri dev with real backend widget token...");
  const existingDevUrl = await findExistingNextDevUrl();
  const command = tauriDevCommand(existingDevUrl);

  if (existingDevUrl) {
    console.log(`Reusing existing Next dev server at ${existingDevUrl}.`);
  } else {
    console.log("No existing Next dev server found. Tauri will start the default dev server.");
  }

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

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
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

async function apiDelete(path, headers) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    method: "DELETE",
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

INSERT INTO user_privacy_consents (user_id, consent_type, enabled, updated_at)
VALUES
('${SEED_USER_ID}', 'ACTIVITY_CONTEXT', true, now()),
('${SEED_USER_ID}', 'MANAGED_FOLDER', true, now())
ON CONFLICT (user_id, consent_type) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();

UPDATE time_logs
SET status = 'ENDED',
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
WHERE user_id = '${SEED_USER_ID}'
  AND status IN ('RUNNING', 'PAUSED', 'NEEDS_RECOVERY');

DELETE FROM voice_participants
WHERE voice_room_id IN (SELECT id FROM voice_rooms WHERE room_id = '${SEED_ROOM_ID}');

DELETE FROM voice_rooms
WHERE room_id = '${SEED_ROOM_ID}';

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
('${SEED_TASK_ID}', '${SEED_USER_ID}', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, 'Tauri widget real API smoke task', 'Seeded through PostgreSQL for desktop widget integration verification.', 'IN_PROGRESS', now() + interval '3 hours', now(), now()),
('66666666-6666-4666-8666-666666666662', '${SEED_USER_ID}', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, 'Confirm backend summary rendering', 'This item should arrive through /api/widget/summary.', 'TODO', now() + interval '1 day', now(), now())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, due_at = EXCLUDED.due_at, updated_at = now();

INSERT INTO widget_item_states (id, user_id, bubble_type, item_type, item_id, state, created_at, updated_at)
VALUES ('${SEED_WIDGET_TASK_ITEM_STATE_ID}', '${SEED_USER_ID}', 'TODO', 'TASK', '${SEED_TASK_ID}', 'VISIBLE', now(), now())
ON CONFLICT (user_id, bubble_type, item_type, item_id)
DO UPDATE SET id = EXCLUDED.id, state = EXCLUDED.state, updated_at = now();

INSERT INTO schedules (id, owner_user_id, room_id, task_id, wbs_item_id, google_event_id, title, starts_at, ends_at, is_all_day, sync_status, last_synced_at, created_at, updated_at)
VALUES ('77777777-7777-4777-8777-777777777777', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, NULL, NULL, 'Desktop widget backend sync check', now() + interval '2 hours', now() + interval '3 hours', false, 'LOCAL_ONLY', NULL, now(), now())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, updated_at = now();

INSERT INTO notifications (id, user_id, source_type, source_id, title, body, status, read_at, created_at)
VALUES ('88888888-8888-4888-8888-888888888888', '${SEED_USER_ID}', 'AGENT', NULL, 'Widget real data notification', 'Unread count should include this seeded notification.', 'UNREAD', NULL, now())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, status = EXCLUDED.status, read_at = NULL;

INSERT INTO agent_suggestions (id, user_id, room_id, job_id, resource_id, suggestion_type, payload_json, evidence_json, status, created_at, updated_at, reviewed_by, reviewed_at)
VALUES ('99999999-9999-4999-8999-999999999999', '${SEED_USER_ID}', '${SEED_ROOM_ID}', NULL, NULL, 'TASK', '{"title":"Review desktop widget live backend response"}'::jsonb, '{"source":"codex-local-seed"}'::jsonb, 'DRAFT', now(), now(), NULL, NULL)
ON CONFLICT (id) DO UPDATE SET payload_json = EXCLUDED.payload_json, evidence_json = EXCLUDED.evidence_json, status = EXCLUDED.status, updated_at = now();

INSERT INTO chat_rooms (id, room_id, chat_type, name, status, created_at, updated_at)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${SEED_ROOM_ID}', 'ROOM', 'Codex Local Room chat', 'ACTIVE', now(), now())
ON CONFLICT (id) DO UPDATE SET room_id = EXCLUDED.room_id, chat_type = EXCLUDED.chat_type, name = EXCLUDED.name, status = EXCLUDED.status, updated_at = now();

INSERT INTO chat_room_members (id, chat_room_id, user_id, last_read_message_id, last_read_at, status, created_at, updated_at, last_read_sequence)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${SEED_USER_ID}', NULL, NULL, 'ACTIVE', now(), now(), NULL)
ON CONFLICT (chat_room_id, user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();

INSERT INTO chat_messages (id, chat_room_id, sender_user_id, client_message_id, room_sequence, message_type, body, resource_id, created_at)
VALUES (
'abababab-abab-4aba-8aba-abababababab',
'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
'${SEED_USER_ID}',
'codex-widget-seed-message',
1,
'TEXT',
'{"text":"Codex widget communication seed"}'::jsonb,
NULL,
now()
)
ON CONFLICT (chat_room_id, client_message_id) DO UPDATE SET body = EXCLUDED.body, message_type = EXCLUDED.message_type;

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

function assertOptionalLocalEventId(result, expectedLocalEventId, label) {
  if (!result || !Object.hasOwn(result, "localEventId")) {
    return;
  }

  assert(
    result.localEventId === expectedLocalEventId,
    `${label} did not echo the local event id`,
  );
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

async function findExistingNextDevUrl() {
  const candidates = [
    process.env.BUBLI_TAURI_DEV_URL,
    process.env.NEXT_PUBLIC_APP_BASE_URL,
    process.env.NEXT_BASE_URL,
    "http://localhost:3791",
    "http://localhost:3000",
  ]
    .filter(Boolean)
    .map(stripTrailingSlash);

  for (const candidate of [...new Set(candidates)]) {
    if (await isReachableDevUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function isReachableDevUrl(url) {
  try {
    const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(1200) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function tauriDevCommand(existingDevUrl) {
  if (!existingDevUrl) {
    if (process.platform === "win32") {
      return { args: ["/d", "/s", "/c", "npm.cmd run tauri:dev"], file: process.env.ComSpec ?? "cmd.exe" };
    }

    return {
      args: ["run", "tauri:dev"],
      file: "npm",
    };
  }

  const configPath = writeTauriDevConfig(existingDevUrl);
  const tauriBinary = resolvePath(
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tauri.cmd" : "tauri",
  );
  if (process.platform === "win32") {
    return {
      args: ["/d", "/s", "/c", [quoteForCmd(tauriBinary), "dev", "--no-watch", "--config", quoteForCmd(configPath)].join(" ")],
      file: process.env.ComSpec ?? "cmd.exe",
    };
  }

  return {
    args: ["dev", "--no-watch", "--config", configPath],
    file: tauriBinary,
  };
}

function quoteForCmd(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function writeTauriDevConfig(devUrl) {
  const configDir = mkdtempSync(join(tmpdir(), "bubli-tauri-dev-"));
  const configPath = join(configDir, "tauri-dev-server.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      build: {
        beforeDevCommand: "",
        devUrl,
      },
    }),
  );
  return configPath;
}

function maskToken(value) {
  return `${value.slice(0, 18)}...${value.slice(-12)}`;
}
