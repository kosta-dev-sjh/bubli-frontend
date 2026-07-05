import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API_BASE_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080");
const TIMEOUT_MS = Number(process.env.BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS ?? 300_000);
const CONTRACT_ONLY = process.argv.includes("--contract");

if (process.platform !== "win32") {
  console.log("Tauri real OAuth manual QA skipped: this script is Windows-only.");
  process.exit(0);
}

if (CONTRACT_ONLY) {
  console.log(
    JSON.stringify(
      {
        apiBaseUrl: API_BASE_URL,
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
