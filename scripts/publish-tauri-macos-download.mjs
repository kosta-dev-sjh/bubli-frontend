import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = "0.1.0";
const arch = "arm64";
const source = resolve(root, `src-tauri/target/release/bundle/dmg/Bubli_${version}_aarch64.dmg`);
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
      source: `src-tauri/target/release/bundle/dmg/Bubli_${version}_aarch64.dmg`,
      updatedAt: new Date(stat.mtimeMs).toISOString(),
      version,
    },
    null,
    2,
  )}\n`,
);

console.log(`Published macOS DMG for public download: ${target}`);
