import { readFileSync } from "node:fs";

const files = {
  packageJson: "package.json",
  appNav: "src/components/layout/app-nav.tsx",
  appShell: "src/components/layout/app-shell.tsx",
  appChat: "src/app/(workspace)/app/chat/page.tsx",
  authApi: "src/features/auth/api/authApi.ts",
  authPanel: "src/features/auth/components/auth-panel.tsx",
  authSession: "src/lib/auth/auth-session.ts",
  activityAutoCapture: "src/lib/local/activity-auto-capture.ts",
  authenticatedSurfaces: "src/lib/tauri/authenticated-surfaces.ts",
  chatWidgetRouting: "src/lib/tauri/chat-widget-routing.ts",
  desktopWidgetPage: "src/app/desktop-widget/page.tsx",
  desktopCommunicationRoute: "src/app/(workspace)/app/desktop/communication/page.tsx",
  devWidgetRealBackend: "scripts/dev-widget-real-backend.mjs",
  projectRoomChatRoute: "src/app/(workspace)/app/project-rooms/[roomId]/chat/page.tsx",
  layout: "src/app/layout.tsx",
  postLoginLauncher: "src/lib/tauri/tauri-post-login-launcher.tsx",
  realOAuthQaReporter: "src/lib/tauri/tauri-real-oauth-qa-reporter.tsx",
  authWidgetQa: "src/lib/tauri/tauri-auth-widget-qa.ts",
  managedFolderAutoSync: "src/lib/local/managed-folder-auto-sync.ts",
  firstRunController: "src/features/onboarding/components/first-run-controller.tsx",
  runtimeSmokeRunner: "src/lib/tauri/tauri-runtime-smoke-runner.tsx",
  tauriCapability: "src-tauri/capabilities/default.json",
  tauriConf: "src-tauri/tauri.conf.json",
  tauriDevtoolsGuard: "src/lib/tauri/tauri-devtools-guard.tsx",
  tauriLib: "src-tauri/src/lib.rs",
  prepareTauriDist: "scripts/prepare-tauri-dist.mjs",
  runtimePreflight: "scripts/check-tauri-runtime-preflight.mjs",
  oauthLiveContract: "scripts/check-tauri-oauth-live-contract.mjs",
  realOAuthQaScript: "scripts/qa-tauri-real-oauth-manual.mjs",
  localAutoSyncSoak: "scripts/check-tauri-local-auto-sync-soak.mjs",
  windowsRuntimeSoak: "scripts/check-tauri-windows-runtime-soak.mjs",
  windowsRuntimeSmoke: "scripts/check-tauri-windows-runtime-smoke.mjs",
  widgetAuthHeaders: "src/features/widget/api/widgetAuthHeaders.ts",
  workspaceActiveRoom: "src/lib/workspace-active-room.ts",
  workspacePreviewData: "src/lib/workspace-preview-data.ts",
};

function read(path) {
  return readFileSync(path, "utf8");
}

function assertContains(source, pattern, message) {
  const matched = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (!matched) {
    throw new Error(message);
  }
}

function assertNotContains(source, pattern, message) {
  const matched = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (matched) {
    throw new Error(message);
  }
}

function extractConstArray(source, constName) {
  const start = source.indexOf(`const ${constName}`);
  if (start === -1) {
    throw new Error(`Missing const ${constName}.`);
  }

  const arrayStart = source.indexOf("[", start);
  const arrayEnd = source.indexOf("];", arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) {
    throw new Error(`Could not parse ${constName} array.`);
  }

  return source.slice(arrayStart, arrayEnd + 2);
}

function extractTypeObject(source, typeName) {
  const start = source.indexOf(`export type ${typeName}`);
  if (start === -1) {
    throw new Error(`Missing type ${typeName}.`);
  }

  const objectStart = source.indexOf("{", start);
  const objectEnd = source.indexOf("};", objectStart);
  if (objectStart === -1 || objectEnd === -1) {
    throw new Error(`Could not parse ${typeName} type.`);
  }

  return source.slice(objectStart, objectEnd + 2);
}

const layout = read(files.layout);
const packageJson = read(files.packageJson);
const launcher = read(files.postLoginLauncher);
const realOAuthQaReporter = read(files.realOAuthQaReporter);
const authWidgetQa = read(files.authWidgetQa);
const managedFolderAutoSync = read(files.managedFolderAutoSync);
const firstRunController = read(files.firstRunController);
const runtimeSmokeRunner = read(files.runtimeSmokeRunner);
const tauriCapability = read(files.tauriCapability);
const tauriConf = read(files.tauriConf);
const tauriDevtoolsGuard = read(files.tauriDevtoolsGuard);
const tauriLib = read(files.tauriLib);
const prepareTauriDist = read(files.prepareTauriDist);
const runtimePreflight = read(files.runtimePreflight);
const oauthLiveContract = read(files.oauthLiveContract);
const realOAuthQaScript = read(files.realOAuthQaScript);
const localAutoSyncSoak = read(files.localAutoSyncSoak);
const windowsRuntimeSoak = read(files.windowsRuntimeSoak);
const surfaces = read(files.authenticatedSurfaces);
const chatWidgetRouting = read(files.chatWidgetRouting);
const appNav = read(files.appNav);
const appShell = read(files.appShell);
const appChat = read(files.appChat);
const authApi = read(files.authApi);
const authPanel = read(files.authPanel);
const authSession = read(files.authSession);
const activityAutoCapture = read(files.activityAutoCapture);
const widgetPage = read(files.desktopWidgetPage);
const widgetAuthHeaders = read(files.widgetAuthHeaders);
const workspaceActiveRoom = read(files.workspaceActiveRoom);
const workspacePreviewData = read(files.workspacePreviewData);
const desktopCommunicationRoute = read(files.desktopCommunicationRoute);
const devWidgetRealBackend = read(files.devWidgetRealBackend);
const projectRoomChatRoute = read(files.projectRoomChatRoute);
const windowsRuntimeSmoke = read(files.windowsRuntimeSmoke);
const authSessionDiagnosticsType = extractTypeObject(authSession, "AuthSessionDiagnostics");

assertContains(
  packageJson,
  /"check:tauri-runtime-preflight":\s*"node scripts\/check-tauri-runtime-preflight\.mjs"/,
  "package.json must expose the Windows Tauri runtime preflight script.",
);
assertContains(
  packageJson,
  /"qa:tauri-real-oauth":\s*"node scripts\/qa-tauri-real-oauth-manual\.mjs"/,
  "package.json must expose the manual-assisted Tauri real Google OAuth QA script.",
);
assertContains(
  packageJson,
  /"check:tauri-windows-runtime-soak":\s*"node scripts\/check-tauri-windows-runtime-soak\.mjs"/,
  "package.json must expose the Windows Tauri runtime soak QA script.",
);
assertContains(
  packageJson,
  /"check:tauri-local-auto-sync-soak":\s*"node scripts\/check-tauri-local-auto-sync-soak\.mjs"/,
  "package.json must expose the Windows local-auto-sync soak QA script.",
);
assertContains(
  layout,
  /<TauriRealOAuthQaReporter\s*\/>/,
  "Root layout must mount TauriRealOAuthQaReporter so manual real Google OAuth QA can collect a redacted report.",
);
assertContains(
  realOAuthQaReporter,
  /process\.env\.NODE_ENV === "development"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL/,
  "TauriRealOAuthQaReporter must require the explicit development-only real OAuth QA env flag and report URL.",
);
assertContains(
  realOAuthQaReporter,
  /AUTH_SESSION_CHANGE_EVENT[\s\S]*assertTauriRealGoogleAuthWidgetQa\(\)[\s\S]*postRealOAuthQaReport/,
  "TauriRealOAuthQaReporter must run the redacted real Google OAuth widget assertion after auth changes and POST the report.",
);
assertContains(
  realOAuthQaReporter,
  /runtimeSmokeEnabled[\s\S]*!realOAuthQaEnabled/,
  "TauriRealOAuthQaReporter must stay disabled during runtime smoke and unless the real OAuth QA flag is enabled.",
);
assertNotContains(
  realOAuthQaReporter,
  /NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN|accessToken\s*[?:]:|refreshToken\s*[?:]:|sessionJson\s*[?:]:/,
  "TauriRealOAuthQaReporter must not depend on dev tokens or expose raw auth secrets.",
);
assertContains(
  realOAuthQaScript,
  /NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN:\s*"false"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS:\s*"15000"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL/,
  "Manual real OAuth QA script must launch Tauri with dev-login disabled, local-sync, stability, session-restore, and stop-cleanup probes enabled, and the real OAuth QA report bridge enabled.",
);
assertNotContains(
  realOAuthQaScript,
  /NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN/,
  "Manual real OAuth QA script must not inject a dev access token.",
);
assertContains(
  realOAuthQaScript,
  /if \(CONTRACT_ONLY\) \{[\s\S]*const contractChecks = runContractCheck\(\);[\s\S]*checks: contractChecks[\s\S]*function runContractCheck\(\)/,
  "Manual real OAuth QA script contract mode must run real static checks before reporting pass.",
);
assertContains(
  realOAuthQaScript,
  /request\.on\("end"[\s\S]*const report = JSON\.parse\(body\);[\s\S]*validateRealOAuthQaReport\(report\)[\s\S]*resolveReport\(report\)/,
  "Manual real OAuth QA script must validate posted reports before accepting them.",
);
assertContains(
  realOAuthQaScript,
  /const report = await Promise\.race[\s\S]*validateRealOAuthQaReport\(report\)[\s\S]*const outputPaths = writeReport\(report\)[\s\S]*JSON\.stringify\(\{ \.\.\.outputPaths, \.\.\.report \}/,
  "Manual real OAuth QA script must validate the final report before writing JSON and markdown evidence outputs.",
);
assertContains(
  realOAuthQaScript,
  /function validateRealOAuthQaReport[\s\S]*forbiddenReportFieldPattern[\s\S]*assert\(report\.assertion\?\.ok === true[\s\S]*assert\(snapshot\.localSession\.isDevAccessTokenSession === false[\s\S]*assert\([\s\S]*snapshot\.tauriMirrorSession\.isDevAccessTokenSession === false[\s\S]*assert\(snapshot\.widgetRuntime\?\.allExpectedWindowsVisible[\s\S]*assert\(snapshot\.syncRuntime\?\.allAutoSyncLoopsRunning[\s\S]*assert\([\s\S]*snapshot\.syncRuntime\.managedFolderStatus\?\.running === snapshot\.syncRuntime\.managedFolderAutoSyncRunning[\s\S]*assert\([\s\S]*snapshot\.syncRuntime\.managedFolderStatus\.lastStatus !== "failed"[\s\S]*assert\(snapshot\.localSyncProbe\?\.enabled[\s\S]*assert\(snapshot\.localSyncProbe\.sqlite\?\.ok[\s\S]*snapshot\.localSyncProbe\.outbox\?\.widgetSentCount \?\? 0\) >= 1[\s\S]*snapshot\.localSyncProbe\.activity\?\.consentGranted[\s\S]*snapshot\.localSyncProbe\.outbox\?\.activitySentCount \?\? 0\) >= 1[\s\S]*snapshot\.stabilityProbe\?\.enabled[\s\S]*snapshot\.stabilityProbe\.allExpectedWindowsVisible[\s\S]*snapshot\.stabilityProbe\.allAutoSyncLoopsRunning[\s\S]*snapshot\.sessionRestoreProbe\?\.enabled[\s\S]*snapshot\.sessionRestoreProbe\.restoredLocalSession[\s\S]*snapshot\.sessionRestoreProbe\.backendMeOk[\s\S]*snapshot\.stopCleanupProbe\?\.enabled[\s\S]*snapshot\.stopCleanupProbe\.activeProjectRoomCleared[\s\S]*snapshot\.stopCleanupProbe\.allExpectedWindowsHidden[\s\S]*snapshot\.stopCleanupProbe\.barWindowHidden[\s\S]*snapshot\.stopCleanupProbe\.syncLoopsStopped/,
  "Manual real OAuth QA script must prove redaction, real TAURI sessions, visible widgets, sync loops, managed-folder watcher status, local SQLite/widget/activity outbox sync, stability dwell, session restore, and stop cleanup for passed reports.",
);
assertContains(
  realOAuthQaScript,
  /function writeReport\(report\)[\s\S]*const reportPath = join\(directory, `tauri-real-oauth-qa-\$\{timestamp\}\.json`\)[\s\S]*const summaryPath = join\(directory, `tauri-real-oauth-qa-\$\{timestamp\}\.md`\)[\s\S]*writeFileSync\(reportPath, JSON\.stringify\(report, null, 2\)\)[\s\S]*writeFileSync\(summaryPath, renderEvidenceSummary\(report, reportPath\)\)[\s\S]*return \{ reportPath, summaryPath \}/,
  "Manual real OAuth QA script must persist both the redacted JSON report and a markdown evidence summary.",
);
assertContains(
  realOAuthQaScript,
  /function renderEvidenceSummary\(report, reportPath\)[\s\S]*Redacted Proof[\s\S]*Real TAURI local session[\s\S]*Backend \/api\/me[\s\S]*All widget windows visible[\s\S]*Stability dwell ms[\s\S]*Session restored from Tauri mirror[\s\S]*Stop cleanup closed widgets and loops[\s\S]*Raw tokens, session JSON, user IDs, email, and Google subject are intentionally excluded/,
  "Manual real OAuth QA evidence summary must stay redacted and list the core auth, backend, widget, stability, restore, and cleanup proofs.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA === "true"[\s\S]*settingsApi\.getPrivacyConsents\(\)[\s\S]*recordActivityContext\(\{[\s\S]*recordWidgetUsageEvent\([\s\S]*syncAllLocalOutboxToServer\(\{ limit: 50 \}\)[\s\S]*localSyncProbe:sqliteQuickCheck[\s\S]*localSyncProbe:widgetUsageReachedBackend[\s\S]*localSyncProbe:activityReachedBackend/,
  "Real OAuth widget QA must include an opt-in local SQLite, widget outbox, and activity outbox sync probe.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS[\s\S]*waitForMs\(dwellMs\)[\s\S]*readWidgetRuntimeState\(selectedRoomId, serverSelectedRoomId\)[\s\S]*widgetApi\.getSummary\(selectedRoomId\)[\s\S]*stabilityProbe:allExpectedWindowsVisible[\s\S]*stabilityProbe:syncLoopsStillRunning[\s\S]*stabilityProbe:backendWidgetSummary/,
  "Real OAuth widget QA must include an opt-in stability dwell probe that re-checks widgets, room context, sync loops, and backend widget summary.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA === "true"[\s\S]*probeStoredAuthSessionRestoreFromTauriMirrorForQa\(\)[\s\S]*authApi\.getMe\(\)[\s\S]*sessionRestoreProbe:restoredLocalSession[\s\S]*sessionRestoreProbe:restoredTauriClient[\s\S]*sessionRestoreProbe:backendMeAfterRestore/,
  "Real OAuth widget QA must include an opt-in Tauri mirror session restore probe that proves backend auth after localStorage restart recovery.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA === "true"[\s\S]*stopTauriAuthenticatedSurfaces\(\)[\s\S]*readActiveProjectRoom\(\)[\s\S]*allExpectedWindowsHidden[\s\S]*barWindowHidden[\s\S]*syncLoopsStopped[\s\S]*stopCleanupProbe:activeProjectRoomCleared[\s\S]*stopCleanupProbe:allExpectedWindowsHidden[\s\S]*stopCleanupProbe:syncLoopsStopped/,
  "Real OAuth widget QA must include an opt-in stop cleanup probe that closes widgets, clears active room, and stops sync loops.",
);
assertContains(
  authWidgetQa,
  /getManagedFolderAutoSyncStatus[\s\S]*managedFolderStatus: ManagedFolderAutoSyncStatus[\s\S]*sync:managedFolderStatusMatchesRunningFlag[\s\S]*sync:managedFolderStatusNotFailed[\s\S]*managedFolderStatus,/,
  "Real OAuth widget QA must include managed-folder watcher status diagnostics in the redacted snapshot.",
);
assertContains(
  windowsRuntimeSoak,
  /process\.platform !== "win32"[\s\S]*Windows Tauri runtime soak skipped/,
  "Windows Tauri runtime soak must remain Windows-only so macOS/Linux CI is not affected.",
);
assertContains(
  windowsRuntimeSoak,
  /BUBLI_TAURI_RUNTIME_SOAK_ITERATIONS[\s\S]*scripts\/check-tauri-windows-runtime-smoke\.mjs[\s\S]*BUBLI_TAURI_RUNTIME_SOAK_ITERATION/,
  "Windows Tauri runtime soak must repeat the existing full runtime smoke with iteration metadata.",
);
assertContains(
  windowsRuntimeSoak,
  /CONTRACT_ONLY[\s\S]*mode: "contract"/,
  "Windows Tauri runtime soak must support a no-window contract mode for fast static verification.",
);
assertContains(
  localAutoSyncSoak,
  /process\.platform !== "win32"[\s\S]*Windows Tauri local-auto-sync soak skipped/,
  "Windows local-auto-sync soak must remain Windows-only so macOS/Linux CI is not affected.",
);
assertContains(
  localAutoSyncSoak,
  /scripts\/check-tauri-windows-runtime-soak\.mjs[\s\S]*process\.argv\.slice\(2\)[\s\S]*BUBLI_TAURI_RUNTIME_SMOKE_PHASES:\s*"local-auto-sync"[\s\S]*BUBLI_TAURI_LOCAL_AUTO_SYNC_SOAK_ITERATIONS/,
  "Windows local-auto-sync soak must delegate to the existing soak runner while forcing only the local-auto-sync runtime smoke phase.",
);
assertContains(
  localAutoSyncSoak,
  /process\.argv\.slice\(2\)/,
  "Windows local-auto-sync soak must pass through --contract for fast no-window verification.",
);
assertContains(
  windowsRuntimeSmoke,
  /const allowed = new Set\(\[\.\.\.DEFAULT_PHASES, "local-auto-sync"\]\)/,
  "Windows runtime smoke script must explicitly allow the local-auto-sync phase.",
);
assertContains(
  windowsRuntimeSoak,
  /CONTRACT_ONLY[\s\S]*mode: "contract"/,
  "Windows local-auto-sync soak must inherit no-window contract mode from the existing Windows soak runner.",
);
assertContains(
  windowsRuntimeSmoke,
  /runNodeScript\(\["scripts\/check-tauri-runtime-preflight\.mjs"\][\s\S]*NEXT_PUBLIC_API_BASE_URL: API_BASE_URL/,
  "Windows Tauri runtime smoke must run the preflight before seeding or launching Tauri.",
);
assertContains(
  windowsRuntimeSmoke,
  /const WS_URL = process\.env\.NEXT_PUBLIC_WS_URL \?\? resolveWsUrl\(API_BASE_URL\);[\s\S]*NEXT_PUBLIC_WS_URL: WS_URL/,
  "Windows Tauri runtime smoke must provide the real backend STOMP /ws URL to the Tauri runtime.",
);
assertContains(
  windowsRuntimeSmoke,
  /NEXT_PUBLIC_CHAT_TYPING_RELAY:\s*"true"/,
  "Windows Tauri runtime smoke must explicitly enable the backend chat typing STOMP relay check.",
);
assertContains(
  runtimePreflight,
  /process\.platform !== "win32"[\s\S]*Tauri runtime preflight skipped/,
  "Tauri runtime preflight must remain Windows-only so macOS/Linux CI is not affected.",
);
assertContains(
  runtimePreflight,
  /\/actuator\/health[\s\S]*checkOAuthLiveContract\(\)[\s\S]*scripts\/check-tauri-oauth-live-contract\.mjs/,
  "Tauri runtime preflight must verify backend health and the live Google OAuth authorize contract.",
);
assertContains(
  oauthLiveContract,
  /access_type"\) === "offline"[\s\S]*desktop sessions can receive refresh tokens/,
  "Tauri OAuth live contract must require access_type=offline so real desktop sessions can refresh.",
);
assertContains(
  runtimePreflight,
  /POSTGRES_CONTAINER[\s\S]*bubli-postgres[\s\S]*REDIS_CONTAINER[\s\S]*bubli-redis[\s\S]*pg_isready[\s\S]*redis-cli/,
  "Tauri runtime preflight must verify the Docker Postgres and Redis services needed by real backend smoke data.",
);

assertContains(
  layout,
  /<TauriPostLoginLauncher\s*\/>/,
  "Root layout must mount TauriPostLoginLauncher so hybrid app login can start native widgets.",
);
assertContains(
  layout,
  /<TauriDevtoolsGuard\s*\/>/,
  "Root layout must mount TauriDevtoolsGuard for hybrid/widget devtools hardening.",
);
assertContains(
  tauriConf,
  /"devtools":\s*false/,
  "The main Tauri hybrid app window must keep devtools disabled in tauri.conf.json.",
);
assertContains(
  tauriConf,
  /"beforeBuildCommand":\s*"npm run build && node scripts\/prepare-tauri-dist\.mjs"[\s\S]*"frontendDist":\s*"\.\.\/\.tauri-dist"/,
  "Tauri release builds must package the prepared .tauri-dist directory instead of raw .next server output.",
);
assertContains(
  tauriConf,
  /"url":\s*"\/app\/"/,
  "The packaged hybrid app window must open /app/ so the release asset protocol resolves app/index.html.",
);
assertContains(
  prepareTauriDist,
  /SERVER_APP_DIR[\s\S]*routeHtmlDestination[\s\S]*copyRequiredFile\(source, join\(TAURI_DIST_DIR, routeHtmlDestination\(relativePath\)\)\)[\s\S]*copyIfExists\(join\(NEXT_DIR, "static"\), join\(TAURI_DIST_DIR, "_next", "static"\)\)/,
  "prepare-tauri-dist must expand Next static route HTML into /route/index.html and copy _next/static for packaged Tauri release windows.",
);
assertContains(
  tauriCapability,
  /"core:webview:deny-internal-toggle-devtools"/,
  "The shared Tauri capability must deny internal devtools toggles for main and widget windows.",
);
assertNotContains(
  tauriCapability,
  /core:webview:allow-internal-toggle-devtools/,
  "Tauri capabilities must not allow internal devtools toggles.",
);
assertContains(
  tauriLib,
  /WebviewWindowBuilder::new\([\s\S]*WebviewUrl::App\(widget_window_url\(widget\)\.into\(\)\)[\s\S]*\.devtools\(false\)[\s\S]*\.build\(\)/,
  "Every desktop widget WebviewWindowBuilder path must explicitly disable devtools.",
);
assertNotContains(
  tauriLib,
  /open_devtools|close_devtools|is_devtools_open/,
  "Tauri runtime code must not expose devtools open/close helpers for hybrid or widget windows.",
);
assertContains(
  tauriLib,
  /fn position_main_window_on_preferred_monitor[\s\S]*app\.get_webview_window\(MAIN_WINDOW_LABEL\)[\s\S]*window\.unminimize\(\)[\s\S]*window\.show\(\)[\s\S]*resolve_preferred_monitor/,
  "The Windows release main window must be shown before preferred-monitor resolution so stale monitor preferences cannot leave the installed app headless.",
);
assertContains(
  tauriDevtoolsGuard,
  /event\.key === "F12"[\s\S]*event\.key === "ContextMenu"[\s\S]*event\.shiftKey && event\.key === "F10"[\s\S]*BLOCKED_DEVTOOLS_KEYS\.has\(event\.key\.toLowerCase\(\)\)/,
  "TauriDevtoolsGuard must block F12, keyboard context menu, Shift+F10, and Ctrl+Shift devtools shortcuts.",
);
assertContains(
  tauriDevtoolsGuard,
  /window\.addEventListener\("mousedown", blockContextMenuPointer, \{ capture: true \}\)[\s\S]*window\.addEventListener\("contextmenu", blockContextMenu, \{ capture: true \}\)[\s\S]*window\.addEventListener\("keydown", blockDevtoolsShortcut, \{ capture: true \}\)/,
  "TauriDevtoolsGuard must capture right-click, contextmenu, and devtools keyboard events.",
);
assertContains(
  tauriDevtoolsGuard,
  /stopImmediatePropagation\(\)/,
  "TauriDevtoolsGuard must stop blocked devtools/context-menu events before app handlers can re-open them.",
);
assertContains(
  layout,
  /<TauriRuntimeSmokeRunner\s*\/>/,
  "Root layout must mount TauriRuntimeSmokeRunner so Windows runtime smoke can exercise real Tauri IPC.",
);

assertContains(
  runtimeSmokeRunner,
  /const smokeEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"/,
  "TauriRuntimeSmokeRunner must be disabled unless the explicit development runtime-smoke env flag is enabled.",
);
assertContains(
  runtimeSmokeRunner,
  /navigator\.userAgent\.toLowerCase\(\)\.includes\("windows"\)/,
  "TauriRuntimeSmokeRunner must stay Windows-only so macOS runtime behavior is not touched.",
);
assertContains(
  firstRunController,
  /import \{ isMacTauriRuntime \} from "@\/lib\/tauri\/platform";/,
  "Desktop onboarding overlay must stay macOS-only so Windows widget windows are not covered by the full-monitor overlay.",
);
assertContains(
  firstRunController,
  /const triggerOnboardingOverlay = useCallback\(\(\) => \{[\s\S]*if \(!isMacTauriRuntime\(\)\) return false;[\s\S]*tauriCommands\.openOnboardingOverlay\(\)[\s\S]*return true;/,
  "First-run onboarding must only open the native overlay through the macOS-only guard.",
);
assertContains(
  firstRunController,
  /const showTour = useCallback\(\(\) => \{[\s\S]*if \(triggerOnboardingOverlay\(\)\)[\s\S]*setPhase\("tour"\)/,
  "Windows Tauri must fall back to the in-app tour instead of opening the macOS desktop onboarding overlay.",
);
assertContains(
  runtimeSmokeRunner,
  /pathname === "\/desktop-widget" \|\| pathname\.startsWith\("\/desktop-widget\/"\)/,
  "TauriRuntimeSmokeRunner must skip desktop-widget windows to avoid recursive widget smoke runs.",
);
assertContains(
  runtimeSmokeRunner,
  /const accessToken = process\.env\.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN;[\s\S]*if \(!accessToken\) return null;[\s\S]*clearStoredAuthSession\(\);[\s\S]*return authApi\.loginWithDevAccessToken\(accessToken\);/,
  "TauriRuntimeSmokeRunner must replace stale sessions with a backend-validated Tauri dev auth session from the explicit dev-token smoke env.",
);
assertContains(
  runtimeSmokeRunner,
  /closeAllWidgetWindows\(\)\.catch\(\(\) => undefined\);[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)\.catch\(\(\) => undefined\);[\s\S]*const devToken = await seedDevAuthSession\(\);[\s\S]*tauri dev access token resolved seed user/,
  "TauriRuntimeSmokeRunner must clean stale widgets and auth gate before seeding the smoke session.",
);
assertContains(
  runtimeSmokeRunner,
  /settingsApi\.updatePrivacyConsents\(\{[\s\S]*activityDetectionEnabled: true[\s\S]*localFolderEnabled: true[\s\S]*backend privacy consent enabled for runtime smoke/,
  "TauriRuntimeSmokeRunner must enable backend privacy consent for activity and managed-folder runtime smoke calls.",
);
assertContains(
  runtimeSmokeRunner,
  /storeActiveProjectRoom\(\{[\s\S]*roomId: smokeRoomId[\s\S]*setWidgetRoomContext\(\{ selectedRoomId: smokeRoomId \}\)[\s\S]*readActiveProjectRoom\(\)/,
  "TauriRuntimeSmokeRunner must verify active project-room persistence and mirror it to the widget runtime store before opening widgets.",
);
assertContains(
  runtimeSmokeRunner,
  /widgetApi\.updateContext\(\{ selectedRoomId: smokeRoomId \}\)[\s\S]*real backend widget context saved from Tauri runtime[\s\S]*widgetApi\.getContext\(\)[\s\S]*real backend widget context read back in Tauri runtime[\s\S]*widgetApi\.getSummary\(smokeRoomId\)[\s\S]*real backend widget summary uses selected project room/,
  "TauriRuntimeSmokeRunner must verify selected project-room context reaches the real backend widget context and summary APIs.",
);
assertContains(
  runtimeSmokeRunner,
  /verifyRealBackendWidgetItemState[\s\S]*widgetApi\.updateItemState\(smokeTaskItemId[\s\S]*state: "PINNED"[\s\S]*widgetApi\.listItemStates\(\[smokeTaskItemId\]\)[\s\S]*real backend widget item state pinned readback from Tauri runtime[\s\S]*state: "VISIBLE"[\s\S]*real backend widget item state restored after Tauri runtime smoke/,
  "TauriRuntimeSmokeRunner must verify widget item state PATCH and readback through the real backend from the Windows runtime.",
);
assertContains(
  runtimeSmokeRunner,
  /verifyRealBackendWidgetSettings[\s\S]*widgetApi\.getSettings\(\)[\s\S]*real backend widget settings included TODO bubble before Tauri patch[\s\S]*widgetApi\.updateSettings\(\{[\s\S]*bubbleType: "TODO"[\s\S]*opacity: 0\.88[\s\S]*real backend widget settings PATCH persisted TODO layout and flags in Tauri runtime[\s\S]*real backend widget settings GET read back patched TODO layout in Tauri runtime[\s\S]*real backend widget settings restored after Tauri runtime patch[\s\S]*await verifyRealBackendWidgetSettings\(assert\)/,
  "TauriRuntimeSmokeRunner must verify widget settings PATCH, GET readback, and restore through the real backend from the Windows runtime.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{ chatApi \} from "@\/features\/communication\/api\/chatApi";[\s\S]*import \{ voiceApi \} from "@\/features\/communication\/api\/voiceApi";[\s\S]*import \{ projectRoomApi \} from "@\/features\/project-room\/api\/projectRoomApi";[\s\S]*import \{ resourcesApi \} from "@\/features\/resources\/api\/resourcesApi";/,
  "TauriRuntimeSmokeRunner must use the real frontend API clients for room communication smoke checks.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{ widgetApi \} from "@\/features\/widget\/api\/widgetApi";/,
  "TauriRuntimeSmokeRunner must use the real widget API client for server context and usage readback checks.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{ agentApi \} from "@\/features\/agent\/api\/agentApi";/,
  "TauriRuntimeSmokeRunner must use the real agent API client for local-file analysis job readback checks.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{ readTauriAuthWidgetQaSnapshot \} from "@\/lib\/tauri\/tauri-auth-widget-qa";/,
  "TauriRuntimeSmokeRunner must exercise the redacted auth/widget QA snapshot in the real Windows runtime smoke.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{[\s\S]*analyzePersonalLocalFileWithKeySentences[\s\S]*getPersonalLocalFileAnalysisStatus[\s\S]*\} from "@\/lib\/local\/managed-folder-client";/,
  "TauriRuntimeSmokeRunner must use the real managed-folder local analysis adapter for backend analysis job checks.",
);
assertContains(
  runtimeSmokeRunner,
  /function verifyRealBackendRoomCommunication[\s\S]*projectRoomApi\.get\(smokeRoomId\)[\s\S]*projectRoomApi\.getMembers\(smokeRoomId\)[\s\S]*resourcesApi\.listRoomResources\(smokeRoomId\)[\s\S]*chatApi\.listRooms\(\)[\s\S]*chatApi\.sendMessage[\s\S]*chatApi\.getMessages[\s\S]*chatApi\.markRead[\s\S]*voiceApi\.createRoom[\s\S]*voiceApi\.getToken[\s\S]*voiceApi\.updateMicStatus[\s\S]*voiceApi\.leave/,
  "TauriRuntimeSmokeRunner must verify project-room, chat send/read, resources list, and voice token flows against the real backend.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{ chatTypingDestinations, getChatRealtimeClient \} from "@\/lib\/websocket\/chat-realtime";[\s\S]*import \{ websocketTopics \} from "@\/lib\/websocket\/topics";/,
  "TauriRuntimeSmokeRunner must use the raw STOMP chat client because backend chat topics publish ChatMessageResponse payloads.",
);
assertContains(
  runtimeSmokeRunner,
  /import \{ chatTypingDestinations, getChatRealtimeClient \} from "@\/lib\/websocket\/chat-realtime";/,
  "TauriRuntimeSmokeRunner must use the backend chat typing STOMP destinations for typing relay smoke coverage.",
);
assertContains(
  runtimeSmokeRunner,
  /openRealtimeChatMessageProbe[\s\S]*NEXT_PUBLIC_WS_URL[\s\S]*getChatRealtimeClient\(\)[\s\S]*websocketTopics\.chatRoom\(chatRoomId\)[\s\S]*client\.subscribe\(destination[\s\S]*client\.isOpen\(\)/,
  "TauriRuntimeSmokeRunner must subscribe to the real chat STOMP topic before sending the runtime-smoke chat message.",
);
assertContains(
  runtimeSmokeRunner,
  /const realtimeProbe = await openRealtimeChatMessageProbe\(roomChat\.id, clientMessageId, assert\);[\s\S]*chatApi\.sendMessage\(roomChat\.id[\s\S]*const realtimeMessage = await realtimeProbe\.message;[\s\S]*real backend chat message delivered over STOMP/,
  "TauriRuntimeSmokeRunner must prove the real backend chat message is delivered over STOMP, not only over HTTP readback.",
);
assertContains(
  runtimeSmokeRunner,
  /openRealtimeTypingProbe[\s\S]*NEXT_PUBLIC_CHAT_TYPING_RELAY[\s\S]*chatTypingDestinations\.subscribe\(chatRoomId\)[\s\S]*client\.subscribe\(destination[\s\S]*client\.isOpen\(\)/,
  "TauriRuntimeSmokeRunner must subscribe to the real backend chat typing topic before sending the typing STOMP command.",
);
assertContains(
  runtimeSmokeRunner,
  /const typingProbe = await openRealtimeTypingProbe\(roomChat\.id, true, assert\);[\s\S]*getChatRealtimeClient\(\)\.publish\(chatTypingDestinations\.publish\(roomChat\.id\)[\s\S]*real backend chat typing event sent over STOMP[\s\S]*const typingEvent = await typingProbe\.message;[\s\S]*real backend chat typing event relayed over STOMP/,
  "TauriRuntimeSmokeRunner must prove the backend relays a STOMP typing command back over the typing topic.",
);
assertContains(
  runtimeSmokeRunner,
  /const typingStopProbe = await openRealtimeTypingProbe\(roomChat\.id, false, assert\);[\s\S]*real backend chat typing stop event sent over STOMP[\s\S]*const typingStopEvent = await typingStopProbe\.message;[\s\S]*real backend chat typing stop event relayed over STOMP/,
  "TauriRuntimeSmokeRunner must prove the backend also relays the STOMP typing stop command.",
);
assertContains(
  runtimeSmokeRunner,
  /readActiveProjectRoom\(\);[\s\S]*active project room persisted to SQLite[\s\S]*verifyRealBackendRoomCommunication\(smokeRoomId, assert\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\)/,
  "TauriRuntimeSmokeRunner must verify real backend room communication before opening authenticated widgets.",
);
assertContains(
  runtimeSmokeRunner,
  /const smokeWidgetBubbles:[\s\S]*"todo"[\s\S]*"agent"[\s\S]*"chat"[\s\S]*"timer"[\s\S]*"memo"[\s\S]*"schedule"[\s\S]*"resource"[\s\S]*"alert"/,
  "TauriRuntimeSmokeRunner must keep the full eight bubble widget list explicit.",
);
assertContains(
  runtimeSmokeRunner,
  /setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\)[\s\S]*openWidgetWindows\(\{[\s\S]*bubbleType: "bar"[\s\S]*\.\.\.smokeWidgetBubbles\.map[\s\S]*native bar and all bubble widget windows opened after login[\s\S]*setWidgetRoomContext\(\{ selectedRoomId: smokeRoomId \}\)[\s\S]*Promise\.all\([\s\S]*getWidgetWindowState\(\{ bubbleType, windowId: bubbleType \}\)[\s\S]*all bubble widget windows visible[\s\S]*project room context propagated to all bubble widgets/,
  "TauriRuntimeSmokeRunner must verify post-login native bar plus all bubble widget windows and room context propagation.",
);
assertContains(
  runtimeSmokeRunner,
  /setWidgetWindowPosition\(\{[\s\S]*all bubble widget positions persisted with project room context[\s\S]*setWidgetWindowMode\(\{[\s\S]*mode: "MINIMIZED"[\s\S]*all bubble widget windows minimized without losing project room context[\s\S]*getWidgetWindowState\(\{ bubbleType: "bar", windowId: "bar" \}\)[\s\S]*widget bar remains visible after all bubble widgets are minimized[\s\S]*getWidgetBarItems\(\)[\s\S]*all minimized bubble widgets appear as bar restore items[\s\S]*openWidgetWindows\(\{[\s\S]*mode: "DEFAULT" as const[\s\S]*all minimized bubble widget windows restore with position and project room context/,
  "TauriRuntimeSmokeRunner must verify all eight bubble widgets preserve position while minimizing to the bar and restoring with project-room context.",
);
assertContains(
  widgetPage,
  /const closeWindow = useCallback[\s\S]*setWidgetWindowMode\(\{[\s\S]*mode: "MINIMIZED"[\s\S]*selectedRoomId: selectedWidgetRoomId[\s\S]*eventType: "close:minimize"/,
  "Desktop widget minimize control must use MINIMIZED mode so the bubble remains restorable from the bar.",
);
assertContains(
  runtimeSmokeRunner,
  /function runtimeSmokeWidgetPosition[\s\S]*async function verifyWidgetRestartLayout[\s\S]*widget layout restored visible positions after app restart[\s\S]*openWidgetWindows\(\{[\s\S]*widget layout rebuilt native windows after app restart[\s\S]*async function persistWidgetRestartLayoutCheckpoint[\s\S]*widget restart layout checkpoint persisted before app restart[\s\S]*smokePhase === "restore-verify"[\s\S]*await verifyWidgetRestartLayout\(assert\)[\s\S]*await tauriCommands\.closeAllWidgetWindows\(\)\.catch/,
  "TauriRuntimeSmokeRunner must verify persisted widget layout before restore-verify cleanup overwrites the restart state.",
);
assertContains(
  runtimeSmokeRunner,
  /registerWidgetShortcut\(\{ shortcut: "CommandOrControl\+Shift\+B" \}\)[\s\S]*widget global shortcut registered/,
  "TauriRuntimeSmokeRunner must verify the native global widget shortcut registration command.",
);
assertContains(
  runtimeSmokeRunner,
  /checkLocalSqliteIntegrity\(\)[\s\S]*sqlite\.ok/,
  "TauriRuntimeSmokeRunner must verify local SQLite integrity through the real IPC command.",
);
assertContains(
  runtimeSmokeRunner,
  /syncRoomMessages\(\{[\s\S]*restore-snapshot[\s\S]*backupLocalSqlite\(\)[\s\S]*local SQLite backup file created[\s\S]*listLocalSqliteBackups\(\)[\s\S]*restore-dirty[\s\S]*restoreLocalSqliteBackup\(\{ backupId: backup\.backupId \}\)[\s\S]*local SQLite restore queued for next app restart/,
  "TauriRuntimeSmokeRunner must create a SQLite backup around a stable room-message marker, verify the manifest, and queue restore for restart.",
);
assertContains(
  runtimeSmokeRunner,
  /smokePhase === "restore-verify"[\s\S]*readRoomMessages\(\{[\s\S]*local SQLite restore applied after app restart[\s\S]*checkLocalSqliteIntegrity\(\)[\s\S]*local SQLite integrity passed after restore restart/,
  "TauriRuntimeSmokeRunner must relaunch and verify that queued SQLite restore is applied after restart.",
);
assertContains(
  runtimeSmokeRunner,
  /setActivityContextConsent\(\{ enabled: true \}\)[\s\S]*readActivityContext\(\)[\s\S]*native foreground activity captured[\s\S]*recordActivityContext\(\{[\s\S]*stageActivityContextsForSync\(\{ limit: 50 \}\)[\s\S]*activityApi\.recordCurrentApp[\s\S]*markActivityContextSynced[\s\S]*activity buffer sync marked SQLite row as SYNCED[\s\S]*synced activity capture no longer remains pending[\s\S]*activityApi\.getToday\(\)[\s\S]*synced activity appears in real backend today readback/,
  "TauriRuntimeSmokeRunner must verify native activity capture, backend sync, local SQLite SYNCED marking, and server today readback.",
);
assertContains(
  runtimeSmokeRunner,
  /for \(const bubbleType of smokeWidgetBubbles\) \{[\s\S]*recordWidgetUsageEvent\(\{[\s\S]*all bubble widget usage rollups created[\s\S]*syncLocalWidgetUsageSummaryToServer\(\{[\s\S]*rollupKeys: smokeRollupKeys[\s\S]*widget usage summary reached backend sync API[\s\S]*all bubble widget usage summaries marked SQLite rollups as SYNCED[\s\S]*synced all bubble widget usage rollups no longer remain pending[\s\S]*widgetApi\.getTodayUsageRollups\(\)[\s\S]*synced all bubble widget usage appears in real backend today readback/,
  "TauriRuntimeSmokeRunner must verify all bubble widget usage rollups reach the backend, leave local SQLite pending state, and appear in server today readback.",
);
assertContains(
  runtimeSmokeRunner,
  /selectManagedFolder\(\{ path: smokeFolderPath \}\)[\s\S]*scanManagedFolder[\s\S]*searchLocalFiles[\s\S]*readLocalFilePreview[\s\S]*stageLocalFileEventsForSync[\s\S]*local file event sync marked SQLite rows as SYNCED[\s\S]*triggerIndexedFileMutation\(\)[\s\S]*reindexFile\(\{ localFileId: noteFile\.localFileId \}\)[\s\S]*local file reindex refreshed SQLite FTS search[\s\S]*local file reindex refreshed readable preview[\s\S]*local file reindex staged update event with backend resource[\s\S]*local file reindex update event synced to backend[\s\S]*watchManagedFolder[\s\S]*triggerManagedFolderMutation[\s\S]*managed folder watcher staged update and delete events/,
  "TauriRuntimeSmokeRunner must verify managed-folder scan/search/preview, manual reindex refresh, event staging, and live watcher update/delete events against a temp folder.",
);
assertContains(
  runtimeSmokeRunner,
  /runtimeSmokeAnalysisFilePattern[\s\S]*runtime-smoke-\(structured\|rich\)[\s\S]*analyzableRuntimeSmokeFilePattern[\s\S]*findSyncedLocalFileAnalysisCandidate[\s\S]*runtimeSmokeAnalysisFilePattern\.test\(candidate\.fileName\)[\s\S]*synced structured or RTF local file has backend resource for analysis/,
  "TauriRuntimeSmokeRunner must choose a structured JSON or RTF runtime-smoke file for backend local-file analysis.",
);
assertContains(
  runtimeSmokeRunner,
  /syncStagedLocalFileEventsToBackend[\s\S]*managedFolderApi\.syncApprovedLocalFileEvents[\s\S]*markLocalFileEventsSynced[\s\S]*local file event sync marked SQLite rows as SYNCED[\s\S]*analyzePersonalLocalFileWithKeySentences\(\{[\s\S]*local file key-sentence analysis reached real backend job[\s\S]*agentApi\.getJob\(localFileAnalysis\.data\.job\.jobId\)[\s\S]*local file analysis backend job read back[\s\S]*getPersonalLocalFileAnalysisStatus\(\{[\s\S]*local file analysis ledger marked SYNCED in SQLite[\s\S]*stageLocalFileAnalysisBackfill\(\{[\s\S]*synced local file analysis no longer remains pending[\s\S]*watched file event sync marked SQLite rows as SYNCED[\s\S]*synced watched file events no longer remain pending/,
  "TauriRuntimeSmokeRunner must send staged and watched local file events to the backend, request structured/RTF local-file analysis, read back the agent job, and verify local SQLite rows are no longer pending.",
);
assertContains(
  runtimeSmokeRunner,
  /triggerManualOutboxFileCreation[\s\S]*recordActivityContext\(\{[\s\S]*recordWidgetUsageEvent\(\{[\s\S]*syncAllLocalOutboxToServer\(\{ limit: 50 \}\)[\s\S]*manual integrated outbox sync sent file activity and widget usage[\s\S]*manual outbox activity no longer remains pending[\s\S]*manual outbox widget usage no longer remains pending[\s\S]*manual outbox file event no longer remains pending/,
  "TauriRuntimeSmokeRunner must verify the manual integrated local outbox path sends file, activity, and widget usage together.",
);
assertContains(
  activityAutoCapture,
  /DEFAULT_ACTIVITY_CAPTURE_INTERVAL_MS = 30_000[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_ACTIVITY_CAPTURE_INTERVAL_MS[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"[\s\S]*configured >= 1_000[\s\S]*configured <= DEFAULT_ACTIVITY_CAPTURE_INTERVAL_MS/,
  "Activity auto-capture interval override must be limited to development runtime smoke.",
);
assertContains(
  activityAutoCapture,
  /captureIntervalId = null;[\s\S]*if \(input\?\.flush\) \{[\s\S]*await flushActivityAutoCapture\(\);[\s\S]*updateActivityAutoCaptureStatus\(\{ lastStatus: "stopped", running: false \}\);[\s\S]*await mirrorNativeActivityConsent\(false\);/,
  "stopActivityAutoCapture must leave status stopped after flush so local-auto-sync smoke does not see a stale running state.",
);
assertContains(
  managedFolderAutoSync,
  /export type ManagedFolderAutoSyncStatus[\s\S]*lastSyncedFolderId[\s\S]*lastWatchEventFolderId[\s\S]*lastWatchedCount[\s\S]*pendingFolderCount[\s\S]*export function getManagedFolderAutoSyncStatus\(\)[\s\S]*updateManagedFolderAutoSyncStatus/,
  "Managed folder auto-sync must expose a non-UI status snapshot for runtime QA.",
);
assertContains(
  managedFolderAutoSync,
  /watchAllManagedFolders\(\)\.catch\(\(\) => null\)[\s\S]*lastSkippedCount: watchResult\.skippedCount[\s\S]*lastWatchedCount: watchResult\.watchedCount/,
  "Managed folder auto-sync status must retain native watchAllManagedFolders results.",
);
assertContains(
  runtimeSmokeRunner,
  /launchTauriAuthenticatedSurfaces\(\)[\s\S]*post-login launcher opened all bubble widgets with project room context[\s\S]*isActivityAutoCaptureRunning\(\)[\s\S]*isManagedFolderAutoSyncRunning\(\)[\s\S]*isWidgetUsageAutoSyncRunning\(\)[\s\S]*post-login launcher started activity folder and widget sync loops[\s\S]*stopTauriAuthenticatedSurfaces\(\)[\s\S]*post-login stop cleared active project room context[\s\S]*post-login stop closed all bubble widget windows[\s\S]*post-login stop stopped activity folder and widget sync loops/,
  "TauriRuntimeSmokeRunner must prove the real post-login authenticated launcher opens widgets, starts sync loops, and stops both widgets and loops.",
);
assertContains(
  runtimeSmokeRunner,
  /closeWidgetWindow\(\{ bubbleType: "chat", windowId: "chat" \}\)[\s\S]*post-login relaunch setup closed one bubble widget[\s\S]*launchTauriAuthenticatedSurfaces\(\)[\s\S]*post-login launcher reopened stale or missing bubble widget windows/,
  "TauriRuntimeSmokeRunner must prove the post-login launcher recovers stale launched state when a bubble window disappears.",
);
assertContains(
  runtimeSmokeRunner,
  /const authWidgetQaSnapshot = await readTauriAuthWidgetQaSnapshot\(\);[\s\S]*post-login QA snapshot confirmed Tauri auth session without raw tokens[\s\S]*post-login QA snapshot confirmed real backend auth and widget APIs[\s\S]*post-login QA snapshot confirmed project room context across memory Tauri and backend[\s\S]*post-login QA snapshot confirmed all widget windows and restore items[\s\S]*stopTauriAuthenticatedSurfaces\(\)/,
  "TauriRuntimeSmokeRunner must verify the redacted QA snapshot after the post-login launcher opens authenticated widgets.",
);
assertContains(
  runtimeSmokeRunner,
  /verifyLocalAutoSyncLoops[\s\S]*startActivityAutoCapture\(\)[\s\S]*startManagedFolderAutoSync\(\)[\s\S]*getActivityAutoCaptureStatus[\s\S]*local auto-sync activity loop repeated on smoke interval[\s\S]*getManagedFolderAutoSyncStatus[\s\S]*local auto-sync managed folder watcher restored active folders[\s\S]*triggerManagedFolderMutation[\s\S]*lastFileEventSentCount[\s\S]*lastFileEventSyncedCount[\s\S]*lastFileAnalysisFailedCount[\s\S]*local auto-sync managed folder events drained through backend sync[\s\S]*stopActivityAutoCapture\(\{ flush: true \}\)[\s\S]*stopManagedFolderAutoSync\(\{ flush: true \}\)/,
  "TauriRuntimeSmokeRunner must provide a UI-free local-auto-sync phase for activity and managed-folder loops.",
);
assertContains(
  runtimeSmokeRunner,
  /if \(smokePhase === "local-auto-sync"\) \{[\s\S]*verifyLocalAutoSyncLoops\(assert\)[\s\S]*postReport\(\{[\s\S]*status: "passed"[\s\S]*return;/,
  "TauriRuntimeSmokeRunner local-auto-sync phase must return before widget launch and communication UI checks.",
);
assertContains(
  runtimeSmokeRunner,
  /function smokeControlUrl[\s\S]*\/mutate-folder[\s\S]*function waitForManagedFolderEvents[\s\S]*"UPDATED"[\s\S]*"DELETED"/,
  "TauriRuntimeSmokeRunner must ask the Node smoke server to mutate watched files and poll for UPDATED/DELETED events.",
);
assertContains(
  runtimeSmokeRunner,
  /function triggerIndexedFileMutation[\s\S]*\/mutate-indexed-file/,
  "TauriRuntimeSmokeRunner must ask the Node smoke server to mutate an indexed file before reindexing it.",
);
assertContains(
  windowsRuntimeSmoke,
  /const DEFAULT_PHASES = \["full", "restore-verify"\][\s\S]*parseRequestedPhases\(process\.env\.BUBLI_TAURI_RUNTIME_SMOKE_PHASES\)[\s\S]*for \(const phase of REQUESTED_PHASES\)[\s\S]*runRuntimeSmokePhase\(phase, accessToken\)[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_PHASE: phase/,
  "Windows runtime smoke script must default to full plus restore and allow a selected local-auto-sync phase.",
);
assertContains(
  windowsRuntimeSmoke,
  /const CONTRACT_ONLY = process\.argv\.includes\("--contract"\)[\s\S]*if \(CONTRACT_ONLY\) \{[\s\S]*const contractChecks = runContractCheck\(\);[\s\S]*checks: contractChecks[\s\S]*mode: "contract"[\s\S]*process\.exit\(0\);[\s\S]*function runContractCheck\(\)[\s\S]*runner verifies post-login bar and all bubble widgets with room context[\s\S]*runner verifies real backend widget context and settings persistence[\s\S]*runner verifies SQLite backup creation and restore queueing[\s\S]*runner verifies local file scan reindex watch sync and analysis backfill/,
  "Windows runtime smoke --contract mode must statically verify key runtime smoke functional assertions before reporting pass.",
);
assertContains(
  windowsRuntimeSmoke,
  /NEXT_PUBLIC_BUBLI_TAURI_ACTIVITY_CAPTURE_INTERVAL_MS: "1000"/,
  "Windows runtime smoke script must shorten activity auto-capture only in runtime smoke mode.",
);
assertContains(
  windowsRuntimeSmoke,
  /runtime-smoke-table\.csv[\s\S]*~\$runtime-smoke-temp\.csv[\s\S]*runtime-smoke-structured\.json[\s\S]*runtime-smoke-rich\.rtf[\s\S]*runtime-smoke-delete\.txt[\s\S]*request\.method === "POST" && request\.url === "\/mutate-folder"[\s\S]*appendFileSync[\s\S]*rmSync/,
  "Windows runtime smoke server must seed CSV, ignored temp CSV, and mutate/delete real temp files after the Tauri watcher starts.",
);
assertContains(
  windowsRuntimeSmoke,
  /request\.method === "POST" && request\.url === "\/mutate-indexed-file"[\s\S]*mutateIndexedFile[\s\S]*ReindexSignal/,
  "Windows runtime smoke server must mutate an already indexed temp file for reindex verification.",
);
assertContains(
  windowsRuntimeSmoke,
  /runtime-smoke-manual-outbox\.dat[\s\S]*request\.method === "POST" && request\.url === "\/create-manual-outbox-file"[\s\S]*writeFileSync/,
  "Windows runtime smoke server must create a real temp file for manual integrated outbox sync.",
);
assertContains(
  devWidgetRealBackend,
  /REQUIRED_WIDGET_BUBBLES = \["TODO", "AGENT", "CHAT", "TIMER", "MEMO", "SCHEDULE", "RESOURCE", "ALERT"\][\s\S]*REQUIRED_WIDGET_BUBBLES\.every[\s\S]*widget settings did not include all eight backend-supported bubbles[\s\S]*'RESOURCE'[\s\S]*'ALERT'/,
  "Real backend widget seed must require and insert all eight backend-supported bubbles.",
);
assertContains(
  devWidgetRealBackend,
  /apiGet\("\/api\/project-rooms\?page=0&size=20"[\s\S]*apiGet\("\/api\/me\/project-rooms\?page=0&size=20"[\s\S]*assertProjectRoomListContainsSeed\(projectRooms[\s\S]*assertProjectRoomListContainsSeed\(myProjectRooms/,
  "Real backend widget smoke must verify both project-room list bootstrap endpoints include the active seed room.",
);
assertContains(
  devWidgetRealBackend,
  /\/api\/project-rooms\/\$\{SEED_ROOM_ID\}\/events\?afterSequence=0&limit=100[\s\S]*ROOM_UPDATED[\s\S]*event\.sequence === 1[\s\S]*event\.payload\?\.source === "codex-local-seed"[\s\S]*project room event backfill did not include the seeded ROOM_UPDATED event[\s\S]*INSERT INTO project_room_events/,
  "Real backend widget smoke must seed and verify project-room event history catch-up.",
);
assertContains(
  runtimeSmokeRunner,
  /calendarApi\.getProjectRoomEvents\(smokeRoomId, \{ afterSequence: 0, limit: 100 \}\)[\s\S]*real backend project room event catch-up returned sequence list shape[\s\S]*event\.eventType === "ROOM_UPDATED"[\s\S]*event\.actor\?\.id === "11111111-1111-4111-8111-111111111111"[\s\S]*event\.payload\?\.source === "codex-local-seed"[\s\S]*real backend project room event catch-up loaded seeded history[\s\S]*calendarApi\.getProjectRoomEvents\(smokeRoomId, \{[\s\S]*afterSequence: firstLastReceivedSequence[\s\S]*event\.sequence > firstLastReceivedSequence[\s\S]*real backend project room event catch-up skipped already received sequences/,
  "TauriRuntimeSmokeRunner must verify project-room event catch-up sequence shape, seeded ROOM_UPDATED history, and incremental afterSequence filtering.",
);
assertContains(
  runtimeSmokeRunner,
  /runtime-smoke-table\.csv[\s\S]*managed folder CSV file resolved for tabular preview[\s\S]*managed folder CSV preview is readable[\s\S]*~\$runtime-smoke-temp\.csv[\s\S]*managed folder temp CSV stayed ignored during initial scan[\s\S]*local CSV file event reached backend sync batch/,
  "TauriRuntimeSmokeRunner must prove user managed-folder CSV files are readable/synced while temporary CSV lock files are ignored.",
);
assertContains(
  devWidgetRealBackend,
  /apiPatch\("\/api\/widget\/settings"[\s\S]*bubbleType: "TODO"[\s\S]*opacity: 0\.88[\s\S]*widget settings PATCH did not persist TODO layout and flags[\s\S]*apiGet\("\/api\/widget\/settings"[\s\S]*widget settings GET did not read back the patched TODO layout[\s\S]*todoSettingBefore\.alertEnabled/,
  "Real backend widget smoke must verify widget settings PATCH persistence, GET readback, and restoration.",
);
assertContains(
  devWidgetRealBackend,
  /const localFileSyncReplay = await apiPost\("\/api\/local-file-events\/sync"[\s\S]*localEventId: createdLocalEventId[\s\S]*local file event duplicate localEventId did not replay the original result/,
  "Real backend widget smoke must verify duplicate localEventId replay returns the original local file sync result.",
);
assertContains(
  devWidgetRealBackend,
  /const localActivityId = `codex-activity-\$\{Date\.now\(\)\}`[\s\S]*localActivityId,[\s\S]*const activityReplay = await apiPost\("\/api\/activity\/current-app"[\s\S]*activityReplay\.id === activitySmoke\.id[\s\S]*activity duplicate localActivityId replay unexpectedly changed the original row/,
  "Real backend widget smoke must verify duplicate localActivityId replay returns the original activity row.",
);
assertContains(
  devWidgetRealBackend,
  /Desktop widget backend sync check[\s\S]*date_trunc\('day', now\(\)\) \+ interval '12 hours'[\s\S]*date_trunc\('day', now\(\)\) \+ interval '13 hours'/,
  "Real backend widget seed schedule must stay inside the backend widget summary's current UTC day window.",
);
assertContains(
  runtimeSmokeRunner,
  /closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)/,
  "TauriRuntimeSmokeRunner must clean up widget windows and close the auth gate after the smoke run.",
);
assertContains(
  tauriLib,
  /tauri_plugin_global_shortcut::Builder::new\(\)\.build\(\)/,
  "Tauri must install the native global shortcut plugin.",
);
assertContains(
  tauriLib,
  /#\[cfg\(target_os = "windows"\)\][\s\S]*fn local_auto_sync_runtime_smoke_requested\(\)[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_PHASE[\s\S]*local-auto-sync[\s\S]*fn hide_main_window_for_local_auto_sync_smoke[\s\S]*window\.hide\(\)/,
  "Windows local-auto-sync runtime smoke must be able to hide the main app window without opening widgets.",
);
assertContains(
  tauriLib,
  /tauri::RunEvent::Ready => \{[\s\S]*if local_auto_sync_runtime_smoke_requested\(\) \{[\s\S]*hide_main_window_for_local_auto_sync_smoke\(app_handle\);[\s\S]*return;[\s\S]*position_main_window_on_preferred_monitor/,
  "Windows local-auto-sync runtime smoke must skip main-window show/focus positioning.",
);
assertContains(
  tauriLib,
  /fn register_native_widget_shortcut[\s\S]*on_shortcut[\s\S]*toggle_widget_window_from_shortcut/,
  "Tauri register_widget_shortcut must register a native global shortcut that toggles a widget window.",
);

assertContains(
  launcher,
  /pathname === "\/desktop-widget" \|\| pathname\.startsWith\("\/desktop-widget\/"\)/,
  "TauriPostLoginLauncher must skip desktop-widget windows to avoid widget self-launch loops.",
);
assertContains(
  launcher,
  /const runtimeSmokeEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"/,
  "TauriPostLoginLauncher must only let development runtime smoke own widget launch.",
);
assertContains(
  launcher,
  /if \(!isTauriRuntime\(\) \|\| isDesktopWidgetSurface \|\| runtimeSmokeEnabled\)/,
  "TauriPostLoginLauncher must run only in the Tauri app shell and must not race the runtime smoke.",
);
assertContains(
  launcher,
  /await stopTauriAuthenticatedSurfaces\(\);[\s\S]*return;/,
  "TauriPostLoginLauncher must stop native surfaces when no auth session exists.",
);
assertContains(
  launcher,
  /error instanceof ApiClientError && error\.status === 401[\s\S]*await stopTauriAuthenticatedSurfaces\(\);[\s\S]*clearStoredAuthSession\(\);/,
  "TauriPostLoginLauncher must close widgets and clear session on 401.",
);
assertContains(
  launcher,
  /void launchTauriAuthenticatedSurfaces\(\)\.catch\(\(\) => undefined\);/,
  "TauriPostLoginLauncher must launch authenticated native surfaces after a valid session.",
);
assertContains(
  launcher,
  /window\.addEventListener\(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange\)/,
  "TauriPostLoginLauncher must react to auth session changes.",
);
assertContains(
  launcher,
  /const authDiagnosticsEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS === "true";[\s\S]*process\.env\.NODE_ENV !== "development"[\s\S]*!authDiagnosticsEnabled[\s\S]*window\.__BUBLI_TAURI_AUTH_QA__ = \{[\s\S]*assertRealGoogleAuthWidgetSnapshot: assertTauriRealGoogleAuthWidgetQa[\s\S]*getLocalSessionDiagnostics: getStoredAuthSessionDiagnostics[\s\S]*readAuthWidgetSnapshot: readTauriAuthWidgetQaSnapshot[\s\S]*readTauriMirrorDiagnostics: readTauriAuthSessionDiagnostics/,
  "TauriPostLoginLauncher must expose only explicitly enabled development-only redacted auth diagnostics for manual QA.",
);
assertContains(
  launcher,
  /delete window\.__BUBLI_TAURI_AUTH_QA__/,
  "TauriPostLoginLauncher must clean up the development-only auth QA helper on unmount.",
);
assertNotContains(
  launcher,
  /__BUBLI_TAURI_AUTH_QA__[\s\S]{0,500}accessToken|__BUBLI_TAURI_AUTH_QA__[\s\S]{0,500}refreshToken|__BUBLI_TAURI_AUTH_QA__[\s\S]{0,500}sessionJson/,
  "Tauri auth QA helper must not expose raw tokens or mirrored session JSON through the window global.",
);
assertContains(
  authWidgetQa,
  /export async function readTauriAuthWidgetQaSnapshot\(\): Promise<TauriAuthWidgetQaSnapshot>/,
  "Tauri auth/widget QA must provide one redacted snapshot entrypoint for manual post-login verification.",
);
assertContains(
  authWidgetQa,
  /export async function assertTauriRealGoogleAuthWidgetQa\(\): Promise<TauriRealGoogleAuthWidgetQaAssertion>[\s\S]*assertRealGoogleSessionDiagnostics\(failedChecks, snapshot\.localSession, "local"\)[\s\S]*assertRealGoogleSessionDiagnostics\(failedChecks, snapshot\.tauriMirrorSession, "tauriMirror"\)/,
  "Tauri auth/widget QA must provide one redacted pass/fail assertion helper for actual Google OAuth manual QA.",
);
assertContains(
  authWidgetQa,
  /diagnostics\.clientType === "TAURI"[\s\S]*diagnostics\.isTauriClient[\s\S]*diagnostics\.isDevAccessTokenSession === false[\s\S]*diagnostics\.wouldRejectDevAccessTokenSession === false[\s\S]*diagnostics\.refreshTokenExpired === false/,
  "Actual Google OAuth QA assertion must reject dev-token sessions and expired refresh tokens.",
);
assertContains(
  authWidgetQa,
  /snapshot\.backend\.me\.ok[\s\S]*snapshot\.backend\.widgetContext\.ok[\s\S]*snapshot\.backend\.widgetSummary\.ok[\s\S]*snapshot\.activeProjectRoom\.hasSelectedRoom[\s\S]*snapshot\.widgetRuntime\.allExpectedWindowsVisible[\s\S]*snapshot\.widgetRuntime\.allWindowRoomContextMatchesActive[\s\S]*snapshot\.widgetRuntime\.allWindowRoomContextMatchesServer[\s\S]*snapshot\.widgetRuntime\.barRestoreItems\.allMatchActiveRoom[\s\S]*snapshot\.syncRuntime\.allAutoSyncLoopsRunning/,
  "Actual Google OAuth QA assertion must verify real backend widget APIs, a selected project room, widget runtime state, and post-login auto-sync loops.",
);
assertContains(
  authWidgetQa,
  /authApi\.getMe\(\)[\s\S]*widgetApi\.getContext\(\)[\s\S]*widgetApi\.getSummary\(selectedRoomId\)/,
  "Tauri auth/widget QA snapshot must verify real backend auth, widget context, and widget summary APIs.",
);
assertContains(
  authWidgetQa,
  /tauriCommands\.readActiveProjectRoom\(\)/,
  "Tauri auth/widget QA snapshot must inspect the native active project room.",
);
assertContains(
  authWidgetQa,
  /tauriCommands\.getWidgetBarItems\(\)/,
  "Tauri auth/widget QA snapshot must inspect native widget bar items.",
);
assertContains(
  authWidgetQa,
  /tauriCommands\.getWidgetWindowState\(\{ bubbleType, windowId: bubbleType \}\)/,
  "Tauri auth/widget QA snapshot must inspect each native widget window state.",
);
assertContains(
  authWidgetQa,
  /WIDGET_BUBBLE_TYPES\.map[\s\S]*missingVisibleBubbles[\s\S]*allExpectedWindowsVisible[\s\S]*allWindowRoomContextMatchesActive[\s\S]*allWindowRoomContextMatchesServer[\s\S]*barRestoreItems/,
  "Tauri auth/widget QA snapshot must cover all eight expected bubble windows and active/server room-context consistency.",
);
assertContains(
  authWidgetQa,
  /isActivityAutoCaptureRunning[\s\S]*isManagedFolderAutoSyncRunning[\s\S]*isWidgetUsageAutoSyncRunning[\s\S]*syncRuntime:[\s\S]*activityAutoCaptureRunning[\s\S]*allAutoSyncLoopsRunning[\s\S]*managedFolderAutoSyncRunning[\s\S]*widgetUsageAutoSyncRunning/,
  "Tauri auth/widget QA snapshot must include post-login activity, managed-folder, and widget-usage sync loop state.",
);
assertNotContains(
  authWidgetQa,
  /accessToken\s*[?:]:|refreshToken\s*[?:]:|sessionJson\s*[?:]:|userId\s*[?:]:|userName\s*[?:]:|userBubliId\s*[?:]:|email\s*[?:]:|googleSub\s*[?:]:/,
  "Tauri auth/widget QA snapshot must not expose raw tokens, mirrored session JSON, or user identifiers.",
);
assertNotContains(
  authWidgetQa,
  /failedChecks\.push\([^)]*(accessToken|refreshToken|sessionJson|userId|userName|userBubliId|email|googleSub)/,
  "Tauri auth/widget QA assertion failure labels must stay redacted.",
);

const startupWindows = extractConstArray(surfaces, "loginStartupWindows");
assertContains(
  startupWindows,
  "loginStartupBarWindow",
  "Login startup windows must include the Bubli bar.",
);
assertContains(
  startupWindows,
  /bubbleType:\s*"todo"[\s\S]*windowId:\s*"todo"/,
  "Login startup windows must include the primary TODO bubble.",
);
for (const required of ["agent", "alert", "chat", "memo", "resource", "schedule", "timer"]) {
  assertContains(
    startupWindows,
    new RegExp(`bubbleType:\\s*"${required}"[\\s\\S]*windowId:\\s*"${required}"`),
    `Login startup windows must include the ${required} bubble so authenticated Tauri launches restore all widget surfaces.`,
  );
}

assertContains(
  surfaces,
  /return \[loginStartupBarWindow, \.\.\.startupBubbles\];/,
  "resolveLoginStartupWindows must pair the bar with every enabled startup bubble.",
);
assertContains(
  surfaces,
  /if \(startupBubbles\.length === 0\) return loginStartupWindows;/,
  "Tauri login must open the default widget set when a real account has no enabled widget settings yet.",
);
assertContains(
  surfaces,
  /launchTauriAuthenticatedSurfaces\(\)[\s\S]*await authApi\.getMe\(\);[\s\S]*const startupWindows = await resolveLoginStartupWindows\(\);/,
  "launchTauriAuthenticatedSurfaces must verify the live backend auth session before resolving or opening login widgets.",
);
assertContains(
  surfaces,
  /await tauriCommands\.setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\);/,
  "launchTauriAuthenticatedSurfaces must open the native auth gate before widget windows.",
);
assertContains(
  surfaces,
  /authenticatedStartupWindowsReady[\s\S]*getWidgetWindowState\(widgetTargetFromInput\(input\)\)[\s\S]*state\.windowVisible/,
  "launchTauriAuthenticatedSurfaces must verify already-launched widget windows are still visible.",
);
assertContains(
  surfaces,
  /if \(launchedAuthenticatedSurfaces\) \{[\s\S]*authenticatedStartupWindowsReady\(startupWindows\)[\s\S]*if \(ready\) return;[\s\S]*launchedAuthenticatedSurfaces = false;[\s\S]*closeAllWidgetWindows\(\)/,
  "launchTauriAuthenticatedSurfaces must recover stale launched state when login widgets were closed or disappeared.",
);
assertContains(
  surfaces,
  /const selectedRoomId = await resolveLaunchSelectedRoomId\(\);/,
  "launchTauriAuthenticatedSurfaces must resolve active project-room context before opening widgets.",
);
assertContains(
  surfaces,
  /const startupWindows = await resolveLoginStartupWindows\(\);[\s\S]*const selectedRoomId = await resolveLaunchSelectedRoomId\(\);[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly if auth/session state changes after resolving the project-room context.",
);
assertContains(
  surfaces,
  /const startupWindows = await resolveLoginStartupWindows\(\);[\s\S]*if \(barWindow\) \{[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly before opening the bar window.",
);
assertContains(
  surfaces,
  /openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must open the Bubli bar first with retry.",
);
assertContains(
  surfaces,
  /openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*openWidgetWindowsWithRetry\(bubbleWindows, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly after opening the bar and before opening bubble windows.",
);
assertContains(
  surfaces,
  /openWidgetWindowsWithRetry\(bubbleWindows, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must open authenticated bubble windows through the batch IPC retry path.",
);
assertContains(
  surfaces,
  /openWidgetWindowsWithRetry\(bubbleWindows, selectedRoomId, shouldContinueLaunch\)[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*if \(openedWindows\.length < startupWindows\.length\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly after bubble window attempts and before marking the launch active.",
);
assertContains(
  surfaces,
  /seedWidgetBarItems\(\{ selectedRoomId \}\)/,
  "launchTauriAuthenticatedSurfaces must seed minimized bar items after at least one widget opens.",
);
assertContains(
  surfaces,
  /openedWindows\.length < startupWindows\.length[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*Some Tauri widgets failed to open after login[\s\S]*launchedAuthenticatedSurfaces = true;[\s\S]*launchRequested = true;/,
  "A partially opened widget session must fail closed so bar-only startup does not hide a failed bubble batch.",
);
assertContains(
  surfaces,
  /startActivityAutoCapture\(\);[\s\S]*startManagedFolderAutoSync\(\);[\s\S]*startWidgetUsageAutoSync\(\);/,
  "launchTauriAuthenticatedSurfaces must start activity, folder, and widget sync loops together.",
);
assertContains(
  surfaces,
  /await stopActivityAutoCapture\(\{ flush: true \}\);[\s\S]*await stopManagedFolderAutoSync\(\{ flush: true \}\);[\s\S]*await stopWidgetUsageAutoSync\(\{ flush: true \}\);/,
  "stopTauriAuthenticatedSurfaces must flush all native sync loops.",
);
assertContains(
  surfaces,
  /clearActiveProjectRoomId\(\)[\s\S]*clearActiveProjectRoom\(\)[\s\S]*setWidgetRoomContext\(\{ selectedRoomId: null \}\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*closeAllWidgetWindows\(\)/,
  "stopTauriAuthenticatedSurfaces must clear active room context, disable the native auth gate, and close all widgets.",
);

assertContains(
  appNav,
  /"\/app\/chat"/,
  "AppNav must keep the communication route defined for the web app.",
);
assertContains(
  appNav,
  /useSyncExternalStore\(subscribeToTauriRuntime, isTauriRuntime, \(\) => false\)/,
  "AppNav must detect Tauri at runtime instead of removing chat from web navigation.",
);
assertContains(
  appNav,
  /isTauri\s*\?\s*siteConfig\.appNav\.filter\(\(item\) => item\.href !== "\/app\/chat"\)\s*:\s*siteConfig\.appNav/,
  "Hybrid Tauri app must hide only the communication tab while the web app keeps it.",
);

assertContains(
  appShell,
  /const runtimeSmokeEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"/,
  "AppShell must only let development runtime smoke own widget launch.",
);
assertContains(
  appShell,
  /state\.kind !== "ready" \|\| !isTauriRuntime\(\) \|\| runtimeSmokeEnabled/,
  "AppShell must launch native surfaces only after authenticated shell data is ready and must not race the runtime smoke.",
);
assertContains(
  appShell,
  /void launchTauriAuthenticatedSurfaces\(\)\.catch/,
  "AppShell must trigger authenticated native surfaces after shell readiness.",
);
assertContains(
  appShell,
  /sourceType === "MESSAGE"[\s\S]*const fallbackRoute[\s\S]*isTauriRuntime\(\)[\s\S]*openTauriChatWidget\(\{[\s\S]*eventType: "handoff:notification"[\s\S]*roomId: sourceId/,
  "Hybrid Tauri MESSAGE notifications must open the chat widget instead of routing the main app to /app/chat.",
);
assertContains(
  chatWidgetRouting,
  /openWidgetWindow\(\{[\s\S]*bubbleType: "chat"[\s\S]*selectedRoomId:[\s\S]*windowId: "chat"/,
  "Tauri chat widget routing must open the native chat bubble with the active project-room context.",
);
assertContains(
  chatWidgetRouting,
  /setActiveProjectRoomId\(selectedRoomId/,
  "Tauri chat widget routing must propagate project-room context before opening the chat bubble.",
);
assertContains(
  desktopCommunicationRoute,
  /isTauriRuntime\(\)[\s\S]*openTauriChatWidget\(\{[\s\S]*eventType: "handoff:legacy-communication"/,
  "Legacy desktop communication route must bridge to the chat widget in Tauri.",
);
assertContains(
  projectRoomChatRoute,
  /isTauriRuntime\(\)[\s\S]*openTauriChatWidget\(\{[\s\S]*eventType: "handoff:room-chat-route"[\s\S]*roomId/,
  "Project-room chat route must bridge to the chat widget in Tauri.",
);
assertContains(
  appChat,
  /isTauriRuntime\(\)[\s\S]*openTauriChatWidget\(\{[\s\S]*eventType: "handoff:chat-route"[\s\S]*router\.replace\(fallbackRoute\)/,
  "Direct /app/chat in Tauri must hand off to the chat widget and leave the chat page.",
);

assertContains(
  authPanel,
  /process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN === "true"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN/,
  "Tauri login must not bypass Google OAuth with a dev access token unless the explicit Tauri dev-login flag is set.",
);
assertContains(
  authPanel,
  /const TAURI_MEMBER_APP_ROUTE = "\/app\/";[\s\S]*function createTauriLoginState\(\) \{[\s\S]*crypto\.randomUUID\(\)[\s\S]*return btoa\(JSON\.stringify\(\{ nonce, returnTo: TAURI_MEMBER_APP_ROUTE \}\)\);[\s\S]*async function runTauriLoginStep<T>[\s\S]*throw new Error\(`\$\{stage\}: \$\{getErrorMessage\(error\)\}`\)[\s\S]*const state = createTauriLoginState\(\);[\s\S]*runTauriLoginStep\("authorize"[\s\S]*tauriCommands\.getTauriGoogleAuthorizationUrl\(\{[\s\S]*apiBaseUrl: getApiBaseUrl\(\)[\s\S]*redirectUri: TAURI_LOOPBACK_REDIRECT_URI[\s\S]*state,[\s\S]*runTauriLoginStep\("complete-oauth"[\s\S]*tauriCommands\.completeTauriGoogleOauth\(\{[\s\S]*apiBaseUrl: getApiBaseUrl\(\)[\s\S]*authorizeUrl,[\s\S]*expectedState: state,[\s\S]*redirectUri: TAURI_LOOPBACK_REDIRECT_URI[\s\S]*runTauriLoginStep\("store-session"[\s\S]*setStoredAuthSessionAndWaitForTauriMirror\(\{ \.\.\.token, clientType: "TAURI" \}\)[\s\S]*tauriCommands\.openMainWindowRoute\(\{ route: TAURI_MEMBER_APP_ROUTE \}\)[\s\S]*router\.replace\(TAURI_MEMBER_APP_ROUTE\)/,
  "Tauri login must use the native complete OAuth command with a nonce state, persist the TAURI session mirror, and open the packaged /app/ member route after token exchange.",
);
assertNotContains(
  authPanel,
  /catch \{[\s\S]*existing WebView OAuth path|catch \{[\s\S]*authApi\.getGoogleAuthorizationUrl\(\{[\s\S]*state: "login"/,
  "Tauri OAuth failures must not fall back into WebView OAuth and repeat Google login.",
);
assertContains(
  tauriLib,
  /struct ApiEnvelopeError \{[\s\S]*code: Option<String>[\s\S]*trace_id: Option<String>[\s\S]*traceId=\{trace_id\}[\s\S]*fn focus_main_window_after_oauth_callback\(app: &AppHandle\)[\s\S]*window\.unminimize\(\)[\s\S]*window\.show\(\)[\s\S]*window\.set_focus\(\)[\s\S]*fn start_tauri_google_oauth_loopback\([\s\S]*app: AppHandle[\s\S]*focus_main_window_after_oauth_callback\(&app\)[\s\S]*return Ok\(result\);/,
  "Tauri OAuth loopback must expose backend auth error code/traceId and bring the app forward after Google callback.",
);
assertContains(
  authApi,
  /function assertDevAccessTokenLoginAllowed\(\)[\s\S]*process\.env\.NODE_ENV !== "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN !== "true"[\s\S]*throw new AuthConfigurationError\("DEV_ACCESS_TOKEN_LOGIN_DISABLED"\)/,
  "authApi.loginWithDevAccessToken must also reject dev-token login outside the explicit development-only Tauri dev-login flag.",
);
assertContains(
  authApi,
  /async loginWithDevAccessToken\(accessToken: string\) \{[\s\S]*assertDevAccessTokenLoginAllowed\(\);/,
  "authApi.loginWithDevAccessToken must enforce the dev-login guard before calling /api/me.",
);
assertContains(
  authSession,
  /const DEV_REFRESH_TOKEN_PREFIX = "dev-refresh-token:";[\s\S]*function shouldRejectStoredAuthSession\(session: StoredAuthSession\)[\s\S]*isDevAccessTokenSession\(session\) && !isDevAccessTokenSessionAllowed\(\)/,
  "Stored synthetic dev-token sessions must be rejected unless the explicit development-only Tauri dev-login flag is set.",
);
assertContains(
  authSessionDiagnosticsType,
  /isDevAccessTokenSession\?: boolean;[\s\S]*wouldRejectDevAccessTokenSession\?: boolean;[\s\S]*refreshTokenExpired\?: boolean;/,
  "AuthSessionDiagnostics must expose redacted real-vs-dev session booleans for manual Tauri OAuth QA.",
);
assertNotContains(
  authSessionDiagnosticsType,
  /accessToken\s*[?:]:|refreshToken\s*[?:]:|sessionJson\s*[?:]:|userId\s*[?:]:|userName\s*[?:]:|userBubliId\s*[?:]:/,
  "AuthSessionDiagnostics must not expose raw access tokens, refresh tokens, mirrored session JSON, or user identifiers.",
);
assertContains(
  authSession,
  /export function getStoredAuthSessionDiagnostics\(\): AuthSessionDiagnostics[\s\S]*createAuthSessionDiagnostics\([\s\S]*"localStorage"/,
  "Manual Tauri OAuth QA must be able to inspect a redacted localStorage auth session snapshot.",
);
assertContains(
  authSession,
  /export async function readTauriAuthSessionDiagnostics\(\): Promise<AuthSessionDiagnostics>[\s\S]*tauriCommands\.readTauriAuthSession\(\)[\s\S]*createAuthSessionDiagnostics\("tauriMirror"/,
  "Manual Tauri OAuth QA must be able to inspect a redacted Tauri SQLite auth mirror snapshot.",
);
assertContains(
  authSession,
  /const parsed = parseStoredAuthSession\(raw\);[\s\S]*shouldRejectStoredAuthSession\(parsed\)[\s\S]*clearStoredAuthSession\(\);/,
  "Local stored auth session reads must clear stale dev-token sessions when the dev-login flag is not enabled.",
);
assertContains(
  authSession,
  /const parsed = parseStoredAuthSession\(restored\.sessionJson\);[\s\S]*shouldRejectStoredAuthSession\(parsed\)[\s\S]*clearTauriAuthSessionMirror\(\);/,
  "Tauri mirrored auth session restore must clear stale dev-token sessions when the dev-login flag is not enabled.",
);
assertContains(
  authSession,
  /probeStoredAuthSessionRestoreFromTauriMirrorForQa[\s\S]*window\.localStorage\.removeItem\(AUTH_SESSION_STORAGE_KEY\)[\s\S]*restoreStoredAuthSessionFromTauri\(\)[\s\S]*restoredRealOAuthSession[\s\S]*window\.localStorage\.setItem\(AUTH_SESSION_STORAGE_KEY, originalRawSession\)/,
  "Manual Tauri OAuth QA must simulate renderer-session loss inside auth-session and restore from the Tauri SQLite auth mirror without exposing raw tokens.",
);
assertContains(
  widgetAuthHeaders,
  /!isTauriRuntime\(\)[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_PREVIEW_DATA === "true"/,
  "Widget dev bearer headers must stay web-preview only and must not mask missing Tauri auth sessions.",
);
assertContains(
  workspacePreviewData,
  /function shouldUseWorkspacePreviewData\(\) \{[\s\S]*if \(isTauriRuntime\(\)\) return false;[\s\S]*NEXT_PUBLIC_BUBLI_PREVIEW_DATA === "true"/,
  "Workspace preview data must be disabled inside Tauri so hybrid app and widgets use real auth/API state.",
);

assertContains(
  widgetPage,
  /if \(!isTauri \|\| !authReady \|\| hasAuthSession\) return;[\s\S]*closeWidgetWindow/,
  "Desktop widget windows must close themselves when the restored Tauri auth session is missing.",
);
assertContains(
  widgetPage,
  /surfaceReadySentRef = useRef\(false\)[\s\S]*if \(!isTauri \|\| !mounted \|\| surfaceReadySentRef\.current\) return;[\s\S]*surfaceReadyOnly:\s*true/,
  "Desktop widget windows must send a surface-ready appReady after mount so Windows can apply transparent background before auth/data loading.",
);
assertContains(
  widgetPage,
  /if \(!isTauri \|\| !mounted \|\| !widgetSessionReady \|\| appReadySentRef\.current\) return;[\s\S]*tauriCommands\.appReady\(\{[\s\S]*qaAllWidgets:[\s\S]*selectedRoomId:/,
  "Desktop widget windows must send the full appReady/show path only after a valid widget session.",
);
assertContains(
  widgetPage,
  /listenWidgetRoomContextChanged\(\(payload\) => \{[\s\S]*syncActiveProjectRoomFromWidgetContext\(roomId\)/,
  "Desktop widget windows must sync room-context changes back through the shared active-room service.",
);
assertContains(
  widgetPage,
  /item\.kind === "message" \|\| route\.includes\("\/chat"\)[\s\S]*openTauriChatWidget\(\{[\s\S]*eventType: "handoff:message"/,
  "Desktop widget message handoffs must reopen the chat bubble instead of routing the main app to /app/chat.",
);
assertContains(
  widgetPage,
  /readWidgetSummary\(\{ preferLocalCache: false[\s\S]*serverResult\.status !== "failed"[\s\S]*summary:server-refresh-failed/,
  "Desktop widget cached summary fallback must record server refresh failures instead of hiding backend/API failures.",
);

assertContains(
  workspaceActiveRoom,
  /function syncActiveProjectRoomFromWidgetContext[\s\S]*mirrorActiveProjectRoomToServer\(cleanRoomId\)/,
  "Widget-origin project-room context changes must sync back to the backend widget context.",
);
assertContains(
  workspaceActiveRoom,
  /function syncActiveProjectRoomFromWidgetContext[\s\S]*mirrorActiveProjectRoomToServer\(null\)/,
  "Widget-origin project-room context clears must sync back to the backend widget context.",
);
assertContains(
  workspaceActiveRoom,
  /const runtimeSmokeEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";[\s\S]*function mirrorActiveProjectRoomToServer[\s\S]*if \(runtimeSmokeEnabled\) return;/,
  "Windows runtime smoke must not let stale AppShell active-room restore calls mirror project-room context to the backend.",
);
assertContains(
  widgetPage,
  /const devVoiceRoomId =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_WIDGET_DEV_VOICE_ROOM_ID[\s\S]*useState<string \| null>\(devVoiceRoomId\)/,
  "Desktop widget must ignore the dev voice room public env outside development builds.",
);

console.log("Tauri authenticated surface contract check passed.");
