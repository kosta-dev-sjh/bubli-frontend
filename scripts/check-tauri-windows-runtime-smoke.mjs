import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? resolveWsUrl(API_BASE_URL);
const ROOM_ID = "22222222-2222-4222-8222-222222222222";
const TIMEOUT_MS = Number(process.env.BUBLI_TAURI_RUNTIME_SMOKE_TIMEOUT_MS ?? 240_000);

if (process.platform !== "win32") {
  console.log("Windows Tauri runtime smoke skipped: this check is Windows-only.");
  process.exit(0);
}

console.log("Running Windows Tauri runtime preflight...");
runNodeScript(["scripts/check-tauri-runtime-preflight.mjs"], {
  NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
});

const smokeRoot = mkdtempSync(join(tmpdir(), "bubli-tauri-runtime-smoke-"));
const managedFolderPath = join(smokeRoot, "managed-folder");
const managedFolderNotePath = join(managedFolderPath, "runtime-smoke-note.txt");
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

const fullReport = await runRuntimeSmokePhase("full", accessToken);
const restoreReport = await runRuntimeSmokePhase("restore-verify", accessToken);
console.log(JSON.stringify({ phases: [fullReport, restoreReport] }, null, 2));
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
