import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? resolveWsUrl(API_BASE_URL);
const ROOM_ID = "22222222-2222-4222-8222-222222222222";
const TIMEOUT_MS = Number(process.env.BUBLI_TAURI_RUNTIME_SMOKE_TIMEOUT_MS ?? 240_000);
const DEFAULT_PHASES = ["full", "restore-verify"];
const REQUESTED_PHASES = parseRequestedPhases(process.env.BUBLI_TAURI_RUNTIME_SMOKE_PHASES);
const CONTRACT_ONLY = process.argv.includes("--contract");

if (process.platform !== "win32") {
  console.log("Windows Tauri runtime smoke skipped: this check is Windows-only.");
  process.exit(0);
}

if (CONTRACT_ONLY) {
  const contractChecks = runContractCheck();
  console.log(
    JSON.stringify(
      {
        checks: contractChecks,
        mode: "contract",
        phases: REQUESTED_PHASES,
        result: "passed",
        script: "check-tauri-windows-runtime-smoke",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log("Running Windows Tauri runtime preflight...");
runNodeScript(["scripts/check-tauri-runtime-preflight.mjs"], {
  NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
});

const smokeRoot = mkdtempSync(join(tmpdir(), "bubli-tauri-runtime-smoke-"));
const managedFolderPath = join(smokeRoot, "managed-folder");
const managedFolderNotePath = join(managedFolderPath, "runtime-smoke-note.txt");
const managedFolderCsvPath = join(managedFolderPath, "runtime-smoke-table.csv");
const managedFolderTempCsvPath = join(managedFolderPath, "~$runtime-smoke-temp.csv");
const managedFolderStructuredPath = join(managedFolderPath, "runtime-smoke-structured.json");
const managedFolderRichPath = join(managedFolderPath, "runtime-smoke-rich.rtf");
const managedFolderDeletePath = join(managedFolderPath, "runtime-smoke-delete.txt");
const managedFolderManualOutboxPath = join(managedFolderPath, "runtime-smoke-manual-outbox.dat");
writeFileSync(join(smokeRoot, "README.txt"), "Bubli Tauri runtime smoke workspace.");
await import("node:fs/promises").then((fs) => fs.mkdir(managedFolderPath, { recursive: true }));
writeFileSync(
  managedFolderNotePath,
  "Codex runtime smoke verifies local file scan, preview, search, and staging.",
);
writeFileSync(
  managedFolderCsvPath,
  "title,status,owner\nRuntime smoke CSV,tracked,Codex\nManaged folder table,synced,Tauri\n",
);
writeFileSync(
  managedFolderTempCsvPath,
  "title,status\nTemporary office lock,ignored\n",
);
writeFileSync(
  managedFolderStructuredPath,
  JSON.stringify(
    {
      check: "Codex runtime smoke structured JSON local file analysis",
      requirements: ["scan", "sync", "key sentence analysis", "SQLite ledger"],
    },
    null,
    2,
  ),
);
writeFileSync(
  managedFolderRichPath,
  "{\\rtf1\\ansi Codex runtime smoke rich text local file analysis.\\par It verifies RTF extraction reaches backend analysis.}",
);
writeFileSync(managedFolderDeletePath, "Codex runtime smoke verifies watcher delete events.");

console.log("Seeding real backend data for Windows Tauri runtime smoke...");
runNodeScript(["scripts/dev-widget-real-backend.mjs", "seed"], {
  NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
});
const accessToken = runNodeScript(["scripts/dev-widget-real-backend.mjs", "token"], {
  NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
}).trim();

if (!accessToken) {
  throw new Error("Could not create local dev access token for Tauri runtime smoke.");
}

const reports = [];
for (const phase of REQUESTED_PHASES) {
  reports.push(await runRuntimeSmokePhase(phase, accessToken));
}
console.log(JSON.stringify({ phases: reports }, null, 2));
console.log("Windows Tauri runtime smoke passed.");

function runNodeScript(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${args.join(" ")} failed with exit code ${result.status}.`);
  }

  return result.stdout;
}

function runContractCheck() {
  const scriptSource = readFileSync("scripts/check-tauri-windows-runtime-smoke.mjs", "utf8");
  const runtimeSmokeRunner = readFileSync("src/lib/tauri/tauri-runtime-smoke-runner.tsx", "utf8");
  const checks = [
    {
      name: "script seeds csv structured rtf and watcher fixtures",
      pattern:
        /runtime-smoke-table\.csv[\s\S]*~\$runtime-smoke-temp\.csv[\s\S]*runtime-smoke-structured\.json[\s\S]*runtime-smoke-rich\.rtf[\s\S]*runtime-smoke-delete\.txt[\s\S]*\/mutate-folder[\s\S]*appendFileSync[\s\S]*rmSync/,
      source: scriptSource,
    },
    {
      name: "script exposes reindex and manual outbox mutation endpoints",
      pattern:
        /\/mutate-indexed-file[\s\S]*mutateIndexedFile[\s\S]*ReindexSignal[\s\S]*\/create-manual-outbox-file[\s\S]*runtime-smoke-manual-outbox\.dat/,
      source: scriptSource,
    },
    {
      name: "script passes runtime smoke env for backend websocket and local folder",
      pattern:
        /NEXT_PUBLIC_API_BASE_URL: API_BASE_URL[\s\S]*NEXT_PUBLIC_WS_URL: WS_URL[\s\S]*NEXT_PUBLIC_CHAT_TYPING_RELAY: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_FOLDER: managedFolderPath[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_ROOM_ID: ROOM_ID/,
      source: scriptSource,
    },
    {
      name: "runner verifies post-login bar and all bubble widgets with room context",
      pattern:
        /const smokeWidgetBubbles:[\s\S]*"todo"[\s\S]*"agent"[\s\S]*"chat"[\s\S]*"timer"[\s\S]*"memo"[\s\S]*"schedule"[\s\S]*"resource"[\s\S]*"alert"[\s\S]*native bar and all bubble widget windows opened after login[\s\S]*all bubble widget windows visible[\s\S]*project room context propagated to all bubble widgets/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies real backend widget context and settings persistence",
      pattern:
        /verifyRealBackendWidgetSettings[\s\S]*real backend widget settings PATCH persisted TODO layout and flags in Tauri runtime[\s\S]*real backend widget settings GET read back patched TODO layout in Tauri runtime[\s\S]*real backend widget settings restored after Tauri runtime patch[\s\S]*widgetApi\.updateContext\(\{ selectedRoomId: smokeRoomId \}\)[\s\S]*real backend widget summary uses selected project room[\s\S]*await verifyRealBackendWidgetSettings\(assert\)/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies real backend widget item state",
      pattern:
        /verifyRealBackendWidgetItemState[\s\S]*widgetApi\.updateItemState\(smokeTaskItemId[\s\S]*state: "PINNED"[\s\S]*real backend widget item state pinned readback from Tauri runtime[\s\S]*state: "VISIBLE"[\s\S]*real backend widget item state restored after Tauri runtime smoke[\s\S]*await verifyRealBackendWidgetItemState\(assert\)/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies real backend project room events catch-up",
      pattern:
        /calendarApi\.getProjectRoomEvents\(smokeRoomId, \{ afterSequence: 0, limit: 100 \}\)[\s\S]*real backend project room event catch-up returned sequence list shape[\s\S]*real backend project room event catch-up loaded seeded history[\s\S]*afterSequence: firstLastReceivedSequence[\s\S]*real backend project room event catch-up skipped already received sequences/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies SQLite backup creation and restore queueing",
      pattern:
        /checkLocalSqliteIntegrity\(\)[\s\S]*local SQLite quick_check passed[\s\S]*syncRoomMessages\(\{[\s\S]*local SQLite restore snapshot marker written[\s\S]*backupLocalSqlite\(\)[\s\S]*local SQLite backup file created[\s\S]*restoreLocalSqliteBackup\(\{ backupId: backup\.backupId \}\)[\s\S]*local SQLite restore queued for next app restart/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies SQLite restore after restart",
      pattern:
        /smokePhase === "restore-verify"[\s\S]*readRoomMessages\(\{[\s\S]*local SQLite restore applied after app restart[\s\S]*checkLocalSqliteIntegrity\(\)[\s\S]*local SQLite integrity passed after restore restart/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies activity capture backend sync and server readback",
      pattern:
        /readActivityContext\(\)[\s\S]*native foreground activity captured[\s\S]*recordActivityContext\(\{[\s\S]*stageActivityContextsForSync\(\{ limit: 50 \}\)[\s\S]*activityApi\.recordCurrentApp[\s\S]*markActivityContextSynced[\s\S]*activity buffer sync marked SQLite row as SYNCED[\s\S]*synced activity appears in real backend today readback/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies all bubble widget usage backend sync",
      pattern:
        /for \(const bubbleType of smokeWidgetBubbles\) \{[\s\S]*recordWidgetUsageEvent\(\{[\s\S]*all bubble widget usage rollups created[\s\S]*syncLocalWidgetUsageSummaryToServer\(\{[\s\S]*all bubble widget usage summaries marked SQLite rollups as SYNCED[\s\S]*synced all bubble widget usage appears in real backend today readback/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies local file scan reindex watch sync and analysis backfill",
      pattern:
        /selectManagedFolder\(\{ path: smokeFolderPath \}\)[\s\S]*scanManagedFolder[\s\S]*searchLocalFiles[\s\S]*readLocalFilePreview[\s\S]*managed folder CSV file resolved for tabular preview[\s\S]*managed folder temp CSV stayed ignored during initial scan[\s\S]*local CSV file event reached backend sync batch[\s\S]*local file event sync marked SQLite rows as SYNCED[\s\S]*reindexFile\(\{ localFileId: noteFile\.localFileId \}\)[\s\S]*local file reindex update event synced to backend[\s\S]*analyzePersonalLocalFileWithKeySentences\(\{[\s\S]*local file analysis backend job read back[\s\S]*managed folder watcher staged update and delete events[\s\S]*watched file event sync marked SQLite rows as SYNCED/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner verifies integrated outbox and post-login sync loops",
      pattern:
        /syncAllLocalOutboxToServer\(\{ limit: 50 \}\)[\s\S]*manual integrated outbox sync sent file activity and widget usage[\s\S]*launchTauriAuthenticatedSurfaces\(\)[\s\S]*post-login launcher opened all bubble widgets with project room context[\s\S]*post-login launcher started activity folder and widget sync loops[\s\S]*post-login stop cleared active project room context[\s\S]*post-login stop stopped activity folder and widget sync loops/,
      source: runtimeSmokeRunner,
    },
    {
      name: "runner keeps UI-free local auto sync phase",
      pattern:
        /verifyLocalAutoSyncLoops[\s\S]*local auto-sync activity loop repeated on smoke interval[\s\S]*lastFileEventSentCount[\s\S]*lastFileEventSyncedCount[\s\S]*lastFileAnalysisFailedCount[\s\S]*local auto-sync managed folder events drained through backend sync[\s\S]*if \(smokePhase === "local-auto-sync"\) \{[\s\S]*verifyLocalAutoSyncLoops\(assert\)[\s\S]*status: "passed"[\s\S]*return;/,
      source: runtimeSmokeRunner,
    },
  ];

  for (const check of checks) {
    if (!check.pattern.test(check.source)) {
      throw new Error(`Windows Tauri runtime smoke contract failed: ${check.name}`);
    }
  }

  return checks.map((check) => check.name);
}

async function runRuntimeSmokePhase(phase, accessToken) {
  const { closeServer, reportPromise, reportUrl } = await startReportServer();
  const child = spawnTauri(reportUrl, accessToken, phase);
  let timeout = null;

  try {
    const report = await Promise.race([
      reportPromise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Tauri runtime smoke ${phase} phase timed out after ${TIMEOUT_MS}ms`)),
          TIMEOUT_MS,
        );
      }),
    ]);

    if (report.status !== "passed") {
      console.error(JSON.stringify(report, null, 2));
      throw new Error(`Tauri runtime smoke ${phase} phase failed: ${report.error ?? report.status}`);
    }

    return { phase, ...report };
  } finally {
    if (timeout) clearTimeout(timeout);
    closeServer();
    stopProcessTree(child.pid);
  }
}

function spawnTauri(reportUrl, accessToken, phase) {
  console.log(`Starting Tauri dev runtime smoke (${phase})...`);
  const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri:dev"], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
      NEXT_PUBLIC_WS_URL: WS_URL,
      NEXT_PUBLIC_CHAT_TYPING_RELAY: "true",
      NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "true",
      NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN: accessToken,
      NEXT_PUBLIC_BUBLI_PREVIEW_DATA: "false",
      NEXT_PUBLIC_BUBLI_TAURI_ACTIVITY_CAPTURE_INTERVAL_MS: "1000",
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "true",
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_FOLDER: managedFolderPath,
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_PHASE: phase,
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_QUIT: "true",
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_REPORT_URL: reportUrl,
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_ROOM_ID: ROOM_ID,
    },
    shell: false,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.log(`Tauri dev process exited with code ${code}.`);
    }
  });

  return child;
}

function resolveWsUrl(apiBaseUrl) {
  const url = new URL("/ws", apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function parseRequestedPhases(value) {
  if (!value?.trim()) return DEFAULT_PHASES;

  const phases = value
    .split(",")
    .map((phase) => phase.trim())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_PHASES, "local-auto-sync"]);
  for (const phase of phases) {
    if (!allowed.has(phase)) {
      throw new Error(`Unsupported Tauri runtime smoke phase: ${phase}`);
    }
  }

  return phases.length > 0 ? phases : DEFAULT_PHASES;
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

    if (request.method === "POST" && request.url === "/mutate-folder") {
      try {
        const mutated = mutateManagedFolder();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify(mutated));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/mutate-indexed-file") {
      try {
        const mutated = mutateIndexedFile();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify(mutated));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/create-manual-outbox-file") {
      try {
        const created = createManualOutboxFile();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify(created));
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
        reject(new Error("Could not bind runtime smoke report server."));
        return;
      }

      resolve({
        closeServer() {
          if (!settled) {
            rejectReport(new Error("Runtime smoke report server closed before receiving a report."));
          }
          server.close();
        },
        reportPromise,
        reportUrl: `http://127.0.0.1:${address.port}/report`,
      });
    });
  });
}

function mutateManagedFolder() {
  appendFileSync(managedFolderNotePath, `\nWatcher update ${new Date().toISOString()}.`);
  rmSync(managedFolderDeletePath, { force: true });

  return {
    deletedFileName: "runtime-smoke-delete.txt",
    updatedFileName: "runtime-smoke-note.txt",
  };
}

function mutateIndexedFile() {
  const marker = `ReindexSignal ${new Date().toISOString()}`;
  appendFileSync(managedFolderNotePath, `\n${marker}.`);

  return {
    marker,
    updatedFileName: "runtime-smoke-note.txt",
  };
}

function createManualOutboxFile() {
  writeFileSync(managedFolderManualOutboxPath, `Manual outbox sync ${new Date().toISOString()}.`);

  return {
    createdFileName: "runtime-smoke-manual-outbox.dat",
  };
}

function stopProcessTree(pid) {
  if (!pid) return;

  spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    encoding: "utf8",
    stdio: "ignore",
  });
}
