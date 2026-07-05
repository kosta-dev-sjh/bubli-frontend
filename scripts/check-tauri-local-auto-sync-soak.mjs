import { spawnSync } from "node:child_process";

if (process.platform !== "win32") {
  console.log("Windows Tauri local-auto-sync soak skipped: this check is Windows-only.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["scripts/check-tauri-windows-runtime-soak.mjs", ...process.argv.slice(2)], {
  encoding: "utf8",
  env: {
    ...process.env,
    BUBLI_TAURI_RUNTIME_SMOKE_PHASES: "local-auto-sync",
    BUBLI_TAURI_RUNTIME_SOAK_DELAY_MS:
      process.env.BUBLI_TAURI_LOCAL_AUTO_SYNC_SOAK_DELAY_MS ??
      process.env.BUBLI_TAURI_RUNTIME_SOAK_DELAY_MS ??
      "1000",
    BUBLI_TAURI_RUNTIME_SOAK_ITERATIONS:
      process.env.BUBLI_TAURI_LOCAL_AUTO_SYNC_SOAK_ITERATIONS ??
      process.env.BUBLI_TAURI_RUNTIME_SOAK_ITERATIONS ??
      "3",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
