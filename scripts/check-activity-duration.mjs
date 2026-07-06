import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function activity(overrides) {
  return {
    appName: "bubli",
    createdAt: "2026-07-06T00:00:00.000Z",
    id: crypto.randomUUID(),
    roomId: null,
    startedAt: "2026-07-06T00:00:00.000Z",
    userId: "user-1",
    windowTitle: "Bubli",
    ...overrides,
  };
}

async function loadActivityDurationModule() {
  const sourcePath = join("src", "lib", "activity", "activity-duration.ts");
  const source = readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    fileName: sourcePath,
  });
  const tempDir = join(tmpdir(), `bubli-activity-duration-${process.pid}-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const compiledPath = join(tempDir, "activity-duration.mjs");
  writeFileSync(compiledPath, output.outputText);

  try {
    return await import(pathToFileURL(compiledPath).href);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

const { getActivityLogDurationSeconds, getDeoverlappedActivityDurationSeconds } =
  await loadActivityDurationModule();

assert(
  getActivityLogDurationSeconds(
    activity({
      durationSeconds: 42,
      endedAt: "2026-07-06T00:10:00.000Z",
    }),
  ) === 42,
  "Single activity duration must prefer explicit non-negative durationSeconds.",
);

assert(
  getActivityLogDurationSeconds(
    activity({
      durationSeconds: null,
      endedAt: "2026-07-06T00:02:30.000Z",
    }),
  ) === 150,
  "Single activity duration must fall back to endedAt-startedAt.",
);

assert(
  getDeoverlappedActivityDurationSeconds([
    activity({
      endedAt: "2026-07-06T01:00:00.000Z",
      startedAt: "2026-07-06T00:00:00.000Z",
    }),
    activity({
      endedAt: "2026-07-06T01:30:00.000Z",
      startedAt: "2026-07-06T00:30:00.000Z",
    }),
  ]) === 5_400,
  "Overlapping activity intervals must be counted once by union, not added twice.",
);

assert(
  getDeoverlappedActivityDurationSeconds([
    activity({
      endedAt: "2026-07-06T01:00:00.000Z",
      startedAt: "2026-07-06T00:00:00.000Z",
    }),
    activity({
      endedAt: "2026-07-06T02:00:00.000Z",
      startedAt: "2026-07-06T01:00:00.000Z",
    }),
  ]) === 7_200,
  "Touching activity intervals must merge into one continuous range.",
);

assert(
  getDeoverlappedActivityDurationSeconds([
    activity({
      durationSeconds: 60,
      endedAt: null,
      startedAt: "invalid",
    }),
    activity({
      endedAt: "2026-07-06T00:02:00.000Z",
      startedAt: "2026-07-06T00:00:00.000Z",
    }),
  ]) === 180,
  "Invalid intervals must use duration fallback without breaking valid interval union.",
);

assertActivityDurationSurfaceUsesDeoverlap(
  join("src", "features", "activity", "components", "activity-detection-panel.tsx"),
  "Activity detection panel",
);
assertActivityDurationSurfaceUsesDeoverlap(
  join("src", "features", "dashboard", "components", "workspace-dashboard.tsx"),
  "Workspace dashboard",
);
assertActivitySettingsSurfaceUsesPanel();
assertActivityRecordingUsesCrossWindowLock();

console.log("Activity duration de-overlap check passed.");

function assertActivityDurationSurfaceUsesDeoverlap(sourcePath, label) {
  const source = readFileSync(sourcePath, "utf8");
  assert(
    source.includes('from "@/lib/activity/activity-duration"'),
    `${label} must import the shared activity duration de-overlap helper.`,
  );
  assert(
    source.includes("getDeoverlappedActivityDurationSeconds("),
    `${label} must use the shared activity duration de-overlap helper for totals.`,
  );
  assert(
    !/reduce\s*\([\s\S]{0,180}durationSeconds/.test(source),
    `${label} must not sum raw activity durationSeconds directly.`,
  );
}

function assertActivitySettingsSurfaceUsesPanel() {
  const sourcePath = join("src", "app", "(workspace)", "app", "settings", "page.tsx");
  const source = readFileSync(sourcePath, "utf8");
  assert(
    source.includes("<ActivityDetectionPanel"),
    "Settings activity surface must route through ActivityDetectionPanel instead of duplicating duration UI.",
  );
}

function assertActivityRecordingUsesCrossWindowLock() {
  const clientSource = readFileSync(join("src", "lib", "local", "activity-client.ts"), "utf8");
  assert(
    clientSource.includes('const ACTIVITY_RECORD_LOCK_KIND = "activity_record_lock"'),
    "Activity recording must keep a shared SQLite-backed record lock key for cross-window capture.",
  );
  assert(
    /export async function recordCurrentActivityContext[\s\S]*const recordLock = await tryAcquireActivityRecordLock\(\);[\s\S]*if \(!recordLock\)[\s\S]*releaseActivityRecordLock\(recordLock\);/.test(clientSource),
    "recordCurrentActivityContext must acquire and release the shared record lock around native/backend writes.",
  );
  assert(
    /async function tryAcquireActivityRecordLock\(\)[\s\S]*readActivityRecordLockValue\(\)[\s\S]*writeActivityRecordLockValue\(value\)[\s\S]*const confirmed = await readActivityRecordLockValue\(\)[\s\S]*confirmed !== value/.test(clientSource),
    "Activity record lock must use SQLite-backed compare-after-write semantics shared by Tauri webviews.",
  );

  const autoCaptureSource = readFileSync(join("src", "lib", "local", "activity-auto-capture.ts"), "utf8");
  assert(
    /async function captureActivityOnce\(\)[\s\S]*recordCurrentActivityContext\(\{[\s\S]*recordMode: "incremental"/.test(autoCaptureSource),
    "Auto activity capture must write through recordCurrentActivityContext instead of bypassing the record lock.",
  );
  assert(
    /export async function flushActivityAutoCapture\(\)[\s\S]*recordCurrentActivityContext\(\{[\s\S]*recordMode: "incremental"[\s\S]*syncLocalActivityBufferToServer/.test(autoCaptureSource),
    "Activity flush must write through recordCurrentActivityContext before syncing the buffer.",
  );
  assert(
    !/tauriCommands\.recordActivityContext/.test(autoCaptureSource),
    "Auto-capture surfaces must not call native recordActivityContext directly.",
  );
}
