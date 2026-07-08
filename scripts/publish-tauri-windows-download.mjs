import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = windowsInstallerSourceRelative();
const source = resolve(root, sourceRelative);
const target = resolve(root, "public/downloads/windows/Bubli-Windows-latest.exe");
const manifestTarget = resolve(root, "public/downloads/windows/manifest.json");

if (!existsSync(source)) {
  console.log(`Windows installer not found, skipping public download publish: ${source}`);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const stat = statSync(target);
const hash = sha256(target);
writeFileSync(
  manifestTarget,
  `${JSON.stringify(
    {
      file: "/downloads/windows/Bubli-Windows-latest.exe",
      sha256: hash,
      sizeBytes: stat.size,
      source: sourceRelative,
      updatedAt: new Date(stat.mtimeMs).toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log(`Published Windows installer for public download: ${target}`);

function windowsInstallerSourceRelative() {
  const config = JSON.parse(readFileSync(resolve(root, "src-tauri/tauri.conf.json"), "utf8"));
  const productName = String(config.productName ?? "Bubli").trim() || "Bubli";
  const version = String(config.version ?? "").trim();
  if (!version) {
    throw new Error("src-tauri/tauri.conf.json must include a version for Windows installer publishing.");
  }

  return `src-tauri/target/release/bundle/nsis/${productName}_${version}_x64-setup.exe`;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}
