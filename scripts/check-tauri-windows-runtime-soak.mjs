import { spawnSync } from "node:child_process";

const DEFAULT_ITERATIONS = 2;
const DEFAULT_DELAY_MS = 2_000;
const CONTRACT_ONLY = process.argv.includes("--contract");
const ITERATIONS = readPositiveInteger(process.env.BUBLI_TAURI_RUNTIME_SOAK_ITERATIONS, DEFAULT_ITERATIONS);
const DELAY_MS = readNonNegativeInteger(process.env.BUBLI_TAURI_RUNTIME_SOAK_DELAY_MS, DEFAULT_DELAY_MS);

if (process.platform !== "win32") {
  console.log("Windows Tauri runtime soak skipped: this check is Windows-only.");
  process.exit(0);
}

if (CONTRACT_ONLY) {
  console.log(
    JSON.stringify(
      {
        delayMs: DELAY_MS,
        iterations: ITERATIONS,
        mode: "contract",
        result: "passed",
        script: "check-tauri-windows-runtime-soak",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const startedAt = Date.now();
const iterationReports = [];

console.log(`Starting Windows Tauri runtime soak: ${ITERATIONS} iteration(s).`);

for (let index = 0; index < ITERATIONS; index += 1) {
  const iteration = index + 1;
  const iterationStartedAt = Date.now();
  console.log(`Windows Tauri runtime soak iteration ${iteration}/${ITERATIONS} starting...`);

  const result = spawnSync(process.execPath, ["scripts/check-tauri-windows-runtime-smoke.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      BUBLI_TAURI_RUNTIME_SOAK_ACTIVE: "true",
      BUBLI_TAURI_RUNTIME_SOAK_ITERATION: String(iteration),
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  const durationMs = Date.now() - iterationStartedAt;
  iterationReports.push({ durationMs, iteration, status: result.status === 0 ? "passed" : "failed" });

  if (result.status !== 0) {
    console.error(JSON.stringify({ iterations: iterationReports, result: "failed" }, null, 2));
    throw new Error(`Windows Tauri runtime soak iteration ${iteration} failed with exit code ${result.status}.`);
  }

  console.log(`Windows Tauri runtime soak iteration ${iteration}/${ITERATIONS} passed in ${durationMs}ms.`);

  if (iteration < ITERATIONS && DELAY_MS > 0) {
    await sleep(DELAY_MS);
  }
}

console.log(
  JSON.stringify(
    {
      durationMs: Date.now() - startedAt,
      iterations: iterationReports,
      result: "passed",
    },
    null,
    2,
  ),
);
console.log("Windows Tauri runtime soak passed.");

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
