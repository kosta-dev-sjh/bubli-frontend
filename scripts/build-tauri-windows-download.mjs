import { spawnSync } from "node:child_process";

const artResult = spawnSync(process.execPath, ["scripts/generate-tauri-installer-art.mjs"], {
  env: process.env,
  stdio: "inherit",
});

if (artResult.status !== 0) {
  process.exit(artResult.status ?? 1);
}

const buildEnv = {
  ...process.env,
  CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "1",
  CARGO_PROFILE_RELEASE_CODEGEN_UNITS: process.env.CARGO_PROFILE_RELEASE_CODEGEN_UNITS ?? "16",
  CARGO_PROFILE_RELEASE_OPT_LEVEL: process.env.CARGO_PROFILE_RELEASE_OPT_LEVEL ?? "3",
  CARGO_PROFILE_RELEASE_STRIP: process.env.CARGO_PROFILE_RELEASE_STRIP ?? "symbols",
  NEXT_PUBLIC_BUBLI_TAURI_STARTUP_PROFILE: process.env.NEXT_PUBLIC_BUBLI_TAURI_STARTUP_PROFILE ?? "windows",
};

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
