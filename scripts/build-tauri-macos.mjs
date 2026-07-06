import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const publishDownload = args.includes("--publish-download");
const extraTauriArgs = args.filter((arg) => arg !== "--publish-download");
const target = process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
const dmgArch = target.startsWith("aarch64") ? "aarch64" : "x64";
const tauriConfig = JSON.parse(await readFile(path.resolve(root, "src-tauri/tauri.conf.json"), "utf8"));
const productName = tauriConfig.productName ?? "Bubli";
const version = tauriConfig.version ?? "0.1.0";
const macosEnv = {
  ...process.env,
  ...(await readEnvFile(".env.macos.production")),
  BUBLI_TAURI_DIST_PROFILE: "macos",
};

await run("npx", ["tauri", "build", "--target", target, "--bundles", "app", ...extraTauriArgs], macosEnv);
await createStableDmg();

if (publishDownload) {
  await run("node", ["scripts/publish-tauri-macos-download.mjs"], process.env);
}

async function createStableDmg() {
  const bundleRoot = path.resolve(root, "src-tauri", "target", target, "release", "bundle");
  const appPath = path.join(bundleRoot, "macos", `${productName}.app`);
  const dmgDir = path.join(bundleRoot, "dmg");
  const dmgPath = path.join(dmgDir, `${productName}_${version}_${dmgArch}.dmg`);
  const stagingDir = path.join(dmgDir, ".dmg-staging");

  await rm(stagingDir, { force: true, recursive: true });
  await rm(dmgPath, { force: true });
  await mkdir(stagingDir, { recursive: true });

  try {
    await cp(appPath, path.join(stagingDir, `${productName}.app`), { force: true, recursive: true });
    await symlink("/Applications", path.join(stagingDir, "Applications"));
    await run(
      "hdiutil",
      ["create", "-volname", productName, "-srcfolder", stagingDir, "-ov", "-format", "UDZO", dmgPath],
      process.env,
    );
    console.log(`Created stable macOS DMG without Finder AppleScript: ${dmgPath}`);
  } finally {
    await rm(stagingDir, { force: true, recursive: true });
  }
}

async function run(command, commandArgs, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}`));
    });
  });
}

async function readEnvFile(envPath) {
  const file = await readFile(path.resolve(root, envPath), "utf8");
  const env = {};

  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    env[key] = stripOptionalQuotes(value);
  }

  return env;
}

function stripOptionalQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
