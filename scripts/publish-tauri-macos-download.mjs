import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tauriConfig = JSON.parse(readFileSync(resolve(root, "src-tauri/tauri.conf.json"), "utf8"));
const productName = tauriConfig.productName ?? "Bubli";
const version = tauriConfig.version ?? "0.1.0";
const arch = process.arch === "arm64" ? "arm64" : "x64";
const targetTriple = process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
const dmgArch = process.arch === "arm64" ? "aarch64" : "x64";
const sourceRelative = `src-tauri/target/${targetTriple}/release/bundle/dmg/${productName}_${version}_${dmgArch}.dmg`;
const source = resolve(root, sourceRelative);
const targetFile = `Bubli-macOS-${version}-${arch}.dmg`;
const target = resolve(root, "public/downloads/macos", targetFile);
const manifestTarget = resolve(root, "public/downloads/macos/manifest.json");

if (!existsSync(source)) {
  console.log(`macOS DMG not found, skipping public download publish: ${source}`);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const stat = statSync(target);
writeFileSync(
  manifestTarget,
  `${JSON.stringify(
    {
      arch,
      file: `/downloads/macos/${targetFile}`,
      sizeBytes: stat.size,
      source: sourceRelative,
      updatedAt: new Date(stat.mtimeMs).toISOString(),
      version,
    },
    null,
    2,
  )}\n`,
);

console.log(`Published macOS DMG for public download: ${target}`);
