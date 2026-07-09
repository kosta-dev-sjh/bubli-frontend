import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CONTRACT_ONLY = process.argv.includes("--contract");
const RAW_RELEASE_MODE =
  process.argv.includes("--release") || process.env.BUBLI_TAURI_REAL_OAUTH_QA_MODE === "release";
const INSTALLED_RELEASE_MODE =
  process.argv.includes("--installed-release") || process.env.BUBLI_TAURI_REAL_OAUTH_QA_MODE === "installed-release";
const RELEASE_MODE = RAW_RELEASE_MODE || INSTALLED_RELEASE_MODE;
const RUNTIME_MODE = INSTALLED_RELEASE_MODE ? "installed-release" : RAW_RELEASE_MODE ? "release" : "dev";
const RELEASE_EXE_PATH = join("src-tauri", "target", "release", "bubli.exe");
const RELEASE_EXE_ABSOLUTE_PATH = resolve(RELEASE_EXE_PATH);
const NSIS_SETUP_PATH = windowsInstallerSourcePath();
const PUBLIC_INSTALLER_PATH = join("public", "downloads", "windows", "Bubli-Windows-latest.exe");
const PUBLIC_MANIFEST_PATH = join("public", "downloads", "windows", "manifest.json");
const INSTALLED_EXE_PATH = join(
  process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? "", "AppData", "Local"),
  "Bubli",
  "bubli.exe",
);
const INSTALLED_EXE_ABSOLUTE_PATH = resolve(INSTALLED_EXE_PATH);
const DEFAULT_API_BASE_URL = RELEASE_MODE ? "https://bubli.n-e.kr" : "http://localhost:8080";
const API_BASE_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL);
const TIMEOUT_MS = Number(process.env.BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS ?? 300_000);
const REPORTER_TIMEOUT_MS = Number(
  process.env.BUBLI_TAURI_REAL_OAUTH_QA_REPORTER_TIMEOUT_MS ?? Math.max(10_000, TIMEOUT_MS - 60_000),
);
const REPORTER_ATTEMPT_TIMEOUT_MS = Number(
  process.env.BUBLI_TAURI_REAL_OAUTH_QA_ATTEMPT_TIMEOUT_MS ?? 30_000,
);

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
        reporterTimeoutMs: REPORTER_TIMEOUT_MS,
        runtimeMode: RUNTIME_MODE,
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
const {
  closeServer,
  deleteUrl,
  eventUrl,
  mutateUrl,
  prepareUrl,
  qaEvents,
  reportPromise,
  reportUrl,
  watchCreateUrl,
  watchDeleteUrl,
  watchMutateUrl,
} =
  await startReportServer(localSyncFixture);
const qaEnv = createQaEnv(
  reportUrl,
  eventUrl,
  localSyncFixture.folderPath,
  mutateUrl,
  prepareUrl,
  deleteUrl,
  watchCreateUrl,
  watchMutateUrl,
  watchDeleteUrl,
);
const installedReleaseArtifactSnapshot = INSTALLED_RELEASE_MODE ? createInstalledReleaseArtifactSnapshot() : null;
let child = null;
let timeout = null;

console.log("");
console.log("Tauri real Google OAuth manual QA is waiting for a login.");
console.log(`Runtime mode: ${RUNTIME_MODE}`);
console.log(`Reporter timeout: ${REPORTER_TIMEOUT_MS}ms; harness timeout: ${TIMEOUT_MS}ms`);
console.log("1. Complete Google login in the Bubli Tauri app.");
console.log("2. Keep the app open until this script prints the redacted QA report.");
console.log("3. This script does not pass a dev access token.");
console.log("");

try {
  child = spawnTauri(qaEnv);
  const rawReport = await Promise.race([
    reportPromise,
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`Timed out after ${TIMEOUT_MS}ms waiting for Tauri real OAuth QA report.`)),
        TIMEOUT_MS,
      );
    }),
  ]);
  const report = decorateQaReport(rawReport);

  validateRealOAuthQaReport(report);
  const outputPaths = writeReport(report);
  console.log(JSON.stringify({ ...outputPaths, ...report }, null, 2));

  if (report.status !== "passed") {
    throw new Error(`Tauri real OAuth manual QA failed: ${report.error ?? "assertion failed"}`);
  }

  console.log("Tauri real OAuth manual QA passed.");
} catch (error) {
  const outputPaths = writeDiagnostics(error, qaEvents);
  console.log(JSON.stringify({ ...outputPaths, error: error instanceof Error ? error.message : String(error), qaEvents }, null, 2));
  throw error;
} finally {
  if (timeout) clearTimeout(timeout);
  closeServer();
  stopProcessTree(child?.pid);
  try {
    restoreInstalledReleaseArtifacts(installedReleaseArtifactSnapshot);
  } finally {
    localSyncFixture.cleanup();
  }
}

function createQaEnv(
  reportUrl,
  eventUrl,
  localSyncFolderPath,
  localSyncMutateUrl,
  localSyncPrepareUrl,
  localSyncDeleteUrl,
  localSyncWatchCreateUrl,
  localSyncWatchMutateUrl,
  localSyncWatchDeleteUrl,
) {
  return {
    ...process.env,
    CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "1",
    CARGO_PROFILE_RELEASE_CODEGEN_UNITS: process.env.CARGO_PROFILE_RELEASE_CODEGEN_UNITS ?? "16",
    CARGO_PROFILE_RELEASE_OPT_LEVEL: process.env.CARGO_PROFILE_RELEASE_OPT_LEVEL ?? "3",
    CARGO_PROFILE_RELEASE_STRIP: process.env.CARGO_PROFILE_RELEASE_STRIP ?? "symbols",
    NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
    NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "false",
    NEXT_PUBLIC_BUBLI_PREVIEW_DATA: "false",
    NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS: "true",
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_FOLDER: localSyncFolderPath,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_DELETE_URL: localSyncDeleteUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_MUTATE_URL: localSyncMutateUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_PREPARE_URL: localSyncPrepareUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA: "true",
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_CREATE_URL: localSyncWatchCreateUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_DELETE_URL: localSyncWatchDeleteUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_MUTATE_URL: localSyncWatchMutateUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA: "true",
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS: "15000",
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA: "true",
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA: "true",
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_EVENT_URL: eventUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL: reportUrl,
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_ATTEMPT_TIMEOUT_MS: String(REPORTER_ATTEMPT_TIMEOUT_MS),
    NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS: String(REPORTER_TIMEOUT_MS),
    NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "false",
  };
}

function spawnTauri(qaEnv) {
  if (INSTALLED_RELEASE_MODE) {
    buildInstalledReleaseTauri(qaEnv);
    installReleaseBundle(qaEnv);

    if (!existsSync(INSTALLED_EXE_PATH)) {
      throw new Error(`Missing installed Tauri executable after NSIS install: ${INSTALLED_EXE_PATH}`);
    }

    return spawn(INSTALLED_EXE_PATH, [], {
      env: qaEnv,
      shell: false,
      stdio: "inherit",
    });
  }

  if (RAW_RELEASE_MODE) {
    buildReleaseTauri(qaEnv);

    if (!existsSync(RELEASE_EXE_PATH)) {
      throw new Error(`Missing Tauri release executable: ${RELEASE_EXE_PATH}`);
    }

    return spawn(RELEASE_EXE_PATH, [], {
      env: qaEnv,
      shell: false,
      stdio: "inherit",
    });
  }

  const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri:dev"], {
    env: qaEnv,
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

function buildReleaseTauri(qaEnv) {
  console.log("Building QA-instrumented Tauri release executable...");
  stopProcessByPath(RELEASE_EXE_ABSOLUTE_PATH);
  const result = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri -- build --no-bundle"], {
    env: qaEnv,
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Tauri release build failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function buildInstalledReleaseTauri(qaEnv) {
  console.log("Building QA-instrumented Tauri NSIS installer...");
  stopProcessByPath(INSTALLED_EXE_ABSOLUTE_PATH);
  const result = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri -- build"], {
    env: qaEnv,
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Tauri installed-release build failed with exit code ${result.status ?? "unknown"}.`);
  }

  if (!existsSync(NSIS_SETUP_PATH)) {
    throw new Error(`Missing Tauri NSIS installer: ${NSIS_SETUP_PATH}`);
  }
}

function installReleaseBundle(qaEnv) {
  console.log("Installing QA-instrumented Tauri NSIS bundle...");
  stopProcessByPath(INSTALLED_EXE_ABSOLUTE_PATH);
  const result = spawnSync(NSIS_SETUP_PATH, ["/S"], {
    env: qaEnv,
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Tauri NSIS silent install failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function createInstalledReleaseArtifactSnapshot() {
  if (!existsSync(PUBLIC_INSTALLER_PATH) || !existsSync(PUBLIC_MANIFEST_PATH)) {
    console.log("Skipping public installer snapshot: public Windows installer or manifest is missing.");
    return null;
  }

  const directory = mkdtempSync(join(tmpdir(), "bubli-public-installer-snapshot-"));
  const installerPath = join(directory, "Bubli-Windows-latest.exe");
  const manifestPath = join(directory, "manifest.json");
  copyFileSync(PUBLIC_INSTALLER_PATH, installerPath);
  copyFileSync(PUBLIC_MANIFEST_PATH, manifestPath);
  return { directory, installerPath, manifestPath };
}

function restoreInstalledReleaseArtifacts(snapshot) {
  if (!snapshot) {
    return;
  }

  try {
    copyFileSync(snapshot.installerPath, PUBLIC_INSTALLER_PATH);
    copyFileSync(snapshot.manifestPath, PUBLIC_MANIFEST_PATH);
    copyFileSync(snapshot.installerPath, NSIS_SETUP_PATH);
    console.log("Restored public Windows installer artifacts after QA-instrumented install.");
    reinstallPublicReleaseBundle(snapshot.installerPath);
  } finally {
    rmSync(snapshot.directory, { force: true, recursive: true });
  }
}

function reinstallPublicReleaseBundle(installerPath) {
  if (!existsSync(installerPath)) {
    return;
  }

  console.log("Reinstalling clean public Windows installer after QA.");
  stopProcessByPath(INSTALLED_EXE_ABSOLUTE_PATH);
  const result = spawnSync(installerPath, ["/S"], {
    env: process.env,
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Clean public Tauri NSIS reinstall failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function decorateQaReport(report) {
  return {
    ...report,
    harness: {
      apiBaseUrl: API_BASE_URL,
      commit: readGitValue(["rev-parse", "--short", "HEAD"]),
      installedExePath: INSTALLED_RELEASE_MODE ? INSTALLED_EXE_PATH : null,
      installerPath: INSTALLED_RELEASE_MODE ? NSIS_SETUP_PATH : null,
      releaseExePath: RAW_RELEASE_MODE ? RELEASE_EXE_PATH : null,
      runtimeMode: RUNTIME_MODE,
      script: "qa-tauri-real-oauth-manual",
      timeoutMs: TIMEOUT_MS,
    },
  };
}

function readGitValue(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function stopProcessByPath(executablePath) {
  if (process.platform !== "win32") {
    return;
  }

  spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      [
        "$target = [System.IO.Path]::GetFullPath($env:BUBLI_QA_RELEASE_EXE_PATH);",
        "Get-CimInstance Win32_Process |",
        "Where-Object { $_.ExecutablePath -eq $target } |",
        "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
      ].join(" "),
    ],
    {
      env: { ...process.env, BUBLI_QA_RELEASE_EXE_PATH: executablePath },
      shell: false,
      stdio: "inherit",
    },
  );
}

function createLocalSyncFixture() {
  const folderPath = mkdtempSync(join(tmpdir(), "bubli-real-oauth-local-sync-"));
  let currentFileName = "";
  let currentNotePath = "";
  let prepareCount = 0;
  let watchedFileName = "";
  let watchedNotePath = "";
  let watchCount = 0;
  const prepare = () => {
    prepareCount += 1;
    currentFileName = `real-oauth-local-sync-note-${prepareCount}-${Date.now()}.txt`;
    currentNotePath = join(folderPath, currentFileName);
    writeFileSync(
      currentNotePath,
      [
        "RealOAuthLocalSyncInitial",
        "Bubli Windows Tauri real OAuth local file tracking fixture.",
        "This file must be scanned, previewed, synced, mutated, reindexed, and synced again.",
        "",
      ].join("\n"),
      "utf8",
    );
    return { fileName: currentFileName, notePath: currentNotePath };
  };
  prepare();

  return {
    folderPath,
    prepare,
    mutate() {
      if (!currentNotePath) {
        prepare();
      }
      const marker = `RealOAuthLocalSyncUpdated ${new Date().toISOString()}`;
      writeFileSync(
        currentNotePath,
        [
          marker,
          "Updated searchable marker for the Windows Tauri local SQLite index.",
          "The QA server mutated this file after the initial backend sync.",
          "The Tauri app must reindex this changed content and sync an UPDATED event.",
          "",
        ].join("\n"),
        "utf8",
      );
      return { fileName: currentFileName, marker, notePath: currentNotePath };
    },
    deleteCurrent() {
      if (!currentNotePath) {
        throw new Error("No prepared local sync fixture file to delete.");
      }
      rmSync(currentNotePath, { force: true });
      return { fileName: currentFileName, notePath: currentNotePath };
    },
    createWatched() {
      watchCount += 1;
      watchedFileName = `real-oauth-watch-note-${watchCount}-${Date.now()}.txt`;
      watchedNotePath = join(folderPath, watchedFileName);
      writeFileSync(
        watchedNotePath,
        [
          "RealOAuthLocalWatchInitial",
          "Bubli Windows Tauri real OAuth native watcher fixture.",
          "This file must be detected by watchManagedFolder without a manual scan.",
          "",
        ].join("\n"),
        "utf8",
      );
      return { fileName: watchedFileName, marker: "RealOAuthLocalWatchInitial", notePath: watchedNotePath };
    },
    mutateWatched() {
      if (!watchedNotePath) {
        throw new Error("No watched local sync fixture file to mutate.");
      }
      const marker = `RealOAuthLocalWatchUpdated ${new Date().toISOString()}`;
      writeFileSync(
        watchedNotePath,
        [
          marker,
          "Updated searchable marker for the real OAuth native watcher path.",
          "The Tauri app must detect this write through the active watcher.",
          "",
        ].join("\n"),
        "utf8",
      );
      return { fileName: watchedFileName, marker, notePath: watchedNotePath };
    },
    deleteWatched() {
      if (!watchedNotePath) {
        throw new Error("No watched local sync fixture file to delete.");
      }
      rmSync(watchedNotePath, { force: true });
      return { fileName: watchedFileName, notePath: watchedNotePath };
    },
    cleanup() {
      rmSync(folderPath, { force: true, recursive: true });
    },
  };
}

function startReportServer(localSyncFixture) {
  let settled = false;
  const qaEvents = [];
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
        response.end(JSON.stringify({ fileName: mutation.fileName, marker: mutation.marker }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/delete-local-file") {
      try {
        const deleted = localSyncFixture.deleteCurrent();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify({ fileName: deleted.fileName, notePath: deleted.notePath }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/prepare-local-file") {
      try {
        const prepared = localSyncFixture.prepare();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify({ fileName: prepared.fileName, notePath: prepared.notePath }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/create-watch-file") {
      try {
        const created = localSyncFixture.createWatched();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify({ fileName: created.fileName, marker: created.marker, notePath: created.notePath }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/mutate-watch-file") {
      try {
        const mutation = localSyncFixture.mutateWatched();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify({ fileName: mutation.fileName, marker: mutation.marker, notePath: mutation.notePath }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/delete-watch-file") {
      try {
        const deleted = localSyncFixture.deleteWatched();
        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.end(JSON.stringify({ fileName: deleted.fileName, notePath: deleted.notePath }));
      } catch (error) {
        response.writeHead(500);
        response.end(error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (request.method === "POST" && request.url === "/event") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        try {
          const event = JSON.parse(body);
          validateRealOAuthQaEvent(event);
          qaEvents.push(event);
          response.writeHead(204);
          response.end();
        } catch (error) {
          response.writeHead(400);
          response.end(error instanceof Error ? error.message : String(error));
        }
      });
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
        const report = decorateQaReport(JSON.parse(body));
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
        deleteUrl: `http://127.0.0.1:${address.port}/delete-local-file`,
        eventUrl: `http://127.0.0.1:${address.port}/event`,
        mutateUrl: `http://127.0.0.1:${address.port}/mutate-local-file`,
        prepareUrl: `http://127.0.0.1:${address.port}/prepare-local-file`,
        qaEvents,
        reportPromise,
        reportUrl: `http://127.0.0.1:${address.port}/report`,
        watchCreateUrl: `http://127.0.0.1:${address.port}/create-watch-file`,
        watchDeleteUrl: `http://127.0.0.1:${address.port}/delete-watch-file`,
        watchMutateUrl: `http://127.0.0.1:${address.port}/mutate-watch-file`,
      });
    });
  });
}

function writeDiagnostics(error, qaEvents) {
  const directory = ".codex-runtime-logs";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(directory, `tauri-real-oauth-qa-diagnostics-${timestamp}.json`);
  const summaryPath = join(directory, `tauri-real-oauth-qa-diagnostics-${timestamp}.md`);
  const message = error instanceof Error ? error.message : String(error);
  mkdirSync(directory, { recursive: true });
  writeFileSync(reportPath, JSON.stringify({ error: message, qaEvents }, null, 2));
  writeFileSync(
    summaryPath,
    [
      "# Tauri Real OAuth QA Diagnostics",
      "",
      `- Error: ${message}`,
      `- Event count: ${qaEvents.length}`,
      "",
      "## Events",
      "",
      ...qaEvents.map((event, index) => `- ${index + 1}. ${event.stage}: ${event.reason}`),
      "",
    ].join("\n"),
  );
  return { reportPath, summaryPath };
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
    `- Runtime mode: ${report.harness?.runtimeMode ?? "unknown"}`,
    `- API base: ${report.harness?.apiBaseUrl ?? "unknown"}`,
    `- Commit: ${report.harness?.commit ?? "unknown"}`,
    `- Release exe: ${report.harness?.releaseExePath ?? "not used"}`,
    `- Installed exe: ${report.harness?.installedExePath ?? "not used"}`,
    `- Installer: ${report.harness?.installerPath ?? "not used"}`,
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
  const launchTimeline = snapshot.launchTimeline ?? {};
  const routeProbe = report.routeProbe ?? {};

  lines.push(
    `- Real TAURI local session: ${Boolean(snapshot.localSession?.hasSession && snapshot.localSession?.clientType === "TAURI" && snapshot.localSession?.isDevAccessTokenSession === false)}`,
    `- Real TAURI mirror session: ${Boolean(snapshot.tauriMirrorSession?.hasSession && snapshot.tauriMirrorSession?.clientType === "TAURI" && snapshot.tauriMirrorSession?.isDevAccessTokenSession === false)}`,
    `- Backend /api/me: ${Boolean(snapshot.backend?.me?.ok)}`,
    `- Backend /api/me latency ms: ${snapshot.backend?.me?.durationMs ?? "not reported"}`,
    `- Backend widget context: ${Boolean(snapshot.backend?.widgetContext?.ok)}`,
    `- Backend widget context latency ms: ${snapshot.backend?.widgetContext?.durationMs ?? "not reported"}`,
    `- Backend widget summary: ${Boolean(snapshot.backend?.widgetSummary?.ok)}`,
    `- Backend widget summary latency ms: ${snapshot.backend?.widgetSummary?.durationMs ?? "not reported"}`,
    `- Selected room propagated: ${Boolean(snapshot.activeProjectRoom?.hasSelectedRoom && snapshot.activeProjectRoom?.tauriMatchesMemory && snapshot.activeProjectRoom?.tauriMatchesServerContext)}`,
    `- Widget startup restore ready: ${Boolean(widgetStartupRestoreReady(snapshot))}`,
    `- Widget room context matches active/server: ${Boolean(snapshot.widgetRuntime?.allWindowRoomContextMatchesActive && snapshot.widgetRuntime?.allWindowRoomContextMatchesServer)}`,
    `- Auto-sync loops running: ${Boolean(snapshot.syncRuntime?.allAutoSyncLoopsRunning)}`,
    `- Managed-folder watcher healthy: ${managedFolderStatusHealthy(snapshot)}`,
    `- Managed-folder analysis count scope: ${snapshot.syncRuntime?.managedFolderStatus?.lastFileAnalysisFailedCountScope ?? "unknown"}`,
    `- SQLite quick_check: ${Boolean(localSync.sqlite?.ok)}`,
    `- Local file scan/read initial sync: ${Boolean(localFiles.initialSearchMatched && localFiles.initialPreviewReady && (localFiles.initialSyncSyncedCount ?? 0) >= 1)}`,
    `- Local file resource personal/room isolation: ${Boolean(localFiles.initialSyncedResourceResolved && localFiles.initialSyncedResourcePersonal && localFiles.initialSyncedResourceRoomIdAbsent && localFiles.initialSyncedResourceRoomListShapeOk && localFiles.initialSyncedResourceNotInSelectedRoomResources)}`,
    `- Local file initial analysis requested/failed: ${localFiles.initialSyncAnalysisRequestedCount ?? "not reported"}/${localFiles.initialSyncAnalysisFailedCount ?? "not reported"}`,
    `- Local file update/reindex sync: ${Boolean(localFiles.mutationRequested && localFiles.reindexChanged && localFiles.updatedSearchMatched && (localFiles.updateSyncSyncedCount ?? 0) >= 1)}`,
    `- Local file update analysis requested/failed: ${localFiles.updateSyncAnalysisRequestedCount ?? "not reported"}/${localFiles.updateSyncAnalysisFailedCount ?? "not reported"}`,
    `- Local file delete sync/search clear: ${Boolean(localFiles.deleteRequested && (localFiles.deleteSyncSyncedCount ?? 0) >= 1 && localFiles.deletedSearchCleared)}`,
    `- Native watcher create/update/delete sync: ${Boolean(localFiles.nativeWatchStarted && (localFiles.nativeWatchCreateSyncSyncedCount ?? 0) >= 1 && (localFiles.nativeWatchUpdateSyncSyncedCount ?? 0) >= 1 && (localFiles.nativeWatchDeleteSyncSyncedCount ?? 0) >= 1)}`,
    `- Widget usage reached backend: ${(localSync.outbox?.widgetSentCount ?? 0) >= 1}`,
    `- Activity reached backend when consented: ${
      localSync.activity?.consentGranted ? (localSync.outbox?.activitySentCount ?? 0) >= 1 : "not required"
    }`,
    `- Stability dwell ms: ${stability.dwellMs ?? 0}`,
    `- Stability widgets/sync/backend healthy: ${Boolean(widgetStartupRestoreReady(snapshot) && stability.allAutoSyncLoopsRunning && stability.backendWidgetSummaryOk)}`,
    `- Session restored from Tauri mirror: ${Boolean(sessionRestore.restoredLocalSession && sessionRestore.restoredTauriClient && sessionRestore.backendMeOk)}`,
    `- Stop cleanup closed widgets and loops: ${Boolean(stopCleanup.activeProjectRoomCleared && stopCleanup.allExpectedWindowsHidden && stopCleanup.syncLoopsStopped)}`,
    `- OAuth returned to app route without login repaint: ${Boolean(routeProbe.ok)}`,
    `- Auth validated before widget launch: ${Boolean(launchTimeline.authGateAfterBackendAuth && launchTimeline.firstWidgetOpenAfterBackendAuth)}`,
    `- Widget launch order: ${Boolean(launchTimeline.completed && launchTimeline.barWindowOpenedAt && launchTimeline.bubbleWindowsOpenedAt && launchTimeline.syncLoopsStartedAt)}`,
    "",
    "Raw tokens, session JSON, user IDs, email, and Google subject are intentionally excluded by the report validator.",
    "",
  );

  const timings = launchReadinessTimings(snapshot);
  lines.push(
    "## Launch Readiness Timing",
    "",
    `- Auth validation to auth gate enabled ms: ${timings.authValidationToAuthGateMs ?? "not reported"}`,
    `- Auth validation to widget bar visible ms: ${timings.authValidationToBarMs ?? "not reported"}`,
    `- Auth validation to bubble restore items seeded ms: ${timings.authValidationToBubblesMs ?? "not reported"}`,
    `- Auth validation to sync loops started ms: ${timings.authValidationToSyncLoopsMs ?? "not reported"}`,
    `- Launch start to completed ms: ${timings.launchStartedToCompletedMs ?? "not reported"}`,
    `- QA run duration ms: ${report.durationMs}`,
    "",
    "These timings are measured inside the QA-instrumented installed Tauri session. They are not the same as first native window paint or a synthetic browser-only page load.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function msBetween(start, end) {
  if (typeof start !== "string" || typeof end !== "string") {
    return null;
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }
  return Math.max(0, endMs - startMs);
}

function launchReadinessTimings(snapshot) {
  const timeline = snapshot?.launchTimeline ?? {};
  return {
    authValidationToAuthGateMs: msBetween(timeline.backendAuthValidatedAt, timeline.authGateEnabledAt),
    authValidationToBarMs: msBetween(timeline.backendAuthValidatedAt, timeline.barWindowOpenedAt),
    authValidationToBubblesMs: msBetween(timeline.backendAuthValidatedAt, timeline.bubbleWindowsOpenedAt),
    authValidationToSyncLoopsMs: msBetween(timeline.backendAuthValidatedAt, timeline.syncLoopsStartedAt),
    launchStartedToCompletedMs: msBetween(timeline.launchStartedAt, timeline.launchCompletedAt),
  };
}

function widgetStartupRestoreReady(snapshot) {
  const restoreWindowIds = new Set(snapshot?.widgetRuntime?.barRestoreItems?.windowIds ?? []);
  const expectedBubbleTypes = Object.keys(snapshot?.widgetRuntime?.windows ?? {});
  return Boolean(
    snapshot?.widgetRuntime?.barWindow?.windowVisible &&
      expectedBubbleTypes.length > 0 &&
      expectedBubbleTypes.every((bubbleType) => restoreWindowIds.has(bubbleType)) &&
      snapshot?.widgetRuntime?.allWindowRoomContextMatchesActive &&
      snapshot?.widgetRuntime?.allWindowRoomContextMatchesServer &&
      snapshot?.widgetRuntime?.barRestoreItems?.allMatchActiveRoom,
  );
}

function localFileProbeHealthy(snapshot) {
  const localSync = snapshot?.localSyncProbe;
  const localFiles = localSync?.localFiles;
  if (!localSync?.enabled || localSync.error || !localSync.sqlite?.ok) {
    return false;
  }
  if (!localFiles?.enabled || localFiles.error) {
    return false;
  }

  return Boolean(
    (localFiles.initialSyncSyncedCount ?? 0) >= 1 &&
      localFiles.initialSyncFailedCount === 0 &&
      (localFiles.updateSyncSyncedCount ?? 0) >= 1 &&
      localFiles.updateSyncFailedCount === 0 &&
      (localFiles.deleteSyncSyncedCount ?? 0) >= 1 &&
      localFiles.deleteSyncFailedCount === 0 &&
      localFiles.deletedSearchCleared &&
      localFiles.nativeWatchStarted &&
      (localFiles.nativeWatchCreateSyncSyncedCount ?? 0) >= 1 &&
      localFiles.nativeWatchCreateSyncFailedCount === 0 &&
      (localFiles.nativeWatchUpdateSyncSyncedCount ?? 0) >= 1 &&
      localFiles.nativeWatchUpdateSyncFailedCount === 0 &&
      (localFiles.nativeWatchDeleteSyncSyncedCount ?? 0) >= 1 &&
      localFiles.nativeWatchDeleteSyncFailedCount === 0 &&
      localFiles.remainingQaEvents === 0,
  );
}

function managedFolderStatusHealthy(snapshot) {
  if (snapshot?.syncRuntime?.managedFolderStatus?.lastStatus !== "failed") {
    return true;
  }

  return Boolean(snapshot?.syncRuntime?.managedFolderAutoSyncRunning && localFileProbeHealthy(snapshot));
}

function runContractCheck() {
  const scriptSource = readFileSync("scripts/qa-tauri-real-oauth-manual.mjs", "utf8");
  const reporterSource = readFileSync("src/lib/tauri/tauri-real-oauth-qa-reporter.tsx", "utf8");
  const qaSource = readFileSync("src/lib/tauri/tauri-auth-widget-qa.ts", "utf8");
  const checks = [
    {
      name: "script launches real OAuth QA with local sync stability session restore and stop cleanup probes without dev token",
      pattern:
        /NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "false"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_FOLDER: localSyncFolderPath[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_DELETE_URL: localSyncDeleteUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_MUTATE_URL: localSyncMutateUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_PREPARE_URL: localSyncPrepareUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_CREATE_URL: localSyncWatchCreateUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_DELETE_URL: localSyncWatchDeleteUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_MUTATE_URL: localSyncWatchMutateUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS: "15000"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA: "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_EVENT_URL: eventUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL: reportUrl[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "false"/,
      source: scriptSource,
    },
    {
      name: "script collects redacted lifecycle events for release report timeouts",
      pattern:
        /eventUrl[\s\S]*qaEvents[\s\S]*request\.method === "POST" && request\.url === "\/event"[\s\S]*validateRealOAuthQaEvent\(event\)[\s\S]*writeDiagnostics\(error, qaEvents\)/,
      source: scriptSource,
    },
    {
      name: "script gives the reporter a shorter timeout than the harness",
      pattern:
        /const REPORTER_TIMEOUT_MS = Number\([\s\S]*Math\.max\(10_000, TIMEOUT_MS - 60_000\)[\s\S]*const REPORTER_ATTEMPT_TIMEOUT_MS = Number\([\s\S]*30_000[\s\S]*Reporter timeout: \$\{REPORTER_TIMEOUT_MS\}ms; harness timeout: \$\{TIMEOUT_MS\}ms[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_ATTEMPT_TIMEOUT_MS: String\(REPORTER_ATTEMPT_TIMEOUT_MS\)[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS: String\(REPORTER_TIMEOUT_MS\)/,
      source: scriptSource,
    },
    {
      name: "script can build and launch a QA-instrumented release exe without publishing the installer",
      pattern:
        /const RAW_RELEASE_MODE[\s\S]*process\.argv\.includes\("--release"\)[\s\S]*const RELEASE_EXE_PATH = join\("src-tauri", "target", "release", "bubli\.exe"\)[\s\S]*const DEFAULT_API_BASE_URL = RELEASE_MODE \? "https:\/\/bubli\.n-e\.kr" : "http:\/\/localhost:8080"[\s\S]*if \(RAW_RELEASE_MODE\) \{[\s\S]*buildReleaseTauri\(qaEnv\)[\s\S]*spawn\(RELEASE_EXE_PATH[\s\S]*function buildReleaseTauri\(qaEnv\)[\s\S]*stopProcessByPath\(RELEASE_EXE_ABSOLUTE_PATH\)[\s\S]*"npm\.cmd run tauri -- build --no-bundle"/,
      source: scriptSource,
    },
    {
      name: "script can build install and launch a QA-instrumented installed release without publishing the public download",
      pattern:
        /const INSTALLED_RELEASE_MODE[\s\S]*process\.argv\.includes\("--installed-release"\)[\s\S]*const NSIS_SETUP_PATH = windowsInstallerSourcePath\(\)[\s\S]*const INSTALLED_EXE_PATH = join\([\s\S]*"Bubli"[\s\S]*"bubli\.exe"[\s\S]*if \(INSTALLED_RELEASE_MODE\) \{[\s\S]*buildInstalledReleaseTauri\(qaEnv\)[\s\S]*installReleaseBundle\(qaEnv\)[\s\S]*spawn\(INSTALLED_EXE_PATH[\s\S]*function buildInstalledReleaseTauri\(qaEnv\)[\s\S]*"npm\.cmd run tauri -- build"[\s\S]*function installReleaseBundle\(qaEnv\)[\s\S]*spawnSync\(NSIS_SETUP_PATH, \["\/S"\][\s\S]*function windowsInstallerSourcePath\(\)[\s\S]*\$\{productName\}_\$\{version\}_x64-setup\.exe/,
      source: scriptSource,
    },
    {
      name: "installed-release QA restores public installer artifacts and clean installed app after instrumentation",
      pattern:
        /const PUBLIC_INSTALLER_PATH = join\("public", "downloads", "windows", "Bubli-Windows-latest\.exe"\)[\s\S]*const PUBLIC_MANIFEST_PATH = join\("public", "downloads", "windows", "manifest\.json"\)[\s\S]*const installedReleaseArtifactSnapshot = INSTALLED_RELEASE_MODE \? createInstalledReleaseArtifactSnapshot\(\) : null[\s\S]*restoreInstalledReleaseArtifacts\(installedReleaseArtifactSnapshot\)[\s\S]*function restoreInstalledReleaseArtifacts\(snapshot\)[\s\S]*copyFileSync\(snapshot\.installerPath, PUBLIC_INSTALLER_PATH\)[\s\S]*copyFileSync\(snapshot\.manifestPath, PUBLIC_MANIFEST_PATH\)[\s\S]*copyFileSync\(snapshot\.installerPath, NSIS_SETUP_PATH\)[\s\S]*reinstallPublicReleaseBundle\(snapshot\.installerPath\)/,
      source: scriptSource,
    },
    {
      name: "script stops only the target QA executable before rebuilding or installing",
      pattern:
        /function stopProcessByPath\(executablePath\)[\s\S]*GetFullPath\(\$env:BUBLI_QA_RELEASE_EXE_PATH\);[\s\S]*Get-CimInstance Win32_Process[\s\S]*ExecutablePath -eq \$target[\s\S]*Stop-Process[\s\S]*BUBLI_QA_RELEASE_EXE_PATH: executablePath/,
      source: scriptSource,
    },
    {
      name: "script uses memory-safe Cargo release profile defaults for QA builds",
      pattern:
        /CARGO_BUILD_JOBS: process\.env\.CARGO_BUILD_JOBS \?\? "1"[\s\S]*CARGO_PROFILE_RELEASE_CODEGEN_UNITS: process\.env\.CARGO_PROFILE_RELEASE_CODEGEN_UNITS \?\? "16"[\s\S]*CARGO_PROFILE_RELEASE_OPT_LEVEL: process\.env\.CARGO_PROFILE_RELEASE_OPT_LEVEL \?\? "3"[\s\S]*CARGO_PROFILE_RELEASE_STRIP: process\.env\.CARGO_PROFILE_RELEASE_STRIP \?\? "symbols"/,
      source: scriptSource,
    },
    {
      name: "script validates redacted QA reports before accepting pass",
      pattern:
        /function validateRealOAuthQaReport[\s\S]*forbiddenReportFieldPattern[\s\S]*assert\(report\.routeProbe\?\.ok[\s\S]*assert\(report\.assertion\?\.ok === true[\s\S]*assert\(snapshot\.localSession\.isDevAccessTokenSession === false[\s\S]*assert\([\s\S]*snapshot\.tauriMirrorSession\.isDevAccessTokenSession === false[\s\S]*assert\(snapshot\.launchTimeline\?\.completed[\s\S]*launchReadinessTimings\(snapshot\)[\s\S]*finite readiness timing anchors[\s\S]*authGateAfterBackendAuth[\s\S]*firstWidgetOpenAfterBackendAuth[\s\S]*barWindowOpenedAt[\s\S]*bubbleWindowsOpenedAt[\s\S]*syncLoopsStartedAt[\s\S]*assert\(widgetStartupRestoreReady\(snapshot\)[\s\S]*assert\(snapshot\.syncRuntime\?\.allAutoSyncLoopsRunning[\s\S]*managedFolderStatusHealthy\(snapshot\)[\s\S]*lastFileAnalysisFailedCountScope[\s\S]*assert\(snapshot\.localSyncProbe\?\.enabled[\s\S]*assert\(snapshot\.localSyncProbe\.sqlite\?\.ok[\s\S]*snapshot\.localSyncProbe\.localFiles\?\.enabled[\s\S]*initialPreviewIncludesMarker[\s\S]*initialSyncSyncedCount[\s\S]*initialSyncedResourceResolved[\s\S]*initialSyncedResourcePersonal[\s\S]*initialSyncedResourceRoomIdAbsent[\s\S]*initialSyncedResourceRoomListChecked[\s\S]*initialSyncedResourceRoomListShapeOk[\s\S]*initialSyncedResourceNotInSelectedRoomResources[\s\S]*initialSyncAnalysisRequestedCount[\s\S]*initialSyncAnalysisFailedCount === 0[\s\S]*mutationRequested[\s\S]*reindexStatus === "REINDEXED"[\s\S]*updatedPreviewIncludesMarker[\s\S]*updateSyncSyncedCount[\s\S]*updateSyncAnalysisRequestedCount[\s\S]*updateSyncAnalysisFailedCount === 0[\s\S]*deleteRequested[\s\S]*stagedDeletedCount[\s\S]*deleteSyncSyncedCount[\s\S]*deletedSearchCleared[\s\S]*nativeWatchStarted[\s\S]*stagedNativeWatchCreatedCount[\s\S]*nativeWatchCreateSyncSyncedCount[\s\S]*nativeWatchInitialSearchMatched[\s\S]*nativeWatchMutationRequested[\s\S]*stagedNativeWatchUpdatedCount[\s\S]*nativeWatchUpdateSyncSyncedCount[\s\S]*nativeWatchUpdatedSearchMatched[\s\S]*nativeWatchDeleteRequested[\s\S]*stagedNativeWatchDeletedCount[\s\S]*nativeWatchDeleteSyncSyncedCount[\s\S]*remainingQaEvents === 0[\s\S]*snapshot\.localSyncProbe\.outbox\?\.widgetSentCount \?\? 0\) >= 1[\s\S]*snapshot\.localSyncProbe\.activity\?\.consentGranted[\s\S]*snapshot\.localSyncProbe\.activity\.nativeCaptured[\s\S]*snapshot\.localSyncProbe\.outbox\?\.activitySentCount \?\? 0\) >= 1[\s\S]*snapshot\.stabilityProbe\?\.enabled[\s\S]*widgetStartupRestoreReady\(snapshot\)[\s\S]*snapshot\.stabilityProbe\.allAutoSyncLoopsRunning[\s\S]*snapshot\.sessionRestoreProbe\?\.enabled[\s\S]*snapshot\.sessionRestoreProbe\.restoredLocalSession[\s\S]*snapshot\.sessionRestoreProbe\.backendMeOk[\s\S]*snapshot\.stopCleanupProbe\?\.enabled[\s\S]*snapshot\.stopCleanupProbe\.activeProjectRoomCleared[\s\S]*snapshot\.stopCleanupProbe\.allExpectedWindowsHidden[\s\S]*snapshot\.stopCleanupProbe\.barWindowHidden[\s\S]*snapshot\.stopCleanupProbe\.syncLoopsStopped/,
      source: scriptSource,
    },
    {
      name: "script records release/dev harness metadata in accepted reports",
      pattern:
        /const rawReport = await Promise\.race[\s\S]*const report = decorateQaReport\(rawReport\)[\s\S]*function decorateQaReport\(report\)[\s\S]*apiBaseUrl: API_BASE_URL[\s\S]*commit: readGitValue\(\["rev-parse", "--short", "HEAD"\]\)[\s\S]*installedExePath: INSTALLED_RELEASE_MODE \? INSTALLED_EXE_PATH : null[\s\S]*installerPath: INSTALLED_RELEASE_MODE \? NSIS_SETUP_PATH : null[\s\S]*releaseExePath: RAW_RELEASE_MODE \? RELEASE_EXE_PATH : null[\s\S]*runtimeMode: RUNTIME_MODE[\s\S]*Runtime mode: \$\{report\.harness\?\.runtimeMode/,
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
        /function renderEvidenceSummary\(report, reportPath\)[\s\S]*Redacted Proof[\s\S]*Real TAURI local session[\s\S]*Backend \/api\/me[\s\S]*Widget startup restore ready[\s\S]*Local file scan\/read initial sync[\s\S]*Local file resource personal\/room isolation[\s\S]*Local file update\/reindex sync[\s\S]*Local file delete sync\/search clear[\s\S]*Native watcher create\/update\/delete sync[\s\S]*Stability dwell ms[\s\S]*Session restored from Tauri mirror[\s\S]*Stop cleanup closed widgets and loops[\s\S]*OAuth returned to app route without login repaint[\s\S]*Auth validated before widget launch[\s\S]*Raw tokens, session JSON, user IDs, email, and Google subject are intentionally excluded/,
      source: scriptSource,
    },
    {
      name: "script evidence summary records launch readiness timing",
      pattern:
        /function renderEvidenceSummary\(report, reportPath\)[\s\S]*Launch Readiness Timing[\s\S]*Auth validation to auth gate enabled ms[\s\S]*Auth validation to widget bar visible ms[\s\S]*Auth validation to bubble restore items seeded ms[\s\S]*Auth validation to sync loops started ms[\s\S]*Launch start to completed ms[\s\S]*These timings are measured inside the QA-instrumented installed Tauri session/,
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
      name: "reporter posts redacted lifecycle events before and during real OAuth QA",
      pattern:
        /RealOAuthQaRouteProbe[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_EVENT_URL[\s\S]*const realOAuthQaAttemptTimeoutMs[\s\S]*const routeProbeGraceMs[\s\S]*Math\.min\(remainingMs, realOAuthQaAttemptTimeoutMs\)[\s\S]*const recordRouteSample[\s\S]*const buildRouteProbe[\s\S]*postRealOAuthQaEvent[\s\S]*stage: "mounted"[\s\S]*stage: "skipped"[\s\S]*stage: "run-start"[\s\S]*stage: "assertion"[\s\S]*stage: "report-posted"[\s\S]*stage: "report-error"/,
      source: reporterSource,
    },
    {
      name: "real OAuth assertion rejects dev tokens and requires widgets sync loops plus local sync stability restore and stop cleanup probes",
      pattern:
        /diagnostics\.clientType === "TAURI"[\s\S]*diagnostics\.isDevAccessTokenSession === false[\s\S]*diagnostics\.refreshTokenExpired === false[\s\S]*launchTimeline:completed[\s\S]*launchTimeline:authGateAfterBackendAuth[\s\S]*launchTimeline:firstWidgetOpenAfterBackendAuth[\s\S]*launchTimeline:mirrorStoredBeforeBar[\s\S]*launchTimeline:barBeforeBubbles[\s\S]*launchTimeline:syncLoopsAfterWidgets[\s\S]*widgets:startupRestoreReady[\s\S]*sync:allAutoSyncLoopsRunning[\s\S]*sync:managedFolderStatusMatchesRunningFlag[\s\S]*sync:managedFolderStatusHealthy[\s\S]*localSyncProbe:sqliteQuickCheck[\s\S]*localSyncProbe:localFileInitialPreviewMarker[\s\S]*localSyncProbe:localFileCreatedSynced[\s\S]*localSyncProbe:localFileResourceResolved[\s\S]*localSyncProbe:localFileResourcePersonal[\s\S]*localSyncProbe:localFileResourceNoRoomId[\s\S]*localSyncProbe:localFileResourceRoomListChecked[\s\S]*localSyncProbe:localFileResourceRoomListShape[\s\S]*localSyncProbe:localFileResourceNotInSelectedRoom[\s\S]*localSyncProbe:localFileUpdatedPreviewMarker[\s\S]*localSyncProbe:localFileUpdatedSynced[\s\S]*localSyncProbe:localFileDeletedSynced[\s\S]*localSyncProbe:localFileDeletedSearchCleared[\s\S]*localSyncProbe:nativeWatchStarted[\s\S]*localSyncProbe:nativeWatchCreatedSynced[\s\S]*localSyncProbe:nativeWatchUpdatedSynced[\s\S]*localSyncProbe:nativeWatchDeletedSynced[\s\S]*localSyncProbe:widgetUsageReachedBackend[\s\S]*localSyncProbe:activityNativeCaptured[\s\S]*localSyncProbe:activityReachedBackend[\s\S]*sessionRestoreProbe:restoredLocalSession[\s\S]*sessionRestoreProbe:backendMeAfterRestore[\s\S]*stabilityProbe:startupRestoreReady[\s\S]*stabilityProbe:syncLoopsStillRunning[\s\S]*stopCleanupProbe:activeProjectRoomCleared[\s\S]*stopCleanupProbe:allExpectedWindowsHidden[\s\S]*stopCleanupProbe:syncLoopsStopped/,
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

function validateRealOAuthQaEvent(event) {
  assert(event && typeof event === "object", "QA event must be an object.");
  const serialized = JSON.stringify(event);
  assert(!forbiddenReportFieldPattern().test(serialized), "QA event must not include raw tokens or user identifiers.");
  assert(typeof event.stage === "string" && event.stage.length > 0, "QA event stage is required.");
  assert(typeof event.reason === "string", "QA event reason is required.");
  assert(typeof event.pathname === "string", "QA event pathname is required.");
  assert(typeof event.timestamp === "string" && event.timestamp.length > 0, "QA event timestamp is required.");
  if (event.failedChecks !== undefined) {
    assert(Array.isArray(event.failedChecks), "QA event failedChecks must be an array when present.");
    assert(event.failedChecks.every((name) => typeof name === "string"), "QA event failedChecks entries must be strings.");
  }
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
  assert(report.harness?.script === "qa-tauri-real-oauth-manual", "QA report harness script is required.");
  assert(
    report.harness.runtimeMode === "release" ||
      report.harness.runtimeMode === "installed-release" ||
      report.harness.runtimeMode === "dev",
    "QA report harness runtimeMode must be release, installed-release, or dev.",
  );
  assert(typeof report.harness.apiBaseUrl === "string" && report.harness.apiBaseUrl.length > 0, "QA report API base is required.");

  if (report.status === "failed") {
    return;
  }

  assert(report.routeProbe?.ok, "Passed QA report must prove OAuth returned to /app without login repaint after grace.");
  assert(
    report.routeProbe.finalPathname?.startsWith("/app"),
    "Passed QA report final pathname must be an authenticated app route.",
  );
  assert(
    report.routeProbe.sawLoginPathAfterGrace === false,
    "Passed QA report must not observe /login after the route probe grace period.",
  );
  assert(
    report.routeProbe.sawAuthGateAfterGrace === false,
    "Passed QA report must not observe the authenticated app gate after the route probe grace period.",
  );
  assert(
    report.routeProbe.sawLoginSurfaceAfterGrace === false,
    "Passed QA report must not observe the login surface after the route probe grace period.",
  );
  assert(
    Array.isArray(report.routeProbe.history) && report.routeProbe.history.length >= 1,
    "Passed QA report must include redacted route history.",
  );
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
  assert(
    Number.isFinite(snapshot.backend.me.durationMs) && snapshot.backend.me.durationMs >= 0,
    "Passed QA report must include /api/me probe durationMs.",
  );
  assert(snapshot.launchTimeline?.completed, "Passed QA report must prove authenticated surface launch completed.");
  assert(!snapshot.launchTimeline.lastError, "Passed QA launch timeline must not include an error.");
  const readinessTimings = launchReadinessTimings(snapshot);
  assert(
    Object.values(readinessTimings).every((value) => Number.isFinite(value) && value >= 0),
    "Passed QA launch timeline must include finite readiness timing anchors.",
  );
  assert(
    snapshot.launchTimeline.authGateAfterBackendAuth,
    "Passed QA launch timeline must prove auth gate enabled after backend auth validation.",
  );
  assert(
    snapshot.launchTimeline.firstWidgetOpenAfterBackendAuth,
    "Passed QA launch timeline must prove widgets opened after backend auth validation.",
  );
  assert(
    snapshot.launchTimeline.sessionMirrorStoredAt &&
      snapshot.launchTimeline.barWindowOpenedAt &&
      new Date(snapshot.launchTimeline.sessionMirrorStoredAt).getTime() <=
        new Date(snapshot.launchTimeline.barWindowOpenedAt).getTime(),
    "Passed QA launch timeline must prove Tauri session mirror was stored before the widget bar opened.",
  );
  assert(
    snapshot.launchTimeline.barWindowOpenedAt &&
      snapshot.launchTimeline.bubbleWindowsOpenedAt &&
      new Date(snapshot.launchTimeline.barWindowOpenedAt).getTime() <=
        new Date(snapshot.launchTimeline.bubbleWindowsOpenedAt).getTime(),
    "Passed QA launch timeline must prove the widget bar opened before bubble windows.",
  );
  assert(
    snapshot.launchTimeline.bubbleWindowsOpenedAt &&
      snapshot.launchTimeline.syncLoopsStartedAt &&
      new Date(snapshot.launchTimeline.bubbleWindowsOpenedAt).getTime() <=
        new Date(snapshot.launchTimeline.syncLoopsStartedAt).getTime(),
    "Passed QA launch timeline must prove sync loops started after widget windows.",
  );
  assert(snapshot.backend?.widgetContext?.ok, "Passed QA report must prove /api/widget/context.");
  assert(
    Number.isFinite(snapshot.backend.widgetContext.durationMs) && snapshot.backend.widgetContext.durationMs >= 0,
    "Passed QA report must include /api/widget/context probe durationMs.",
  );
  assert(snapshot.backend?.widgetSummary?.ok, "Passed QA report must prove /api/widget/summary.");
  assert(
    Number.isFinite(snapshot.backend.widgetSummary.durationMs) && snapshot.backend.widgetSummary.durationMs >= 0,
    "Passed QA report must include /api/widget/summary probe durationMs.",
  );
  assert(snapshot.activeProjectRoom?.hasSelectedRoom, "Passed QA report must have a selected project room.");
  assert(snapshot.activeProjectRoom.tauriMatchesMemory, "Passed QA report must match Tauri and memory room context.");
  assert(
    snapshot.activeProjectRoom.tauriMatchesServerContext,
    "Passed QA report must match Tauri and server room context.",
  );
  assert(widgetStartupRestoreReady(snapshot), "Passed QA report must prove widget startup restore readiness.");
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
  assert(managedFolderStatusHealthy(snapshot), "Passed QA report managed-folder watcher status must be healthy.");
  assert(
    snapshot.syncRuntime.managedFolderStatus.lastFileAnalysisFailedCountScope === "global-auto-sync-drain" ||
      snapshot.syncRuntime.managedFolderStatus.lastFileAnalysisFailedCountScope === "folder-auto-sync-drain",
    "Passed QA report managed-folder analysis failure count scope must be explicit.",
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
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncedResourceResolved,
    "Passed QA local file probe must resolve the synced backend resource.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncedResourcePersonal,
    "Passed QA local file probe must create a PERSONAL backend resource.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncedResourceRoomIdAbsent,
    "Passed QA local file probe must not attach the synced resource to a project room.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncedResourceRoomListChecked,
    "Passed QA local file probe must check selected project room resources.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncedResourceRoomListShapeOk,
    "Passed QA selected project room resource response must include an item array.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncedResourceNotInSelectedRoomResources,
    "Passed QA local file probe must prove the personal resource did not leak into selected room resources.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.initialSyncAnalysisRequestedCount ?? 0) >= 1,
    "Passed QA local file probe must request fixture-scoped initial file analysis.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.initialSyncAnalysisFailedCount === 0,
    "Passed QA local file probe must not fail fixture-scoped initial file analysis.",
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
    (snapshot.localSyncProbe.localFiles.updateSyncAnalysisRequestedCount ?? 0) >= 1,
    "Passed QA local file probe must request fixture-scoped updated file analysis.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.updateSyncAnalysisFailedCount === 0,
    "Passed QA local file probe must not fail fixture-scoped updated file analysis.",
  );
  assert(snapshot.localSyncProbe.localFiles.deleteRequested, "Passed QA local file probe must delete the fixture file.");
  assert(
    (snapshot.localSyncProbe.localFiles.stagedDeletedCount ?? 0) >= 1,
    "Passed QA local file probe must stage a DELETED event.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.deleteSyncSentCount ?? 0) >= 1 &&
      (snapshot.localSyncProbe.localFiles.deleteSyncSyncedCount ?? 0) >= 1 &&
      snapshot.localSyncProbe.localFiles.deleteSyncFailedCount === 0,
    "Passed QA local file probe must sync the deleted file event to backend.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.deletedSearchCleared,
    "Passed QA local file probe must remove deleted content from local search.",
  );
  assert(snapshot.localSyncProbe.localFiles.nativeWatchStarted, "Passed QA local file probe must start native watching.");
  assert(
    snapshot.localSyncProbe.localFiles.nativeWatchFileName,
    "Passed QA local file probe must create a native watcher fixture file.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.stagedNativeWatchCreatedCount ?? 0) >= 1,
    "Passed QA local file probe must stage a native watcher CREATED event.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.nativeWatchCreateSyncSentCount ?? 0) >= 1 &&
      (snapshot.localSyncProbe.localFiles.nativeWatchCreateSyncSyncedCount ?? 0) >= 1 &&
      snapshot.localSyncProbe.localFiles.nativeWatchCreateSyncFailedCount === 0,
    "Passed QA local file probe must sync the native watcher CREATED event.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.nativeWatchInitialSearchMatched,
    "Passed QA local file probe must search native watcher created content.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.nativeWatchMutationRequested,
    "Passed QA local file probe must mutate the native watcher fixture file.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.stagedNativeWatchUpdatedCount ?? 0) >= 1,
    "Passed QA local file probe must stage a native watcher UPDATED event.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.nativeWatchUpdateSyncSentCount ?? 0) >= 1 &&
      (snapshot.localSyncProbe.localFiles.nativeWatchUpdateSyncSyncedCount ?? 0) >= 1 &&
      snapshot.localSyncProbe.localFiles.nativeWatchUpdateSyncFailedCount === 0,
    "Passed QA local file probe must sync the native watcher UPDATED event.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.nativeWatchUpdatedSearchMatched,
    "Passed QA local file probe must search native watcher updated content.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.nativeWatchDeleteRequested,
    "Passed QA local file probe must delete the native watcher fixture file.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.stagedNativeWatchDeletedCount ?? 0) >= 1,
    "Passed QA local file probe must stage a native watcher DELETED event.",
  );
  assert(
    (snapshot.localSyncProbe.localFiles.nativeWatchDeleteSyncSentCount ?? 0) >= 1 &&
      (snapshot.localSyncProbe.localFiles.nativeWatchDeleteSyncSyncedCount ?? 0) >= 1 &&
      snapshot.localSyncProbe.localFiles.nativeWatchDeleteSyncFailedCount === 0,
    "Passed QA local file probe must sync the native watcher DELETED event.",
  );
  assert(
    snapshot.localSyncProbe.localFiles.remainingQaEvents === 0,
    "Passed QA local file probe must leave no pending QA file events.",
  );
  assert(snapshot.localSyncProbe.widgetUsageQueued, "Passed QA local sync probe must queue widget usage.");
  assert(snapshot.localSyncProbe.outbox?.status === "ready", "Passed QA local sync probe must finish outbox sync.");
  assert(
    snapshot.localSyncProbe.outbox?.fileFailedCount === 0,
    "Passed QA local sync probe must not mix stale failed local file events into the scoped file outbox sync.",
  );
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
  assert(widgetStartupRestoreReady(snapshot), "Passed QA stability probe must prove widget startup restore readiness.");
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
    snapshot.stabilityProbe.managedFolderStatusNotFailed || managedFolderStatusHealthy(snapshot),
    "Passed QA stability probe managed-folder watcher status must be healthy.",
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

function windowsInstallerSourcePath() {
  const config = JSON.parse(readFileSync(join("src-tauri", "tauri.conf.json"), "utf8"));
  const productName = String(config.productName ?? "Bubli").trim() || "Bubli";
  const version = String(config.version ?? "").trim();
  if (!version) {
    throw new Error("src-tauri/tauri.conf.json must include a version for installed-release QA.");
  }

  return join("src-tauri", "target", "release", "bundle", "nsis", `${productName}_${version}_x64-setup.exe`);
}
