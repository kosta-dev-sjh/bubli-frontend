import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = join(ROOT, ".next");
const SERVER_APP_DIR = join(NEXT_DIR, "server", "app");
const TAURI_DIST_DIR = join(ROOT, ".tauri-dist");

function copyRequiredFile(source, destination) {
  if (!existsSync(source)) {
    throw new Error(`Missing Tauri static asset source: ${source}`);
  }

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}

function copyIfExists(source, destination) {
  if (!existsSync(source)) return;
  for (const file of walkFiles(source)) {
    const relativePath = relative(source, file);
    copyRequiredFile(file, join(destination, relativePath));
  }
}

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(path);
    return [path];
  });
}

function routeHtmlDestination(relativePath) {
  if (relativePath === "index.html") return "index.html";
  return join(relativePath.slice(0, -extname(relativePath).length), "index.html");
}

try {
  rmSync(TAURI_DIST_DIR, { force: true, recursive: true });
  mkdirSync(TAURI_DIST_DIR, { recursive: true });

  for (const source of walkFiles(SERVER_APP_DIR)) {
    if (!statSync(source).isFile()) continue;

    const relativePath = relative(SERVER_APP_DIR, source);
    const extension = extname(relativePath);
    if (extension === ".html") {
      copyRequiredFile(source, join(TAURI_DIST_DIR, routeHtmlDestination(relativePath)));
    } else if (extension === ".rsc") {
      copyRequiredFile(source, join(TAURI_DIST_DIR, relativePath));
    }
  }

  copyIfExists(join(NEXT_DIR, "static"), join(TAURI_DIST_DIR, "_next", "static"));
  for (const source of walkFiles(join(ROOT, "public"))) {
    const relativePath = relative(join(ROOT, "public"), source);
    copyRequiredFile(source, join(TAURI_DIST_DIR, relativePath));
  }

  console.log(`Prepared Tauri static dist at ${TAURI_DIST_DIR}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
