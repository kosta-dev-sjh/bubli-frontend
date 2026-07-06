import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist-tauri");
const nextStaticDir = path.join(root, ".next", "static");
const nextAppDir = path.join(root, ".next", "server", "app");
const publicDir = path.join(root, "public");

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });

await copyIfExists(publicDir, distDir);
await copyIfExists(nextStaticDir, path.join(distDir, "_next", "static"));

const htmlFiles = await listFiles(nextAppDir, ".html");

for (const source of htmlFiles) {
  const relative = path.relative(nextAppDir, source);
  const target = toStaticHtmlTarget(relative);
  await copyIfExists(source, path.join(distDir, target));
}

const mainRoute = path.join(distDir, "app.html");
await copyIfExists(mainRoute, path.join(distDir, "index.html"));

console.log(
  `Prepared Tauri static dist at ${path.relative(root, distDir)} with ${htmlFiles.length} prerendered route(s).`,
);

async function copyIfExists(source, target) {
  try {
    await stat(source);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { force: true, recursive: true });
}

async function listFiles(dir, extension) {
  const files = [];

  try {
    await stat(dir);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing Next app output: ${path.relative(root, dir)}`);
    }
    throw error;
  }

  await walk(dir);
  return files;

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(entryPath);
      }
    }
  }
}

function toStaticHtmlTarget(relative) {
  return relative.replaceAll(path.sep, "/").replace(/\/index\.html$/, "/index.html");
}
