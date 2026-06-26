import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOT = join(ROOT, "src");
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

const ALLOWED_TAURI_IMPORT_PREFIXES = ["src/lib/tauri/"];
const ALLOWED_TAURI_GLOBAL_FILES = new Set(["src/lib/tauri/is-tauri.ts"]);
const ALLOWED_INVOKE_FILES = new Set(["src/lib/tauri/ipc.ts"]);

const BOUNDARY_RULES = [
  {
    pattern: /from\s+["']@tauri-apps\/[^"']+["']|import\(["']@tauri-apps\/[^"']+["']\)/g,
    isAllowed: (relativePath) =>
      ALLOWED_TAURI_IMPORT_PREFIXES.some((prefix) => relativePath.startsWith(prefix)),
    reason: "Import Tauri packages only through src/lib/tauri.",
  },
  {
    pattern: /__TAURI(?:_INTERNALS)?__/g,
    isAllowed: (relativePath) => ALLOWED_TAURI_GLOBAL_FILES.has(relativePath),
    reason: "Check the Tauri runtime only through src/lib/tauri/is-tauri.ts.",
  },
  {
    pattern: /\binvoke\s*\(/g,
    isAllowed: (relativePath) => ALLOWED_INVOKE_FILES.has(relativePath),
    reason: "Call Tauri invoke only through src/lib/tauri/ipc.ts.",
  },
  {
    pattern: /\blocalStorage\b/g,
    isAllowed: () => false,
    reason: "Use server state or the Tauri SQLite/outbox policy instead of ad hoc browser localStorage.",
  },
];

const failures = [];

for (const filePath of walkSourceFiles(SOURCE_ROOT)) {
  const text = readFileSync(filePath, "utf8");
  const relativePath = relative(ROOT, filePath);

  for (const rule of BOUNDARY_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      if (!rule.isAllowed(relativePath)) {
        failures.push(`${relativePath}: matched "${match[0]}". ${rule.reason}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Tauri boundary check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Tauri boundary check passed.");

function* walkSourceFiles(directory) {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      yield* walkSourceFiles(absolutePath);
      continue;
    }

    if (!stat.isFile()) {
      continue;
    }

    if (SOURCE_EXTENSIONS.has(getExtension(entry))) {
      yield absolutePath;
    }
  }
}

function getExtension(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return fileName.slice(dotIndex);
}
