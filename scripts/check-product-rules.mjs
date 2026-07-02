import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOT = join(ROOT, "src");

const DISALLOWED_ROUTES = [
  {
    path: "src/app/(auth)/signup",
    reason: "v15 uses Google OAuth only, so the signup route must not exist.",
  },
  {
    path: "src/app/(workspace)/app/projects",
    reason: "v15 uses project_rooms as the work unit, so a separate projects route must not exist.",
  },
];

const DISALLOWED_SOURCE_PATTERNS = [
  {
    pattern: /\/signup\b/i,
    reason: "Do not link to or implement /signup.",
  },
  {
    pattern: /회원가입/,
    reason: "Do not expose local signup copy in the product UI.",
  },
  {
    pattern: /게스트/,
    reason: "Do not expose guest participation flows.",
  },
  {
    pattern: /\bguest\b/i,
    reason: "Do not expose guest participation flows.",
  },
  {
    pattern: /비회원\s*임시/,
    reason: "Do not expose temporary non-member participation flows.",
  },
  {
    pattern: /이메일\s*초대/,
    reason: "Project room invitation uses accepted friends, not email invite.",
  },
  {
    pattern: /email\s+invite/i,
    reason: "Project room invitation uses accepted friends, not email invite.",
  },
  {
    pattern: /\/app\/projects\b/i,
    reason: "Use /app/project-rooms instead of a separate projects route.",
  },
  {
    pattern: /\b(NEXT_PUBLIC_AGENT|VITE_AGENT|TAURI_AGENT|AGENT_BASE_URL|AGENT_SERVER_URL)\b/,
    reason: "Frontend and Tauri must call the API server, not an agent server directly.",
  },
];

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const failures = [];
const appNavPath = join(ROOT, "src/config/site.ts");
const generatedApiCsvPath = "docs/기능_API연결_명세_2026-07-01.csv";
const desktopCommunicationRoutePath = join(
  ROOT,
  "src/app/(workspace)/app/desktop/communication/page.tsx",
);

for (const route of DISALLOWED_ROUTES) {
  const absolutePath = join(ROOT, route.path);
  if (existsSync(absolutePath)) {
    failures.push(`${route.path}: ${route.reason}`);
  }
}

if (isGitTracked(generatedApiCsvPath)) {
  failures.push(
    `${generatedApiCsvPath}: generated CSV views must stay untracked. Keep the xlsx/source docs in Git and regenerate CSV locally when needed.`,
  );
}

if (existsSync(appNavPath)) {
  const text = readFileSync(appNavPath, "utf8");
  if (text.includes('href: "/app/desktop/communication"')) {
    failures.push(
      "src/config/site.ts: /app/desktop/communication must not be exposed in the main app nav; Tauri communication opens through the chat widget.",
    );
  }
}

if (existsSync(desktopCommunicationRoutePath)) {
  const text = readFileSync(desktopCommunicationRoutePath, "utf8");
  if (!text.includes("/app/desktop/widgets") || !text.includes("autoOpen") || !text.includes('"chat"')) {
    failures.push(
      "src/app/(workspace)/app/desktop/communication/page.tsx: legacy communication route must redirect to the widget chat surface.",
    );
  }
}

for (const filePath of walkSourceFiles(SOURCE_ROOT)) {
  const text = readFileSync(filePath, "utf8");
  const relativePath = relative(ROOT, filePath);

  for (const rule of DISALLOWED_SOURCE_PATTERNS) {
    const match = text.match(rule.pattern);
    if (match) {
      failures.push(`${relativePath}: matched "${match[0]}". ${rule.reason}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Product rule check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Product rule check passed.");

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

function isGitTracked(path) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", path], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}
