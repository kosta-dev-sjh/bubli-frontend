import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const ROOM_ID = "22222222-2222-4222-8222-222222222222";
const TIMEOUT_MS = Number(process.env.BUBLI_TAURI_RUNTIME_SMOKE_TIMEOUT_MS ?? 240_000);

if (process.platform !== "win32") {
  console.log("Windows Tauri runtime smoke skipped: this check is Windows-only.");
  process.exit(0);
}

const smokeRoot = mkdtempSync(join(tmpdir(), "bubli-tauri-runtime-smoke-"));
const managedFolderPath = join(smokeRoot, "managed-folder");
writeFileSync(join(smokeRoot, "README.txt"), "Bubli Tauri runtime smoke workspace.");
await import("node:fs/promises").then((fs) => fs.mkdir(managedFolderPath, { recursive: true }));
writeFileSync(
  join(managedFolderPath, "runtime-smoke-note.txt"),
  "Codex runtime smoke verifies local file scan, preview, search, and staging.",
);

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

const { closeServer, reportPromise, reportUrl } = await startReportServer();
const child = spawnTauri(reportUrl, accessToken);
let timeout = null;

try {
  const report = await Promise.race([
    reportPromise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`Tauri runtime smoke timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    }),
  ]);

  if (report.status !== "passed") {
    console.error(JSON.stringify(report, null, 2));
    throw new Error(`Tauri runtime smoke failed: ${report.error ?? report.status}`);
  }

  console.log(JSON.stringify(report, null, 2));
  console.log("Windows Tauri runtime smoke passed.");
} finally {
  if (timeout) clearTimeout(timeout);
  closeServer();
  stopProcessTree(child.pid);
}

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

function spawnTauri(reportUrl, accessToken) {
  console.log("Starting Tauri dev runtime smoke...");
  const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run tauri:dev"], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
      NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN: "true",
      NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN: accessToken,
      NEXT_PUBLIC_BUBLI_PREVIEW_DATA: "false",
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE: "true",
      NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_FOLDER: managedFolderPath,
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

function stopProcessTree(pid) {
  if (!pid) return;

  spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    encoding: "utf8",
    stdio: "ignore",
  });
}
