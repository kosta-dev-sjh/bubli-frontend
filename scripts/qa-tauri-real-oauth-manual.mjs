import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API_BASE_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080");
const TIMEOUT_MS = Number(process.env.BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS ?? 300_000);
const CONTRACT_ONLY = process.argv.includes("--contract");

if (process.platform !== "win32") {
  console.log("Tauri real OAuth manual QA skipped: this script is Windows-only.");
  process.exit(0);
}

if (CONTRACT_ONLY) {
  const contractChecks = runContractCheck();
  console.log(
    JSON.stringify(
      {
        apiBaseUrl: API_BASE_URL,
        checks: contractChecks,
        mode: "contract",
        result: "passed",
        script: "qa-tauri-real-oauth-manual",
        timeoutMs: TIMEOUT_MS,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const localSyncFixture = createLocalSyncFixture();
const { closeServer, mutateUrl, reportPromise, reportUrl } = await startReportServer(localSyncFixture);
const child = spawnTauri(reportUrl, localSyncFixture.folderPath, mutateUrl);
let timeout = null;

console.log("");
console.log("Tauri real Google OAuth manual QA is waiting for a login.");
console.log("1. Complete Google login in the Bubli Tauri app.");
console.log("2. Keep the app open until this script prints the redacted QA report.");
console.log("3. This script does not pass a dev access token.");
console.log("");

try {
  const report = await Promise.race([
    reportPromise,
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`Timed out after ${TIMEOUT_MS}ms waiting for Tauri real OAuth QA report.`)),
        TIMEOUT_MS,
      );
    }),
  ]);

  validateRealOAuthQaReport(report);
  const outputPaths = writeReport(report);
  console.log(JSON.stringify({ ...outputPaths, ...report }, null, 2));

  if (report.status !== "passed") {
    throw new Error(`Tauri real OAuth manual QA failed: ${report.error ?? "assertion failed"}`);
  }

  console.log("Tauri real OAuth manual QA passed.");
} finally {
  if (timeout) clearTimeout(timeout);
  closeServer();
  stopProcessTree(child.pid);
  localSyncFixture.cleanup();
}

function spawnTauri(reportUrl, localSyncFolderPath, localSyncMutateUrl) {
  const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri:dev"], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
      NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "false",
      NEXT_PUBLIC_BUBLI_PREVIEW_DATA: "false",
      NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS: "true",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_FOLDER: localSyncFolderPath,
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_MUTATE_URL: localSyncMutateUrl,
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA: "true",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA: "true",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS: "15000",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA: "true",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA: "true",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL: reportUrl,
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS: String(TIMEOUT_MS),
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "false",
    },
    shell: false,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.log(`Tauri real OAuth QA process exited with code ${code}.`);
    }
  });

  return child;
}

function createLocalSyncFixture() {
  const folderPath = mkdtempSync(join(tmpdir(), "bubli-real-oauth-local-sync-"));
  const notePath = join(folderPath, "real-oauth-local-sync-note.txt");
  writeFileSync(
    notePath,
    [
      "RealOAuthLocalSyncInitial",
      "Bubli Windows Tauri real OAuth local file tracking fixture.",
      "This file must be scanned, previewed, synced, mutated, reindexed, and synced again.",
      "",
    ].join("\n"),
    "utf8",
  );

  return {
    folderPath,
    mutate() {
      const marker = `RealOAuthLocalSyncUpdated ${new Date().toISOString()}`;
      writeFileSync(
        notePath,
        [
          marker,
          "The QA server mutated this file after the initial backend sync.",
          "The Tauri app must reindex this changed content and sync an UPDATED event.",
          "",
        ].join("\n"),
        "utf8",
      );
      return { marker, notePath };
    },
    cleanup() {
      rmSync(folderPath, { force: true, recursive: true });
    },
  };
}

function startReportServer(localSyncFixture) {
  let settled = false;
  let resolveReport;
  let rejectReport;
  const reportPromise = new Promise((resolve, reject) => {
    resolveReport = resolve;
    rejectReport = reject;
  });

  const server = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Origin", "*");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "POST" && request.url === "/mutate-local-file") {
      try {
        const mutation = localSyncFixture.mutate();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify({ marker: mutation.marker }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method !== "POST" || request.url !== "/report") {
      response.writeHead(404);
      response.end();
      return;
    }

    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        const report = JSON.parse(body);
        validateRealOAuthQaReport(report);
        settled = true;
        response.writeHead(204);
        response.end();
        resolveReport(report);
      } catch (error) {
        response.writeHead(400);
        response.end();
        rejectReport(error);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not bind Tauri real OAuth QA report server."));
        return;
      }

      resolve({
        closeServer() {
          if (!settled) {
            rejectReport(new Error("Tauri real OAuth QA report server closed before receiving a report."));
          }
          server.close();
        },
        mutateUrl: `http://127.0.0.1:${address.port}/mutate-local-file`,
        reportPromise,
        reportUrl: `http://127.0.0.1:${address.port}/report`,
      });
    });
  });
}

function writeReport(report) {
  const directory = ".codex-runtime-logs";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(directory, `tauri-real-oauth-qa-${timestamp}.json`);
  const summaryPath = join(directory, `tauri-real-oauth-qa-${timestamp}.md`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  writeFileSync(summaryPath, renderEvidenceSummary(report, reportPath));
  return { reportPath, summaryPath };
}

function renderEvidenceSummary(report, reportPath) {
  const snapshot = report.assertion?.snapshot;
  const failedChecks = report.assertion?.failedChecks ?? [];
  const lines = [
    "# Tauri Real OAuth QA Evidence",
    "",
    `- Result: ${report.status}`,
    `- Finished at: ${report.finishedAt}`,
    `- Duration ms: ${report.durationMs}`,
    `- Attempts: ${report.attemptCount}`,
    `- Trigger reason: ${report.reason}`,
    `- JSON report: ${reportPath}`,
    `- Failed checks: ${failedChecks.length === 0 ? "none" : failedChecks.join(", ")}`,
    "",
    "## Redacted Proof",
    "",
  ];

  if (!snapshot) {
    lines.push("- Snapshot: missing", "");
    return `${lines.join("\n")}\n`;
  }

  const localSync = snapshot.localSyncProbe ?? {};
  const localFiles = localSync.localFiles ?? {};
  const stability = snapshot.stabilityProbe ?? {};
  const sessionRestore = snapshot.sessionRestoreProbe ?? {};
  const stopCleanup = snapshot.stopCleanupProbe ?? {};

  lines.push(
    `- Real TAURI local session: ${Boolean(snapshot.localSession?.hasSession && snapshot.localSession?.clientType === "TAURI" && snapshot.localSession?.isDevAccessTokenSession === false)}`,
    `- Real TAURI mirror session: ${Boolean(snapshot.tauriMirrorSession?.hasSession && snapshot.tauriMirrorSession?.clientType === "TAURI" && snapshot.tauriMirrorSession?.isDevAccessTokenSession === false)}`,
    `- Backend /api/me: ${Boolean(snapshot.backend?.me?.ok)}`,
    `- Backend widget context: ${Boolean(snapshot.backend?.widgetContext?.ok)}`,
    `- Backend widget summary: ${Boolean(snapshot.backend?.widgetSummary?.ok)}`,
    `- Selected room propagated: ${Boolean(snapshot.activeProjectRoom?.hasSelectedRoom && snapshot.activeProjectRoom?.tauriMatchesMemory && snapshot.activeProjectRoom?.tauriMatchesServerContext)}`,
    `- All widget windows visible: ${Boolean(snapshot.widgetRuntime?.allExpectedWindowsVisible)}`,
    `- Widget room context matches active/server: ${Boolean(snapshot.widgetRuntime?.allWindowRoomContextMatchesActive && snapshot.widgetRuntime?.allWindowRoomContextMatchesServer)}`,
    `- Auto-sync loops running: ${Boolean(snapshot.syncRuntime?.allAutoSyncLoopsRunning)}`,
    `- Managed-folder watcher not failed: ${snapshot.syncRuntime?.managedFolderStatus?.lastStatus !== "failed"}`,
    `- SQLite quick_check: ${Boolean(localSync.sqlite?.ok)}`,
    `- Local file scan/read initial sync: ${Boolean(localFiles.initialSearchMatched && localFiles.initialPreviewReady && (localFiles.initialSyncSyncedCount ?? 0) >= 1)}`,
    `- Local file update/reindex sync: ${Boolean(localFiles.mutationRequested && localFiles.reindexChanged && localFiles.updatedSearchMatched && (localFiles.updateSyncSyncedCount ?? 0) >= 1)}`,
    `- Widget usage reached backend: ${(localSync.outbox?.widgetSentCount ?? 0) >= 1}`,
    `- Activity reached backend when consented: ${
      localSync.activity?.consentGranted ? (localSync.outbox?.activitySentCount ?? 0) >= 1 : "not required"
    }`,
    `- Stability dwell ms: ${stability.dwellMs ?? 0}`,
    `- Stability widgets/sync/backend healthy: ${Boolean(stability.allExpectedWindowsVisible && stability.allAutoSyncLoopsRunning && stability.backendWidgetSummaryOk)}`,
    `- Session restored from Tauri mirror: ${Boolean(sessionRestore.restoredLocalSession && sessionRestore.restoredTauriClient && sessionRestore.backendMeOk)}`,
    `- Stop cleanup closed widgets and loops: ${Boolean(stopCleanup.activeProjectRoomCleared && stopCleanup.allExpectedWindowsHidden && stopCleanup.syncLoopsStopped)}`,
    "",
    "Raw tokens, session JSON, user IDs, email, and Google subject are intentionally excluded by the report validator.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function runContractCheck() {
  const scriptSource = readFileSync("scripts/qa-tauri-real-oauth-manual.mjs", "utf8");
  const reporterSource = readFileSync("src/lib/tauri/tauri-real-oauth-qa-reporter.tsx", "utf8");
  const qaSource = readFileSync("src/lib/tauri/tauri-auth-widget-qa.ts", "utf8");
  const checks = [
    {
      name: "script launches real OAuth QA with local sync stability session restore and stop cleanup probes without dev token",
      pattern:
        /NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "false"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_FOLDER: localSyncFolderPath[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_MUTATE_URL: localSyncMutateUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS: "15000"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL: reportUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "false"/,
      source: scriptSource,
    },
    {
      name: "script validates redacted QA reports before accepting pass",
      pattern:
        /function validateRealOAuthQaReport[\s\S]*forbiddenReportFieldPattern[\s\S]*assert\(report\.assertion\?\.ok === true[\s\S]*assert\(snapshot\.localSession\.isDevAccessTokenSession === false[\s\S]*assert\([\s\S]*snapshot\.tauriMirrorSession\.isDevAccessTokenSession === false[\s\S]*assert\(snapshot\.widgetRuntime\?\.allExpectedWindowsVisible[\s\S]*assert\(snapshot\.syncRuntime\?\.allAutoSyncLoopsRunning[\s\S]*assert\([\s\S]*snapshot\.syncRuntime\.managedFolderStatus\?\.running === snapshot\.syncRuntime\.managedFolderAutoSyncRunning[\s\S]*assert\([\s\S]*snapshot\.syncRuntime\.managedFolderStatus\.lastStatus !== "failed"[\s\S]*assert\(snapshot\.localSyncProbe\?\.enabled[\s\S]*assert\(snapshot\.localSyncProbe\.sqlite\?\.ok[\s\S]*snapshot\.localSyncProbe\.localFiles\?\.enabled[\s\S]*initialPreviewIncludesMarker[\s\S]*initialSyncSyncedCount[\s\S]*mutationRequested[\s\S]*reindexStatus === "REINDEXED"[\s\S]*updatedPreviewIncludesMarker[\s\S]*updateSyncSyncedCount[\s\S]*remainingQaEvents === 0[\s\S]*snapshot\.localSyncProbe\.outbox\?\.widgetSentCount \?\? 0\) >= 1[\s\S]*snapshot\.localSyncProbe\.activity\?\.consentGranted[\s\S]*snapshot\.localSyncProbe\.activity\.nativeCaptured[\s\S]*snapshot\.localSyncProbe\.outbox\?\.activitySentCount \?\? 0\) >= 1[\s\S]*snapshot\.stabilityProbe\?\.enabled[\s\S]*snapshot\.stabilityProbe\.allExpectedWindowsVisible[\s\S]*snapshot\.stabilityProbe\.allAutoSyncLoopsRunning[\s\S]*snapshot\.sessionRestoreProbe\?\.enabled[\s\S]*snapshot\.sessionRestoreProbe\.restoredLocalSession[\s\S]*snapshot\.sessionRestoreProbe\.backendMeOk[\s\S]*snapshot\.stopCleanupProbe\?\.enabled[\s\S]*snapshot\.stopCleanupProbe\.activeProjectRoomCleared[\s\S]*snapshot\.stopCleanupProbe\.allExpectedWindowsHidden[\s\S]*snapshot\.stopCleanupProbe\.barWindowHidden[\s\S]*snapshot\.stopCleanupProbe\.syncLoopsStopped/,
      source: scriptSource,
    },
    {
      name: "script writes a markdown evidence summary next to the JSON report",
      pattern:
        /function writeReport\(report\)[\s\S]*const reportPath = join\(directory, `tauri-real-oauth-qa-\$\{timestamp\}\.json`\)[\s\S]*const summaryPath = join\(directory, `tauri-real-oauth-qa-\$\{timestamp\}\.md`\)[\s\S]*renderEvidenceSummary\(report, reportPath\)[\s\S]*return \{ reportPath, summaryPath \}/,
      source: scriptSource,
    },
    {
      name: "script evidence summary stays redacted and records key real OAuth probes",
      pattern:
        /function renderEvidenceSummary\(report, reportPath\)[\s\S]*Redacted Proof[\s\S]*Real TAURI local session[\s\S]*Backend \/api\/me[\s\S]*All widget windows visible[\s\S]*Local file scan\/read initial sync[\s\S]*Local file update\/reindex sync[\s\S]*Stability dwell ms[\s\S]*Session restored from Tauri mirror[\s\S]*Stop cleanup closed widgets and loops[\s\S]*Raw tokens, session JSON, user IDs, email, and Google subject are intentionally excluded/,
      source: scriptSource,
    },
    {
      name: "script contract mode runs real checks",
      pattern:
        /if \(CONTRACT_ONLY\) \{[\s\S]*const contractChecks = runContractCheck\(\);[\s\S]*checks: contractChecks[\s\S]*function runContractCheck\(\)/,
      source: scriptSource,
    },
    {
      name: "reporter posts assertion after auth session changes",
      pattern:
        /AUTH_SESSION_CHANGE_EVENT[\s\S]*assertTauriRealGoogleAuthWidgetQa\(\)[\s\S]*postRealOAuthQaReport\(report\)[\s\S]*Timed out waiting for a real Google TAURI session with all widgets ready/,
      source: reporterSource,
    },
    {
      name: "real OAuth assertion rejects dev tokens and requires widgets sync loops plus local sync stability restore and stop cleanup probes",
      pattern:
        /diagnostics\.clientType === "TAURI"[\s\S]*diagnostics\.isDevAccessTokenSession === false[\s\S]*diagnostics\.refreshTokenExpired === false[\s\S]*widgets:allExpectedWindowsVisible[\s\S]*sync:allAutoSyncLoopsRunning[\s\S]*sync:managedFolderStatusMatchesRunningFlag[\s\S]*sync:managedFolderStatusNotFailed[\s\S]*localSyncProbe:sqliteQuickCheck[\s\S]*localSyncProbe:localFileInitialPreviewMarker[\s\S]*localSyncProbe:localFileCreatedSynced[\s\S]*localSyncProbe:localFileUpdatedPreviewMarker[\s\S]*localSyncProbe:localFileUpdatedSynced[\s\S]*localSyncProbe:widgetUsageReachedBackend[\s\S]*localSyncProbe:activityNativeCaptured[\s\S]*localSyncProbe:activityReachedBackend[\s\S]*sessionRestoreProbe:restoredLocalSession[\s\S]*sessionRestoreProbe:backendMeAfterRestore[\s\S]*stabilityProbe:allExpectedWindowsVisible[\s\S]*stabilityProbe:syncLoopsStillRunning[\s\S]*stopCleanupProbe:activeProjectRoomCleared[\s\S]*stopCleanupProbe:allExpectedWindowsHidden[\s\S]*stopCleanupProbe:syncLoopsStopped/,
      source: qaSource,
    },
  ];

  for (const check of checks) {
    if (!check.pattern.test(check.source)) {
      throw new Error(`Tauri real OAuth QA contract failed: ${check.name}`);
    }
  }

  return checks.map((check) => check.name);
}

function validateRealOAuthQaReport(report) {
  assert(report && typeof report === "object", "QA report must be an object.");
  const serialized = JSON.stringify(report);
  assert(!forbiddenReportFieldPattern().test(serialized), "QA report must not include raw tokens or user identifiers.");

  assert(report.status === "passed" || report.status === "failed", "QA report status must be passed or failed.");
  assert(Number.isFinite(report.attemptCount) && report.attemptCount >= 1, "QA report attemptCount must be positive.");
  assert(Number.isFinite(report.durationMs) && report.durationMs >= 0, "QA report durationMs must be non-negative.");
  assert(typeof report.finishedAt === "string" && report.finishedAt.length > 0, "QA report finishedAt is required.");
  assert(typeof report.platform === "string" && report.platform.length > 0, "QA report platform is required.");
  assert(typeof report.reason === "string" && report.reason.length > 0, "QA report reason is required.");

  if (report.status === "failed") {
    return;
  }

  assert(report.error === undefined, "Passed QA report must not include an error.");
  assert(report.assertion?.ok === true, "Passed QA report must include assertion.ok=true.");
  assert(
    Array.isArray(report.assertion.failedChecks) && report.assertion.failedChecks.length === 0,
    "Passed QA report must not include failed checks.",
  );

  const snapshot = report.assertion.snapshot;
  assert(snapshot && typeof snapshot === "object", "Passed QA report must include a snapshot.");
  assert(snapshot.localSession?.hasSession, "Passed QA report must include a local auth session.");
  assert(snapshot.localSession.clientType === "TAURI", "Passed QA local session must be TAURI.");
  assert(snapshot.localSession.isDevAccessTokenSession === false, "Passed QA local session must not be dev-token.");
  assert(snapshot.localSession.refreshTokenExpired === false, "Passed QA local refresh token must be live.");
  assert(snapshot.tauriMirrorSession?.hasSession, "Passed QA report must include a Tauri mirror session.");
  assert(snapshot.tauriMirrorSession.clientType === "TAURI", "Passed QA Tauri mirror session must be TAURI.");
  assert(
    snapshot.tauriMirrorSession.isDevAccessTokenSession === false,
    "Passed QA Tauri mirror session must not be dev-token.",
  );
  assert(snapshot.tauriMirrorSession.refreshTokenExpired === false, "Passed QA Tauri mirror refresh token must be live.");
  assert(snapshot.backend?.me?.ok, "Passed QA report must prove /api/me.");
  assert(snapshot.backend?.widgetContext?.ok, "Passed QA report must prove /api/widget/context.");
  assert(snapshot.backend?.widgetSummary?.ok, "Passed QA report must prove /api/widget/summary.");
  assert(snapshot.activeProjectRoom?.hasSelectedRoom, "Passed QA report must have a selected project room.");
  assert(snapshot.activeProjectRoom.tauriMatchesMemory, "Passed QA report must match Tauri and memory room context.");
  assert(
    snapshot.activeProjectRoom.tauriMatchesServerContext,
    "Passed QA report must match Tauri and server room context.",
  );
  assert(snapshot.widgetRuntime?.allExpectedWindowsVisible, "Passed QA report must prove all widgets are visible.");
  assert(
    snapshot.widgetRuntime.allWindowRoomContextMatchesActive,
    "Passed QA report must prove widget windows match active room.",
  );
  assert(
    snapshot.widgetRuntime.allWindowRoomContextMatchesServer,
    "Passed QA report must prove widget windows match server room.",
  );
  assert(snapshot.syncRuntime?.allAutoSyncLoopsRunning, "Passed QA report must prove all auto-sync loops are running.");
  assert(
    snapshot.syncRuntime.managedFolderStatus?.running === snapshot.syncRuntime.managedFolderAutoSyncRunning,
    "Passed QA report must prove managed-folder watcher status matches the running flag.",
  );
  assert(
    snapshot.syncRuntime.managedFolderStatus.lastStatus !== "failed",
    "Passed QA report managed-folder watcher status must not be failed.",
  );
  assert(snapshot.localSyncProbe?.enabled, "Passed QA report must include the real OAuth local sync probe.");
  assert(!snapshot.localSyncProbe.error, "Passed QA local sync probe must not include an error.");
  assert(snapshot.localSyncProbe.sqlite?.ok, "Passed QA local sync probe must prove SQLite quick_check.");
  assert(snapshot.localSyncProbe.localFiles?.enabled, "Passed QA local sync probe must include local file tracking.");
  assert(!snapshot.localSyncProbe.localFiles.error, "Passed QA local file probe must not include an error.");
  assert(snapshot.localSyncProbe.localFiles.localFolderId, "Passed QA local file probe must select a managed folder.");
  assert((snapshot.localSyncProbe.localFiles.scanFileCount ?? 0) >= 1, "Passed QA local file probe must scan files.");
  assert(snapshot.localSyncProbe.localFiles.initialSearchMatched, "Passed QA local file probe must search the initial file.");
  assert(snapshot.localSyncProbe.localFiles.initialPreviewReady, "Passed QA local file probe must read the initial preview.");
  assert(
    snapshot.localSyncProbe.localFiles.initialPreviewIncludesMarker,
    "Passed QA local file probe must prove initial preview contents.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.stagedCreatedCount ?? 0) >= 1,
    "Passed QA local file probe must stage a CREATED event.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.initialSyncSentCount ?? 0) >= 1 &&
      (snapshot.localSyncProbe.localFiles.initialSyncSyncedCount ?? 0) >= 1 &&
      snapshot.localSyncProbe.localFiles.initialSyncFailedCount === 0,
    "Passed QA local file probe must sync the initial file event to backend.",
  );
  assert(snapshot.localSyncProbe.localFiles.mutationRequested, "Passed QA local file probe must mutate the fixture file.");
  assert(
    snapshot.localSyncProbe.localFiles.reindexStatus === "REINDEXED" &&
      snapshot.localSyncProbe.localFiles.reindexChanged,
    "Passed QA local file probe must reindex changed local content.",
  );
  assert(snapshot.localSyncProbe.localFiles.updatedSearchMatched, "Passed QA local file probe must search updated content.");
  assert(snapshot.localSyncProbe.localFiles.updatedPreviewReady, "Passed QA local file probe must read updated preview.");
  assert(
    snapshot.localSyncProbe.localFiles.updatedPreviewIncludesMarker,
    "Passed QA local file probe must prove updated preview contents.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.stagedUpdatedCount ?? 0) >= 1,
    "Passed QA local file probe must stage an UPDATED event.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.updateSyncSentCount ?? 0) >= 1 &&
      (snapshot.localSyncProbe.localFiles.updateSyncSyncedCount ?? 0) >= 1 &&
      snapshot.localSyncProbe.localFiles.updateSyncFailedCount === 0,
    "Passed QA local file probe must sync the updated file event to backend.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.remainingQaEvents === 0,
    "Passed QA local file probe must leave no pending QA file events.",
  );
  assert(snapshot.localSyncProbe.widgetUsageQueued, "Passed QA local sync probe must queue widget usage.");
  assert(snapshot.localSyncProbe.outbox?.status === "ready", "Passed QA local sync probe must finish outbox sync.");
  assert(
    (snapshot.localSyncProbe.outbox?.widgetSentCount ?? 0) >= 1,
    "Passed QA local sync probe must send widget usage to backend.",
  );
  assert(
    snapshot.localSyncProbe.outbox?.widgetFailedCount === 0,
    "Passed QA local sync probe must not fail widget usage sync.",
  );
  if (snapshot.localSyncProbe.activity?.consentGranted) {
    assert(
      snapshot.localSyncProbe.activity.nativeCaptured,
      "Passed QA local sync probe must read the native foreground activity when consent is on.",
    );
    assert(snapshot.localSyncProbe.activity.queued, "Passed QA local sync probe must queue activity when consent is on.");
    assert(
      (snapshot.localSyncProbe.outbox?.activitySentCount ?? 0) >= 1,
      "Passed QA local sync probe must send activity to backend when consent is on.",
    );
    assert(
      snapshot.localSyncProbe.outbox?.activityFailedCount === 0,
      "Passed QA local sync probe must not fail activity sync when consent is on.",
    );
  }
  assert(snapshot.stabilityProbe?.enabled, "Passed QA report must include the real OAuth stability probe.");
  assert(!snapshot.stabilityProbe.error, "Passed QA stability probe must not include an error.");
  assert((snapshot.stabilityProbe.dwellMs ?? 0) >= 1000, "Passed QA stability probe must dwell before re-checking.");
  assert(
    snapshot.stabilityProbe.allExpectedWindowsVisible,
    "Passed QA stability probe must prove all widgets stay visible.",
  );
  assert(
    snapshot.stabilityProbe.allWindowRoomContextMatchesActive,
    "Passed QA stability probe must prove widget windows keep active room context.",
  );
  assert(
    snapshot.stabilityProbe.allWindowRoomContextMatchesServer,
    "Passed QA stability probe must prove widget windows keep server room context.",
  );
  assert(
    snapshot.stabilityProbe.barRestoreItemsMatchActiveRoom,
    "Passed QA stability probe must prove bar restore items keep room context.",
  );
  assert(snapshot.stabilityProbe.allAutoSyncLoopsRunning, "Passed QA stability probe must keep sync loops running.");
  assert(
    snapshot.stabilityProbe.managedFolderStatusNotFailed,
    "Passed QA stability probe managed-folder watcher status must not be failed.",
  );
  assert(snapshot.stabilityProbe.backendWidgetSummaryOk, "Passed QA stability probe must prove widget summary after dwell.");
  assert(snapshot.sessionRestoreProbe?.enabled, "Passed QA report must include the real OAuth session restore probe.");
  assert(!snapshot.sessionRestoreProbe.error, "Passed QA session restore probe must not include an error.");
  assert(
    snapshot.sessionRestoreProbe.browserSessionCleared,
    "Passed QA session restore probe must clear localStorage before restore.",
  );
  assert(
    snapshot.sessionRestoreProbe.restoredLocalSession,
    "Passed QA session restore probe must restore the local auth session.",
  );
  assert(
    snapshot.sessionRestoreProbe.restoredTauriClient,
    "Passed QA session restore probe must restore a TAURI client session.",
  );
  assert(
    snapshot.sessionRestoreProbe.restoredRealOAuthSession,
    "Passed QA session restore probe must restore a real OAuth session.",
  );
  assert(snapshot.sessionRestoreProbe.restoredTokenLive, "Passed QA session restore probe must restore a live token.");
  assert(snapshot.sessionRestoreProbe.backendMeOk, "Passed QA session restore probe must prove /api/me after restore.");
  assert(snapshot.stopCleanupProbe?.enabled, "Passed QA report must include the real OAuth stop cleanup probe.");
  assert(!snapshot.stopCleanupProbe.error, "Passed QA stop cleanup probe must not include an error.");
  assert(
    snapshot.stopCleanupProbe.activeProjectRoomCleared,
    "Passed QA stop cleanup probe must clear active project room context.",
  );
  assert(
    snapshot.stopCleanupProbe.allExpectedWindowsHidden,
    "Passed QA stop cleanup probe must hide all widget windows.",
  );
  assert(snapshot.stopCleanupProbe.barWindowHidden, "Passed QA stop cleanup probe must hide the widget bar.");
  assert(snapshot.stopCleanupProbe.syncLoopsStopped, "Passed QA stop cleanup probe must stop all auto-sync loops.");
}

function forbiddenReportFieldPattern() {
  return /"(accessToken|refreshToken|sessionJson|userId|userName|userBubliId|email|googleSub)"\s*:/i;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stopProcessTree(pid) {
  if (!pid) return;

  spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    encoding: "utf8",
    stdio: "ignore",
  });
}

function stripTrailingSlash(value) {
  return value.trim().replace(/\/+$/, "");
}
