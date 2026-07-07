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
  {
    path: "src/app/(workspace)/app/desktop/widgets/page.tsx",
    reason: "In-app widget review routes are retired; the real widget runs on /desktop-widget as a Tauri window.",
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
    pattern: /\/app\/desktop\/widgets\b/i,
    reason: "Do not route users to the retired in-app widget review surface.",
  },
  {
    pattern: /hybrid-frame__mock/i,
    reason: "Hybrid app surfaces must not keep mock-named UI classes; use neutral live-surface naming.",
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
const localOnlyWorkbookPathspecs = [
  {
    pathspec: "docs/기능_API연결_색상표_*.xlsx",
    reason:
      "API color workbooks are local-only because binary xlsx files repeatedly conflict in PRs. Keep them ignored and share regenerated exports outside Git.",
  },
  {
    pathspec: "docs/tauri-widget-platform-split-checklist-*.xlsx",
    reason:
      "Tauri widget checklist workbooks are local-only because binary xlsx files repeatedly conflict in PRs. Keep them ignored and share regenerated exports outside Git.",
  },
];
const desktopCommunicationRoutePath = join(
  ROOT,
  "src/app/(workspace)/app/desktop/communication/page.tsx",
);
const managedFolderClientPath = join(ROOT, "src/lib/local/managed-folder-client.ts");
const managedFolderAutoSyncPath = join(ROOT, "src/lib/local/managed-folder-auto-sync.ts");
const resourceBoardCommonPath = join(
  ROOT,
  "src/features/resources/components/resource-board-common.tsx",
);
const globalsCssPath = join(ROOT, "src/styles/globals.css");
const tauriLibPath = join(ROOT, "src-tauri/src/lib.rs");
const tauriSyncStatusPanelPath = join(
  ROOT,
  "src/features/settings/components/tauri-sync-status-panel.tsx",
);
const activityCapturePath = join(ROOT, "src-tauri/src/activity.rs");
const localSyncClientPath = join(ROOT, "src/lib/sync/local-sync-client.ts");
const localSyncOutboxPanelPath = join(
  ROOT,
  "src/features/settings/components/local-sync-outbox-panel.tsx",
);
const localFilesRustPath = join(ROOT, "src-tauri/src/local_files.rs");

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

for (const workbookRule of localOnlyWorkbookPathspecs) {
  const trackedPaths = listGitTracked(workbookRule.pathspec);
  if (trackedPaths.length > 0) {
    failures.push(
      `${workbookRule.pathspec}: ${workbookRule.reason} Tracked now: ${trackedPaths.join(", ")}`,
    );
  }
}

if (existsSync(appNavPath)) {
  const text = readFileSync(appNavPath, "utf8");
  if (text.includes('href: "/app/desktop/communication"')) {
    failures.push(
      "src/config/site.ts: /app/desktop/communication must not be exposed in the main app nav; use /app/chat for web communication.",
    );
  }
}

if (existsSync(desktopCommunicationRoutePath)) {
  const text = readFileSync(desktopCommunicationRoutePath, "utf8");
  if (
    !text.includes("openTauriChatWidget") ||
    !text.includes("isTauriRuntime") ||
    !text.includes("/app/chat") ||
    !text.includes("mode") ||
    !text.includes('"room"')
  ) {
    failures.push(
      "src/app/(workspace)/app/desktop/communication/page.tsx: legacy communication route must bridge to the chat widget in Tauri while preserving the /app/chat web fallback.",
    );
  }
}

if (existsSync(managedFolderClientPath)) {
  const text = readFileSync(managedFolderClientPath, "utf8");
  if (text.includes("not wired yet") && text.includes("watchPending")) {
    failures.push(
      "src/lib/local/managed-folder-client.ts: native folder watch is implemented; do not mask watch_managed_folder failures as a pending/not-wired state.",
    );
  }
  const syncFunctionBlock = text.match(
    /export async function syncPersonalLocalFileEventsToServer[\s\S]*?\n}\n\nexport async function backfillPersonalLocalFileAnalyses/,
  )?.[0];
  if (!syncFunctionBlock) {
    failures.push(
      "src/lib/local/managed-folder-client.ts: local-file event sync function must stay explicit so product rules can guard analysis side effects.",
    );
  }
  if (syncFunctionBlock?.includes("analyzePersonalLocalFileWithKeySentences")) {
    failures.push(
      "src/lib/local/managed-folder-client.ts: local-folder sync must not auto-start AI analysis; analysis must be a user-requested resource detail action.",
    );
  }
  if (syncFunctionBlock?.includes("localFileAnalysisApi.create")) {
    failures.push(
      "src/lib/local/managed-folder-client.ts: local-folder sync must not POST local-file analysis requests.",
    );
  }
}

if (existsSync(managedFolderAutoSyncPath)) {
  const text = readFileSync(managedFolderAutoSyncPath, "utf8");
  if (text.includes("backfillPersonalLocalFileAnalyses") || text.includes("stageLocalFileAnalysisBackfill")) {
    failures.push(
      "src/lib/local/managed-folder-auto-sync.ts: automatic managed-folder sync must not drain local-file AI analysis backfill.",
    );
  }
}

if (existsSync(resourceBoardCommonPath)) {
  const text = readFileSync(resourceBoardCommonPath, "utf8");
  if (
    !text.includes("findPersonalLocalFileByResourceId") ||
    !text.includes("analyzePersonalLocalFileWithKeySentences")
  ) {
    failures.push(
      "src/features/resources/components/resource-board-common.tsx: personal local-file AI analysis must remain available through the explicit resource detail action.",
    );
  }
}

if (existsSync(globalsCssPath)) {
  const text = readFileSync(globalsCssPath, "utf8");
  if (/hybrid-frame__mock/i.test(text)) {
    failures.push(
      "src/styles/globals.css: hybrid app surfaces must not keep mock-named UI classes; use neutral live-surface naming.",
    );
  }
}

if (existsSync(tauriLibPath)) {
  const text = readFileSync(tauriLibPath, "utf8");
  if (
    !text.includes("route_targets_chat_widget") ||
    !text.includes('path == "/app/chat"') ||
    !text.includes('segments[1] == "project-rooms"') ||
    !text.includes('segments[3] == "chat"')
  ) {
    failures.push(
      "src-tauri/src/lib.rs: Tauri open_main_window_route must reject /app/chat and project-room chat routes; chat belongs in the native chat widget.",
    );
  }
}

if (existsSync(tauriSyncStatusPanelPath)) {
  const text = readFileSync(tauriSyncStatusPanelPath, "utf8");
  if (
    !text.includes("hasAdapterIssue") ||
    !text.includes('result.status !== "pending"') ||
    !text.includes('result.status !== "ready"') ||
    !text.includes("hasAdapterIssue ? 1 : 0")
  ) {
    failures.push(
      "src/features/settings/components/tauri-sync-status-panel.tsx: Tauri/SQLite sync adapter failures must be surfaced as unresolved sync issues, not hidden behind an empty summary.",
    );
  }
  if (
    !text.includes("LOCAL_ACTIVITY_SYNCED_EVENT") ||
    !text.includes("PERSONAL_RESOURCES_CHANGED_EVENT") ||
    !text.includes("WIDGET_USAGE_SYNCED_EVENT") ||
    !text.includes("setRecentAutoSync") ||
    !text.includes("settings.tss.recent.detail")
  ) {
    failures.push(
      "src/features/settings/components/tauri-sync-status-panel.tsx: Tauri sync status must consume automatic activity, file, and widget sync event details instead of using them only as refresh triggers.",
    );
  }
}

if (existsSync(activityCapturePath)) {
  const text = readFileSync(activityCapturePath, "utf8");
  if (
    !text.includes("windows_app_name_from_process_path") ||
    text.includes('Ok((format!("process-{process_id}")') ||
    !text.includes("OpenProcess failed") ||
    !text.includes("process image query failed")
  ) {
    failures.push(
      "src-tauri/src/activity.rs: Windows activity capture must surface process-name lookup failures instead of recording process-id fallback names as successful activity.",
    );
  }
}

if (existsSync(localSyncClientPath)) {
  const text = readFileSync(localSyncClientPath, "utf8");
  if (
    !text.includes("syncAllLocalOutboxToServer") ||
    !text.includes("syncPersonalLocalFileEventsToServer") ||
    !text.includes("syncLocalActivityBufferToServer") ||
    !text.includes("syncLocalWidgetUsageSummaryToServer") ||
    !text.includes("waitForPendingWidgetUsageEventRecords")
  ) {
    failures.push(
      "src/lib/sync/local-sync-client.ts: manual local outbox sync must trigger file, activity, and widget usage backend sync paths together after pending widget usage event writes settle.",
    );
  }
  if (
    !text.includes("const serverSentCount = fileSentCount + activitySentCount + widgetSentCount") ||
    !text.includes("sentCount: serverSentCount")
  ) {
    failures.push(
      "src/lib/sync/local-sync-client.ts: manual local outbox sync must report sentCount as the aggregate server transfer count across file, activity, and widget usage sync paths.",
    );
  }
}

if (existsSync(localSyncOutboxPanelPath)) {
  const text = readFileSync(localSyncOutboxPanelPath, "utf8");
  if (!text.includes("syncAllLocalOutboxToServer") || text.includes("syncPersonalLocalFileEventsToServer")) {
    failures.push(
      "src/features/settings/components/local-sync-outbox-panel.tsx: the manual send queue action must use syncAllLocalOutboxToServer instead of the file-only sync path.",
    );
  }
}

if (existsSync(localFilesRustPath)) {
  const text = readFileSync(localFilesRustPath, "utf8");
  if (
    !text.includes("local_activity_buffer") ||
    !text.includes("local_widget_usage_rollups") ||
    !text.includes("local_file_events") ||
    !text.includes("operation NOT IN ('local_file_event', 'widget_usage_summary')")
  ) {
    failures.push(
      "src-tauri/src/local_files.rs: flush_sync_outbox must summarize durable file, activity, and widget usage backlog without double-counting staged outbox rows.",
    );
  }
  for (const required of [
    '"json" | "jsonl"',
    '"yaml" | "yml"',
    "is_supported_html_file",
    "is_supported_rtf_file",
    '"jsonl" => "application/x-ndjson"',
    '"yaml" | "yml" => "application/yaml"',
    "analysis_backfill_stages_structured_and_rtf_file_types",
  ]) {
    if (!text.includes(required)) {
      failures.push(
        `src-tauri/src/local_files.rs: local structured/RTF file analysis support must keep ${required}.`,
      );
    }
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

function listGitTracked(pathspec) {
  const output = execFileSync("git", ["ls-files", "--", pathspec], {
    cwd: ROOT,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
