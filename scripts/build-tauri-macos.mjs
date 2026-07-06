import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const publishDownload = args.includes("--publish-download");
const extraTauriArgs = args.filter((arg) => arg !== "--publish-download");
const target = process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
const macosEnv = {
  ...process.env,
  ...(await readEnvFile(".env.macos.production")),
  BUBLI_TAURI_DIST_PROFILE: "macos",
};

await run("npx", ["tauri", "build", "--target", target, ...extraTauriArgs], macosEnv);

if (publishDownload) {
  await run("node", ["scripts/publish-tauri-macos-download.mjs"], process.env);
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
