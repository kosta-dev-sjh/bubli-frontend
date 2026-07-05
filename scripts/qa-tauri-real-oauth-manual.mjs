import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const { closeServer, reportPromise, reportUrl } = await startReportServer();
const child = spawnTauri(reportUrl);
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
  const outputPath = writeReport(report);
  console.log(JSON.stringify({ reportPath: outputPath, ...report }, null, 2));

  if (report.status !== "passed") {
    throw new Error(`Tauri real OAuth manual QA failed: ${report.error ?? "assertion failed"}`);
  }

  console.log("Tauri real OAuth manual QA passed.");
} finally {
  if (timeout) clearTimeout(timeout);
  closeServer();
  stopProcessTree(child.pid);
}

function spawnTauri(reportUrl) {
  const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri:dev"], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
      NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "false",
      NEXT_PUBLIC_BUBLI_PREVIEW_DATA: "false",
      NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS: "true",
      NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA: "true",
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

function startReportServer() {
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
        reportPromise,
        reportUrl: `http://127.0.0.1:${address.port}/report`,
      });
    });
  });
}

function writeReport(report) {
  const directory = ".codex-runtime-logs";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(directory, `tauri-real-oauth-qa-${timestamp}.json`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return outputPath;
}

function runContractCheck() {
  const scriptSource = readFileSync("scripts/qa-tauri-real-oauth-manual.mjs", "utf8");
  const reporterSource = readFileSync("src/lib/tauri/tauri-real-oauth-qa-reporter.tsx", "utf8");
  const qaSource = readFileSync("src/lib/tauri/tauri-auth-widget-qa.ts", "utf8");
  const checks = [
    {
      name: "script launches real OAuth QA with local sync probe and without dev token",
      pattern:
        /NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "false"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL: reportUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "false"/,
      source: scriptSource,
    },
    {
      name: "script validates redacted QA reports before accepting pass",
      pattern:
        /function validateRealOAuthQaReport[\s\S]*forbiddenReportFieldPattern[\s\S]*assert\(report\.assertion\?\.ok === true[\s\S]*assert\(snapshot\.localSession\.isDevAccessTokenSession === false[\s\S]*assert\([\s\S]*snapshot\.tauriMirrorSession\.isDevAccessTokenSession === false[\s\S]*assert\(snapshot\.widgetRuntime\?\.allExpectedWindowsVisible[\s\S]*assert\(snapshot\.syncRuntime\?\.allAutoSyncLoopsRunning[\s\S]*assert\(snapshot\.localSyncProbe\?\.enabled[\s\S]*assert\(snapshot\.localSyncProbe\.sqlite\?\.ok[\s\S]*snapshot\.localSyncProbe\.outbox\?\.widgetSentCount \?\? 0\) >= 1/,
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
      name: "real OAuth assertion rejects dev tokens and requires widgets sync loops plus local sync probe",
      pattern:
        /diagnostics\.clientType === "TAURI"[\s\S]*diagnostics\.isDevAccessTokenSession === false[\s\S]*diagnostics\.refreshTokenExpired === false[\s\S]*widgets:allExpectedWindowsVisible[\s\S]*sync:allAutoSyncLoopsRunning[\s\S]*localSyncProbe:sqliteQuickCheck[\s\S]*localSyncProbe:widgetUsageReachedBackend/,
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
  assert(snapshot.localSyncProbe?.enabled, "Passed QA report must include the real OAuth local sync probe.");
  assert(!snapshot.localSyncProbe.error, "Passed QA local sync probe must not include an error.");
  assert(snapshot.localSyncProbe.sqlite?.ok, "Passed QA local sync probe must prove SQLite quick_check.");
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
