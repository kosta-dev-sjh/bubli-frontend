import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src-tauri/target/release/bundle/nsis/Bubli_0.1.0_x64-setup.exe");
const target = resolve(root, "public/downloads/windows/Bubli-Windows-latest.exe");
const manifestTarget = resolve(root, "public/downloads/windows/manifest.json");

if (!existsSync(source)) {
  console.log(`Windows installer not found, skipping public download publish: ${source}`);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const stat = statSync(target);
writeFileSync(
  manifestTarget,
  `${JSON.stringify(
    {
      file: "/downloads/windows/Bubli-Windows-latest.exe",
      sizeBytes: stat.size,
      source: "src-tauri/target/release/bundle/nsis/Bubli_0.1.0_x64-setup.exe",
      updatedAt: new Date(stat.mtimeMs).toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log(`Published Windows installer for public download: ${target}`);
