import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");

const artResult = spawnSync(process.execPath, ["scripts/generate-tauri-installer-art.mjs"], {
  env: process.env,
  stdio: "inherit",
});

if (artResult.status !== 0) {
  process.exit(artResult.status ?? 1);
}

// 운영 주소를 커밋된 env 파일로 고정한다 — 빌드 PC의 .env.local(localhost)이 번들에
// 구워져 윈도우 앱이 localhost(::1 우선 해석)로 느려지는 문제를 막는다(macOS 빌드와 동일 정책).
const buildEnv = {
  ...process.env,
  ...readEnvFile(".env.windows.production"),
  CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "1",
  CARGO_PROFILE_RELEASE_CODEGEN_UNITS: process.env.CARGO_PROFILE_RELEASE_CODEGEN_UNITS ?? "16",
  CARGO_PROFILE_RELEASE_OPT_LEVEL: process.env.CARGO_PROFILE_RELEASE_OPT_LEVEL ?? "3",
  CARGO_PROFILE_RELEASE_STRIP: process.env.CARGO_PROFILE_RELEASE_STRIP ?? "symbols",
};

function readEnvFile(envPath) {
  const file = readFileSync(path.resolve(root, envPath), "utf8");
  const env = {};

  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const buildCommand = process.platform === "win32"
  ? {
      args: ["/d", "/s", "/c", "npm.cmd run tauri -- build"],
      file: process.env.ComSpec ?? "cmd.exe",
    }
  : {
      args: ["run", "tauri", "--", "build"],
      file: "npm",
    };

const buildResult = spawnSync(buildCommand.file, buildCommand.args, {
  env: buildEnv,
  stdio: "inherit",
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const publishResult = spawnSync(process.execPath, ["scripts/publish-tauri-windows-download.mjs"], {
  env: process.env,
  stdio: "inherit",
});

if (publishResult.status !== 0) {
  process.exit(publishResult.status ?? 1);
}

const checkResult = spawnSync(process.execPath, ["scripts/check-tauri-public-installer.mjs"], {
  env: process.env,
  stdio: "inherit",
});

process.exit(checkResult.status ?? 1);
