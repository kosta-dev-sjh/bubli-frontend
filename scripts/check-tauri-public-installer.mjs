import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src-tauri/target/release/bundle/nsis/Bubli_0.1.0_x64-setup.exe");
const target = resolve(root, "public/downloads/windows/Bubli-Windows-latest.exe");
const manifestTarget = resolve(root, "public/downloads/windows/manifest.json");

const manifestSource = "src-tauri/target/release/bundle/nsis/Bubli_0.1.0_x64-setup.exe";
const manifestFile = "/downloads/windows/Bubli-Windows-latest.exe";

assertNoPublicBuildQaEnv();
assertFile(source, "source NSIS installer");
assertFile(target, "public Windows installer");
assertFile(manifestTarget, "public Windows manifest");

const sourceStat = statSync(source);
const targetStat = statSync(target);
const sourceHash = sha256(source);
const targetHash = sha256(target);
const manifest = JSON.parse(readFileSync(manifestTarget, "utf8"));

assert(manifest.file === manifestFile, `manifest.file must be ${manifestFile}.`);
assert(manifest.source === manifestSource, `manifest.source must be ${manifestSource}.`);
assert(Number.isFinite(manifest.sizeBytes), "manifest.sizeBytes must be a number.");
assert(manifest.sizeBytes === targetStat.size, "manifest.sizeBytes must match the public installer size.");
assert(sourceStat.size === targetStat.size, "source NSIS installer and public installer sizes must match.");
assert(sourceHash === targetHash, "source NSIS installer and public installer SHA256 hashes must match.");
assert(typeof manifest.updatedAt === "string" && !Number.isNaN(Date.parse(manifest.updatedAt)), "manifest.updatedAt must be an ISO date.");
assertNoBundledQaMarkers(target);

console.log("Tauri public Windows installer check passed.");
console.log(JSON.stringify({
  file: manifest.file,
  sha256: targetHash,
  sizeBytes: targetStat.size,
  updatedAt: manifest.updatedAt,
}));

function assertNoPublicBuildQaEnv() {
  const forbiddenNames = Object.keys(process.env).filter((name) => {
    if (name === "BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS") return false;
    if (name === "NEXT_PUBLIC_API_BASE_URL") return true;
    if (name === "BUBLI_TAURI_REAL_OAUTH_QA_MODE") return true;
    if (name.startsWith("BUBLI_TAURI_REAL_OAUTH_")) return true;
    if (name.startsWith("NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH")) return true;
    if (name.startsWith("NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS")) return true;
    if (name.startsWith("NEXT_PUBLIC_BUBLI_DEV_")) return true;
    return false;
  });

  assert(
    forbiddenNames.length === 0,
    `public Windows installer build must not inherit QA/dev env vars: ${forbiddenNames.join(", ")}`,
  );
}

function assertNoBundledQaMarkers(path) {
  const installerText = readFileSync(path, "latin1");
  const forbiddenMarkers = [
    "NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA",
    "NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN",
    "BUBLI_TAURI_REAL_OAUTH_QA_MODE",
    "BUBLI_TAURI_RUNTIME_SMOKE",
    "NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS",
    "http://localhost",
    "http://127.0.0.1",
  ];
  const foundMarkers = forbiddenMarkers.filter((marker) => installerText.includes(marker));

  assert(
    foundMarkers.length === 0,
    `public Windows installer must not contain QA/dev markers: ${foundMarkers.join(", ")}`,
  );
}

function assertFile(path, label) {
  assert(existsSync(path), `Missing ${label}: ${path}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}
