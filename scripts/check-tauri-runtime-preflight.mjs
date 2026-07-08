import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8080";
const API_BASE_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL);
const POSTGRES_CONTAINER = process.env.BUBLI_DEV_POSTGRES_CONTAINER ?? "bubli-postgres";
const REDIS_CONTAINER = process.env.BUBLI_DEV_REDIS_CONTAINER ?? "bubli-redis";
const POSTGRES_USER = process.env.BUBLI_DEV_POSTGRES_USER ?? "bubli";
const POSTGRES_DB = process.env.BUBLI_DEV_POSTGRES_DB ?? "bubli";

const checks = [];
const warnings = [];
const failures = [];

if (process.platform !== "win32") {
  console.log("Tauri runtime preflight skipped: this check is Windows-only.");
  process.exit(0);
}

await main();

async function main() {
  checkRequiredFile("src-tauri/icons/icon.ico", "Windows Tauri icon");
  checkRequiredFile("src-tauri/icons/icon.png", "Tauri PNG icon");
  checkPackageScripts();
  checkTauriConfig();
  checkCommand("node", ["--version"], "Node.js");
  checkNpm();
  checkCommand("cargo", ["--version"], "Rust Cargo");
  checkTauriCli();
  checkExistingBubliProcess();
  checkDockerRuntime();
  checkDevAccessTokenShape();
  await checkBackendHealth();
  checkOAuthLiveContract();
  await checkPortWarning("http://127.0.0.1:3000", "Next/Tauri devUrl 3000");
  await checkLoopbackBind();

  const result = failures.length === 0 ? "passed" : "failed";
  console.log(
    JSON.stringify(
      {
        result,
        apiBaseUrl: API_BASE_URL,
        checks,
        warnings,
        failures,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    console.error("Tauri runtime preflight failed.");
    process.exit(1);
  }

  console.log("Tauri runtime preflight passed.");
}

function checkRequiredFile(path, label) {
  try {
    if (!existsSync(path)) {
      fail(label, `${path} is missing.`);
      return;
    }

    const size = statSync(path).size;
    if (size <= 0) {
      fail(label, `${path} is empty.`);
      return;
    }

    pass(label, { path, size });
  } catch (error) {
    fail(label, errorMessage(error));
  }
}

function checkPackageScripts() {
  try {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const scripts = packageJson.scripts ?? {};
    const requiredScripts = {
      "check:tauri-oauth-live-contract": "node scripts/check-tauri-oauth-live-contract.mjs",
      "check:tauri-runtime-preflight": "node scripts/check-tauri-runtime-preflight.mjs",
      "check:tauri-windows-runtime-smoke": "node scripts/check-tauri-windows-runtime-smoke.mjs",
      "tauri:dev": "tauri dev",
    };

    for (const [name, expected] of Object.entries(requiredScripts)) {
      if (scripts[name] !== expected) {
        fail("package scripts", `${name} must be ${expected}.`);
        return;
      }
    }

    pass("package scripts", { scripts: Object.keys(requiredScripts) });
  } catch (error) {
    fail("package scripts", errorMessage(error));
  }
}

function checkTauriConfig() {
  try {
    const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    const mainWindow = config.app?.windows?.[0];
    const icons = new Set(config.bundle?.icon ?? []);

    if (config.build?.devUrl !== "http://localhost:3000") {
      fail("Tauri config", "build.devUrl must stay http://localhost:3000 for Windows runtime smoke.");
      return;
    }

    if (mainWindow?.url !== "/app/") {
      fail("Tauri config", "Main hybrid app window must open /app/ so packaged release assets resolve app/index.html.");
      return;
    }

    if (config.build?.frontendDist !== "../.tauri-dist") {
      fail("Tauri config", "build.frontendDist must use the prepared .tauri-dist release asset directory.");
      return;
    }

    if (!config.build?.beforeBuildCommand?.includes("scripts/prepare-tauri-dist.mjs")) {
      fail("Tauri config", "beforeBuildCommand must prepare the Tauri static asset dist after next build.");
      return;
    }

    if (mainWindow?.devtools !== false) {
      fail("Tauri config", "Main hybrid app window must keep devtools disabled.");
      return;
    }

    if (!icons.has("icons/icon.ico") || !icons.has("icons/icon.png")) {
      fail("Tauri config", "Bundle icons must include icons/icon.ico and icons/icon.png.");
      return;
    }

    pass("Tauri config", {
      devUrl: config.build.devUrl,
      windowUrl: mainWindow.url,
      devtools: mainWindow.devtools,
    });
  } catch (error) {
    fail("Tauri config", errorMessage(error));
  }
}

function checkCommand(command, args, label) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: withWindowsToolPath(process.env),
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    fail(label, result.error.message);
    return;
  }

  if (result.status !== 0) {
    fail(label, `${command} ${args.join(" ")} exited with ${result.status}: ${trimOutput(result.stderr || result.stdout)}`);
    return;
  }

  pass(label, { version: trimOutput(result.stdout || result.stderr) });
}

function checkNpm() {
  const result = spawnNpm(["--version"]);

  if (result.error) {
    fail("npm", result.error.message);
    return;
  }

  if (result.status !== 0) {
    fail("npm", `npm --version exited with ${result.status}: ${trimOutput(result.stderr || result.stdout)}`);
    return;
  }

  pass("npm", { version: trimOutput(result.stdout || result.stderr) });
}

function checkTauriCli() {
  if (!existsSync("node_modules/.bin/tauri.cmd") && !existsSync("node_modules/.bin/tauri.ps1")) {
    fail("Tauri CLI", "node_modules Tauri CLI shim is missing. Run npm ci before Windows Tauri QA.");
    return;
  }

  const result = spawnNpm(["exec", "tauri", "--", "--version"]);

  if (result.error) {
    fail("Tauri CLI", result.error.message);
    return;
  }

  if (result.status !== 0) {
    fail("Tauri CLI", `npm exec tauri -- --version exited with ${result.status}: ${trimOutput(result.stderr || result.stdout)}`);
    return;
  }

  pass("Tauri CLI", { version: trimOutput(result.stdout || result.stderr) });
}

function checkExistingBubliProcess() {
  if (process.env.BUBLI_TAURI_RUNTIME_SMOKE_ALLOW_EXISTING_BUBLI === "1") {
    warn("Bubli process single-instance guard", "Existing bubli.exe process check was bypassed by environment.");
    return;
  }

  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-Process bubli -ErrorAction SilentlyContinue | Select-Object Id,Path | ConvertTo-Json -Compress",
    ],
    {
      encoding: "utf8",
      env: withWindowsToolPath(process.env),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error) {
    warn("Bubli process single-instance guard", result.error.message);
    return;
  }

  if (result.status !== 0) {
    const output = trimOutput(result.stderr || result.stdout);
    if (!output) {
      pass("Bubli process single-instance guard", { processStatus: "no existing bubli.exe process" });
      return;
    }

    warn("Bubli process single-instance guard", output);
    return;
  }

  const output = trimOutput(result.stdout);
  if (!output || output === "null") {
    pass("Bubli process single-instance guard", { processStatus: "no existing bubli.exe process" });
    return;
  }

  let processes;
  try {
    processes = JSON.parse(output);
  } catch {
    fail("Bubli process single-instance guard", `Could not parse existing bubli.exe process list: ${output}`);
    return;
  }

  if (!processes) {
    pass("Bubli process single-instance guard", { processStatus: "no existing bubli.exe process" });
    return;
  }

  const processList = Array.isArray(processes) ? processes : [processes];
  if (processList.length === 0) {
    pass("Bubli process single-instance guard", { processStatus: "no existing bubli.exe process" });
    return;
  }

  fail(
    "Bubli process single-instance guard",
    `Close existing Bubli before Windows runtime smoke. Existing bubli.exe blocks target\\debug\\bubli.exe via the Windows single-instance mutex: ${JSON.stringify(
      processList,
    )}`,
  );
}

function checkDockerRuntime() {
  const ps = spawnSync("docker", ["ps", "--format", "{{.Names}}\t{{.Status}}"], {
    encoding: "utf8",
    env: withWindowsToolPath(process.env),
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (ps.error) {
    fail("Docker", ps.error.message);
    return;
  }

  if (ps.status !== 0) {
    fail("Docker", `docker ps exited with ${ps.status}: ${trimOutput(ps.stderr || ps.stdout)}`);
    return;
  }

  const containers = parseDockerPs(ps.stdout);
  checkDockerContainer(containers, POSTGRES_CONTAINER, /Up/i, "Postgres container");
  checkDockerContainer(containers, REDIS_CONTAINER, /Up/i, "Redis container");
  checkPostgresReady();
  checkRedisReady();
}

function checkDockerContainer(containers, name, statusPattern, label) {
  const status = containers.get(name);
  if (!status) {
    fail(label, `${name} is not running. Start backend Docker services before Windows Tauri runtime smoke.`);
    return;
  }

  if (!statusPattern.test(status)) {
    fail(label, `${name} has unexpected status: ${status}`);
    return;
  }

  pass(label, { container: name, containerStatus: status });
}

function checkPostgresReady() {
  const result = spawnSync(
    "docker",
    ["exec", POSTGRES_CONTAINER, "pg_isready", "-U", POSTGRES_USER, "-d", POSTGRES_DB],
    {
      encoding: "utf8",
      env: withWindowsToolPath(process.env),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error) {
    fail("Postgres readiness", result.error.message);
    return;
  }

  if (result.status !== 0) {
    fail("Postgres readiness", `pg_isready exited with ${result.status}: ${trimOutput(result.stderr || result.stdout)}`);
    return;
  }

  pass("Postgres readiness", { output: trimOutput(result.stdout) });
}

function checkRedisReady() {
  const result = spawnSync("docker", ["exec", REDIS_CONTAINER, "redis-cli", "ping"], {
    encoding: "utf8",
    env: withWindowsToolPath(process.env),
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    fail("Redis readiness", result.error.message);
    return;
  }

  if (result.status !== 0 || trimOutput(result.stdout) !== "PONG") {
    fail("Redis readiness", `redis-cli ping failed: ${trimOutput(result.stderr || result.stdout)}`);
    return;
  }

  pass("Redis readiness", { output: trimOutput(result.stdout) });
}

function checkDevAccessTokenShape() {
  const result = spawnSync(process.execPath, ["scripts/dev-widget-real-backend.mjs", "token"], {
    encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: API_BASE_URL },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    fail("dev access token", result.error.message);
    return;
  }

  if (result.status !== 0) {
    fail("dev access token", `token command exited with ${result.status}: ${trimOutput(result.stderr || result.stdout)}`);
    return;
  }

  const token = result.stdout.trim();
  if (token.split(".").length !== 3) {
    fail("dev access token", "Generated local dev access token is not a JWT-shaped token.");
    return;
  }

  pass("dev access token", { jwtParts: 3 });
}

async function checkBackendHealth() {
  const healthUrl = `${API_BASE_URL}/actuator/health`;

  try {
    const response = await fetch(healthUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const text = await response.text();
    let payload = null;

    try {
      payload = JSON.parse(text);
    } catch {
      fail("backend health", `Expected JSON from ${healthUrl}, received: ${text.slice(0, 160)}`);
      return;
    }

    if (!response.ok) {
      fail("backend health", `Expected 2xx from ${healthUrl}, received ${response.status}.`);
      return;
    }

    if (payload.status && payload.status !== "UP") {
      fail("backend health", `Expected actuator status UP, received ${payload.status}.`);
      return;
    }

    pass("backend health", { url: healthUrl, healthStatus: payload.status ?? "unknown" });
  } catch (error) {
    fail("backend health", `${healthUrl} is not reachable: ${errorMessage(error)}`);
  }
}

function checkOAuthLiveContract() {
  const result = spawnSync(process.execPath, ["scripts/check-tauri-oauth-live-contract.mjs"], {
    encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: API_BASE_URL },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    fail("Tauri OAuth live contract", result.error.message);
    return;
  }

  if (result.status !== 0) {
    fail("Tauri OAuth live contract", trimOutput(result.stderr || result.stdout));
    return;
  }

  pass("Tauri OAuth live contract", { output: lastLine(result.stdout) });
}

async function checkPortWarning(url, label) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_200) });
    warn(label, `${url} already responds with HTTP ${response.status}. Existing dev server may affect tauri dev startup.`);
  } catch {
    pass(label, { portStatus: "not already serving" });
  }
}

async function checkLoopbackBind() {
  await new Promise((resolve) => {
    const server = createServer((_request, response) => {
      response.writeHead(204);
      response.end();
    });

    server.once("error", (error) => {
      fail("runtime smoke report server bind", errorMessage(error));
      resolve();
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        pass("runtime smoke report server bind", {
          host: "127.0.0.1",
          port: typeof address === "object" && address ? address.port : "unknown",
        });
        resolve();
      });
    });
  });
}

function parseDockerPs(stdout) {
  const containers = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, ...statusParts] = trimmed.split("\t");
    containers.set(name, statusParts.join("\t"));
  }
  return containers;
}

function spawnNpm(args) {
  if (process.platform !== "win32") {
    return spawnSync("npm", args, {
      encoding: "utf8",
      env: withWindowsToolPath(process.env),
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["npm.cmd", ...args].join(" ")], {
    encoding: "utf8",
    env: withWindowsToolPath(process.env),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function withWindowsToolPath(env) {
  if (process.platform !== "win32") return env;

  const dockerBin = "C:\\Program Files\\Docker\\Docker\\resources\\bin";
  return {
    ...env,
    PATH: `${dockerBin};${env.PATH ?? ""}`,
  };
}

function pass(name, detail = {}) {
  checks.push({ name, status: "passed", ...detail });
}

function warn(name, message) {
  warnings.push({ name, message });
}

function fail(name, message) {
  failures.push({ name, message });
}

function stripTrailingSlash(value) {
  return value.trim().replace(/\/+$/, "");
}

function trimOutput(value) {
  return String(value ?? "").trim();
}

function lastLine(value) {
  const lines = trimOutput(value).split(/\r?\n/).filter(Boolean);
  return lines.at(-1) ?? "";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
