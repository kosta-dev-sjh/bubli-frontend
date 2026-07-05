import { readFileSync } from "node:fs";

const files = {
  appNav: "src/components/layout/app-nav.tsx",
  appShell: "src/components/layout/app-shell.tsx",
  appChat: "src/app/(workspace)/app/chat/page.tsx",
  authApi: "src/features/auth/api/authApi.ts",
  authPanel: "src/features/auth/components/auth-panel.tsx",
  authSession: "src/lib/auth/auth-session.ts",
  authenticatedSurfaces: "src/lib/tauri/authenticated-surfaces.ts",
  chatWidgetRouting: "src/lib/tauri/chat-widget-routing.ts",
  desktopWidgetPage: "src/app/desktop-widget/page.tsx",
  desktopCommunicationRoute: "src/app/(workspace)/app/desktop/communication/page.tsx",
  devWidgetRealBackend: "scripts/dev-widget-real-backend.mjs",
  projectRoomChatRoute: "src/app/(workspace)/app/project-rooms/[roomId]/chat/page.tsx",
  layout: "src/app/layout.tsx",
  postLoginLauncher: "src/lib/tauri/tauri-post-login-launcher.tsx",
  runtimeSmokeRunner: "src/lib/tauri/tauri-runtime-smoke-runner.tsx",
  tauriCapability: "src-tauri/capabilities/default.json",
  tauriConf: "src-tauri/tauri.conf.json",
  tauriDevtoolsGuard: "src/lib/tauri/tauri-devtools-guard.tsx",
  tauriLib: "src-tauri/src/lib.rs",
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

const layout = read(files.layout);
const launcher = read(files.postLoginLauncher);
const runtimeSmokeRunner = read(files.runtimeSmokeRunner);
const tauriCapability = read(files.tauriCapability);
const tauriConf = read(files.tauriConf);
const tauriDevtoolsGuard = read(files.tauriDevtoolsGuard);
const tauriLib = read(files.tauriLib);
const surfaces = read(files.authenticatedSurfaces);
const chatWidgetRouting = read(files.chatWidgetRouting);
const appNav = read(files.appNav);
const appShell = read(files.appShell);
const appChat = read(files.appChat);
const authApi = read(files.authApi);
const authPanel = read(files.authPanel);
const authSession = read(files.authSession);
const widgetPage = read(files.desktopWidgetPage);
const widgetAuthHeaders = read(files.widgetAuthHeaders);
const workspaceActiveRoom = read(files.workspaceActiveRoom);
const workspacePreviewData = read(files.workspacePreviewData);
const desktopCommunicationRoute = read(files.desktopCommunicationRoute);
const devWidgetRealBackend = read(files.devWidgetRealBackend);
const projectRoomChatRoute = read(files.projectRoomChatRoute);
const windowsRuntimeSmoke = read(files.windowsRuntimeSmoke);

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
  /NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"/,
  "TauriRuntimeSmokeRunner must be disabled unless the explicit runtime-smoke env flag is enabled.",
);
assertContains(
  runtimeSmokeRunner,
  /navigator\.userAgent\.toLowerCase\(\)\.includes\("windows"\)/,
  "TauriRuntimeSmokeRunner must stay Windows-only so macOS runtime behavior is not touched.",
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
  /selectManagedFolder\(\{ path: smokeFolderPath \}\)[\s\S]*scanManagedFolder[\s\S]*searchLocalFiles[\s\S]*readLocalFilePreview[\s\S]*stageLocalFileEventsForSync[\s\S]*watchManagedFolder[\s\S]*triggerManagedFolderMutation[\s\S]*managed folder watcher staged update and delete events/,
  "TauriRuntimeSmokeRunner must verify managed-folder scan/search/preview/event staging and live watcher update/delete events against a temp folder.",
);
assertContains(
  runtimeSmokeRunner,
  /syncStagedLocalFileEventsToBackend[\s\S]*managedFolderApi\.syncApprovedLocalFileEvents[\s\S]*markLocalFileEventsSynced[\s\S]*local file event sync marked SQLite rows as SYNCED[\s\S]*analyzePersonalLocalFileWithKeySentences\(\{[\s\S]*local file key-sentence analysis reached real backend job[\s\S]*agentApi\.getJob\(localFileAnalysis\.data\.job\.jobId\)[\s\S]*local file analysis backend job read back[\s\S]*getPersonalLocalFileAnalysisStatus\(\{[\s\S]*local file analysis ledger marked SYNCED in SQLite[\s\S]*stageLocalFileAnalysisBackfill\(\{[\s\S]*synced local file analysis no longer remains pending[\s\S]*watched file event sync marked SQLite rows as SYNCED[\s\S]*synced watched file events no longer remain pending/,
  "TauriRuntimeSmokeRunner must send staged and watched local file events to the backend, request local-file analysis, read back the agent job, and verify local SQLite rows are no longer pending.",
);
assertContains(
  runtimeSmokeRunner,
  /triggerManualOutboxFileCreation[\s\S]*recordActivityContext\(\{[\s\S]*recordWidgetUsageEvent\(\{[\s\S]*syncAllLocalOutboxToServer\(\{ limit: 50 \}\)[\s\S]*manual integrated outbox sync sent file activity and widget usage[\s\S]*manual outbox activity no longer remains pending[\s\S]*manual outbox widget usage no longer remains pending[\s\S]*manual outbox file event no longer remains pending/,
  "TauriRuntimeSmokeRunner must verify the manual integrated local outbox path sends file, activity, and widget usage together.",
);
assertContains(
  runtimeSmokeRunner,
  /function smokeControlUrl[\s\S]*\/mutate-folder[\s\S]*function waitForManagedFolderEvents[\s\S]*"UPDATED"[\s\S]*"DELETED"/,
  "TauriRuntimeSmokeRunner must ask the Node smoke server to mutate watched files and poll for UPDATED/DELETED events.",
);
assertContains(
  windowsRuntimeSmoke,
  /runRuntimeSmokePhase\("full", accessToken\)[\s\S]*runRuntimeSmokePhase\("restore-verify", accessToken\)[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_PHASE: phase/,
  "Windows runtime smoke script must relaunch Tauri for the SQLite restore verification phase.",
);
assertContains(
  windowsRuntimeSmoke,
  /runtime-smoke-delete\.txt[\s\S]*request\.method === "POST" && request\.url === "\/mutate-folder"[\s\S]*appendFileSync[\s\S]*rmSync/,
  "Windows runtime smoke server must mutate and delete real temp files after the Tauri watcher starts.",
);
assertContains(
  windowsRuntimeSmoke,
  /runtime-smoke-manual-outbox\.dat[\s\S]*request\.method === "POST" && request\.url === "\/create-manual-outbox-file"[\s\S]*writeFileSync/,
  "Windows runtime smoke server must create a real temp file for manual integrated outbox sync.",
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
  /const runtimeSmokeEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";/,
  "TauriPostLoginLauncher must know when the Windows runtime smoke owns widget launch.",
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
  /await tauriCommands\.setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\);/,
  "launchTauriAuthenticatedSurfaces must open the native auth gate before widget windows.",
);
assertContains(
  surfaces,
  /const selectedRoomId = await resolveLaunchSelectedRoomId\(\);/,
  "launchTauriAuthenticatedSurfaces must resolve active project-room context before opening widgets.",
);
assertContains(
  surfaces,
  /const selectedRoomId = await resolveLaunchSelectedRoomId\(\);[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*const startupWindows = await resolveLoginStartupWindows\(\);/,
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
  /openWidgetWindowsWithRetry\(bubbleWindows, selectedRoomId, shouldContinueLaunch\)[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*if \(openedWindows\.length === 0\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly after bubble window attempts and before marking the launch active.",
);
assertContains(
  surfaces,
  /seedWidgetBarItems\(\{ selectedRoomId \}\)/,
  "launchTauriAuthenticatedSurfaces must seed minimized bar items after at least one widget opens.",
);
assertContains(
  surfaces,
  /openedWindows\.length === 0[\s\S]*throw rejectedReasons\[0\][\s\S]*launchedAuthenticatedSurfaces = true;[\s\S]*launchRequested = true;/,
  "A partially opened widget session must be treated as launched so auth/shell events do not repeatedly raise visible widgets.",
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
  /setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*closeAllWidgetWindows\(\)/,
  "stopTauriAuthenticatedSurfaces must disable the native auth gate and close all widgets.",
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
  /const runtimeSmokeEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";/,
  "AppShell must know when the Windows runtime smoke owns widget launch.",
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
  /TAURI_LOOPBACK_REDIRECT_URI = "http:\/\/127\.0\.0\.1:3791\/auth\/callback"[\s\S]*isTauriRuntime\(\)[\s\S]*startTauriGoogleOauthLoopback\(\{[\s\S]*authApi\.callbackGoogle\(\{[\s\S]*clientType: "TAURI"/,
  "Tauri login should try the Windows loopback OAuth bridge before falling back to the WebView OAuth path.",
);
assertContains(
  authPanel,
  /catch \{[\s\S]*existing WebView OAuth path[\s\S]*authApi\.getGoogleAuthorizationUrl\(\{[\s\S]*state: "login"[\s\S]*window\.location\.assign\(authorizeUrl\)/,
  "Tauri loopback OAuth failures must fall back to the existing WebView OAuth path.",
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
  /const runtimeSmokeEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";[\s\S]*function mirrorActiveProjectRoomToServer[\s\S]*if \(runtimeSmokeEnabled\) return;/,
  "Windows runtime smoke must not let stale AppShell active-room restore calls mirror project-room context to the backend.",
);

console.log("Tauri authenticated surface contract check passed.");
