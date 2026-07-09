import { existsSync, readFileSync } from "node:fs";

const files = {
  packageJson: "package.json",
  publicDownloadRoute: "src/app/(public)/download/page.tsx",
  publicHomePage: "src/app/(public)/page.tsx",
  publicHeader: "src/components/layout/public-header.tsx",
  publicRouteContract: "src/config/public-route-contract.ts",
  publicSiteConfig: "src/config/site.ts",
  publicHero: "src/features/public-site/components/public-hero.tsx",
  publicLandingNav: "src/features/public-site/components/landing-nav.tsx",
  personalResourceWorkspace: "src/features/resources/components/personal-resource-workspace.tsx",
  roomResourceWorkspace: "src/features/resources/components/room-resource-workspace.tsx",
  resourceBoardCommon: "src/features/resources/components/resource-board-common.tsx",
  desktopAppDownload: "src/features/download/components/desktop-app-download.tsx",
  settingsPage: "src/app/(workspace)/app/settings/page.tsx",
  calendarPage: "src/app/(workspace)/app/calendar/page.tsx",
  frontendSmoke: "scripts/check-frontend-smoke.mjs",
  appNav: "src/components/layout/app-nav.tsx",
  appShell: "src/components/layout/app-shell.tsx",
  appChat: "src/app/(workspace)/app/chat/page.tsx",
  appAgent: "src/app/(workspace)/app/agent/page.tsx",
  projectRoomsPage: "src/app/(workspace)/app/project-rooms/page.tsx",
  projectRoomWorkRoute: "src/app/(workspace)/app/project-rooms/[roomId]/work/page.tsx",
  projectRoomWorkBoard: "src/features/project-room/components/project-room-work-board.tsx",
  projectRoomSettingsPanel: "src/features/project-room/components/project-room-settings-panel.tsx",
  wbsGanttPanel: "src/features/wbs/components/wbs-gantt-panel.tsx",
  workspaceDashboard: "src/features/dashboard/components/workspace-dashboard.tsx",
  memoDashboardCard: "src/features/memo/components/memo-dashboard-card.tsx",
  apiClient: "src/lib/api/client.ts",
  authApi: "src/features/auth/api/authApi.ts",
  authPanel: "src/features/auth/components/auth-panel.tsx",
  authLiveHook: "src/features/auth/hooks/use-live-auth-user.ts",
  authSession: "src/lib/auth/auth-session.ts",
  activityAutoCapture: "src/lib/local/activity-auto-capture.ts",
  activityClient: "src/lib/local/activity-client.ts",
  authenticatedSurfaces: "src/lib/tauri/authenticated-surfaces.ts",
  startupOptimization: "src/lib/tauri/startup-optimization.ts",
  windowsRouteCache: "src/lib/tauri/windows-route-cache.ts",
  chatWidgetRouting: "src/lib/tauri/chat-widget-routing.ts",
  chatRealtime: "src/lib/websocket/chat-realtime.ts",
  desktopWidgetPage: "src/app/desktop-widget/page.tsx",
  desktopWidgetBubble: "src/features/widget/components/desktop-widget-bubble.tsx",
  desktopCommunicationRoute: "src/app/(workspace)/app/desktop/communication/page.tsx",
  devWidgetRealBackend: "scripts/dev-widget-real-backend.mjs",
  projectRoomChatRoute: "src/app/(workspace)/app/project-rooms/[roomId]/chat/page.tsx",
  layout: "src/app/layout.tsx",
  postLoginLauncher: "src/lib/tauri/tauri-post-login-launcher.tsx",
  tauriRuntimeGates: "src/lib/tauri/tauri-runtime-gates.tsx",
  realOAuthQaReporter: "src/lib/tauri/tauri-real-oauth-qa-reporter.tsx",
  authWidgetQa: "src/lib/tauri/tauri-auth-widget-qa.ts",
  managedFolderAutoSync: "src/lib/local/managed-folder-auto-sync.ts",
  widgetUsageAutoSync: "src/lib/widget/widget-usage-auto-sync.ts",
  firstRunController: "src/features/onboarding/components/first-run-controller.tsx",
  friendApi: "src/features/communication/api/friendApi.ts",
  runtimeSmokeRunner: "src/lib/tauri/tauri-runtime-smoke-runner.tsx",
  tauriCapability: "src-tauri/capabilities/default.json",
  tauriConf: "src-tauri/tauri.conf.json",
  tauriMacosConf: "src-tauri/tauri.macos.conf.json",
  tauriMain: "src-tauri/src/main.rs",
  tauriIconIco: "src-tauri/icons/icon.ico",
  tauriIconPng: "src-tauri/icons/icon.png",
  brandAppIconPng: "public/brand/icon-app-512.png",
  tauriInstallerHeaderBmp: "src-tauri/icons/installer-header.bmp",
  tauriInstallerSidebarBmp: "src-tauri/icons/installer-sidebar.bmp",
  tauriDevtoolsGuard: "src/lib/tauri/tauri-devtools-guard.tsx",
  tauriLib: "src-tauri/src/lib.rs",
  tauriWidgetUsage: "src-tauri/src/widget_usage.rs",
  prepareTauriDist: "scripts/prepare-tauri-dist.mjs",
  buildTauriWindowsDownload: "scripts/build-tauri-windows-download.mjs",
  publishTauriWindowsDownload: "scripts/publish-tauri-windows-download.mjs",
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

function readBuffer(path) {
  return readFileSync(path);
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

function readIcoSizes(buffer) {
  if (buffer.length < 6) {
    throw new Error("ICO file is too small.");
  }

  const reserved = buffer.readUInt16LE(0);
  const type = buffer.readUInt16LE(2);
  const count = buffer.readUInt16LE(4);
  if (reserved !== 0 || type !== 1 || count <= 0) {
    throw new Error("Invalid Windows ICO header.");
  }

  const sizes = [];
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16;
    if (offset + 16 > buffer.length) {
      throw new Error("ICO directory is truncated.");
    }

    const width = buffer[offset] === 0 ? 256 : buffer[offset];
    const height = buffer[offset + 1] === 0 ? 256 : buffer[offset + 1];
    sizes.push(`${width}x${height}`);
  }

  return sizes.sort((left, right) => Number(left.split("x")[0]) - Number(right.split("x")[0]));
}

function readBmpSize(buffer) {
  if (buffer.length < 26 || buffer.toString("ascii", 0, 2) !== "BM") {
    throw new Error("Invalid Windows BMP header.");
  }

  return {
    height: Math.abs(buffer.readInt32LE(22)),
    width: buffer.readInt32LE(18),
  };
}

const layout = read(files.layout);
const packageJson = read(files.packageJson);
const publicHomePage = read(files.publicHomePage);
const publicHeader = read(files.publicHeader);
const publicRouteContract = read(files.publicRouteContract);
const publicSiteConfig = read(files.publicSiteConfig);
const publicHero = read(files.publicHero);
const publicLandingNav = read(files.publicLandingNav);
const personalResourceWorkspace = read(files.personalResourceWorkspace);
const roomResourceWorkspace = read(files.roomResourceWorkspace);
const resourceBoardCommon = read(files.resourceBoardCommon);
const desktopAppDownload = read(files.desktopAppDownload);
const settingsPage = read(files.settingsPage);
const calendarPage = read(files.calendarPage);
const frontendSmoke = read(files.frontendSmoke);
const launcher = read(files.postLoginLauncher);
const tauriRuntimeGates = read(files.tauriRuntimeGates);
const realOAuthQaReporter = read(files.realOAuthQaReporter);
const authWidgetQa = read(files.authWidgetQa);
const managedFolderAutoSync = read(files.managedFolderAutoSync);
const widgetUsageAutoSync = read(files.widgetUsageAutoSync);
const firstRunController = read(files.firstRunController);
const friendApi = read(files.friendApi);
const runtimeSmokeRunner = read(files.runtimeSmokeRunner);
const tauriCapability = read(files.tauriCapability);
const tauriConf = read(files.tauriConf);
const tauriMacosConf = read(files.tauriMacosConf);
const tauriMain = read(files.tauriMain);
const tauriIconIco = readBuffer(files.tauriIconIco);
const tauriIconPng = readBuffer(files.tauriIconPng);
const brandAppIconPng = readBuffer(files.brandAppIconPng);
const tauriInstallerHeaderBmp = readBuffer(files.tauriInstallerHeaderBmp);
const tauriInstallerSidebarBmp = readBuffer(files.tauriInstallerSidebarBmp);
const tauriDevtoolsGuard = read(files.tauriDevtoolsGuard);
const tauriLib = read(files.tauriLib);
const tauriWidgetUsage = read(files.tauriWidgetUsage);
const prepareTauriDist = read(files.prepareTauriDist);
const buildTauriWindowsDownload = read(files.buildTauriWindowsDownload);
const publishTauriWindowsDownload = read(files.publishTauriWindowsDownload);
const runtimePreflight = read(files.runtimePreflight);
const oauthLiveContract = read(files.oauthLiveContract);
const realOAuthQaScript = read(files.realOAuthQaScript);
const localAutoSyncSoak = read(files.localAutoSyncSoak);
const windowsRuntimeSoak = read(files.windowsRuntimeSoak);
const surfaces = read(files.authenticatedSurfaces);
const startupOptimization = read(files.startupOptimization);
const windowsRouteCache = read(files.windowsRouteCache);
const chatWidgetRouting = read(files.chatWidgetRouting);
const chatRealtime = read(files.chatRealtime);
const appNav = read(files.appNav);
const appShell = read(files.appShell);
const appChat = read(files.appChat);
const appAgent = read(files.appAgent);
const projectRoomsPage = read(files.projectRoomsPage);
const projectRoomWorkRoute = read(files.projectRoomWorkRoute);
const projectRoomWorkBoard = read(files.projectRoomWorkBoard);
const projectRoomSettingsPanel = read(files.projectRoomSettingsPanel);
const wbsGanttPanel = read(files.wbsGanttPanel);
const workspaceDashboard = read(files.workspaceDashboard);
const memoDashboardCard = read(files.memoDashboardCard);
const apiClient = read(files.apiClient);
const authApi = read(files.authApi);
const authPanel = read(files.authPanel);
const authLiveHook = read(files.authLiveHook);
const authSession = read(files.authSession);
const activityAutoCapture = read(files.activityAutoCapture);
const activityClient = read(files.activityClient);
const widgetPage = read(files.desktopWidgetPage);
const widgetBubble = read(files.desktopWidgetBubble);
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
  /"qa:tauri-real-oauth:installed":\s*"node scripts\/qa-tauri-real-oauth-manual\.mjs --installed-release"/,
  "package.json must expose the installed NSIS real Google OAuth QA script.",
);
assertContains(
  packageJson,
  /"tauri:build":\s*"node scripts\/build-tauri-windows-download\.mjs"/,
  "package.json tauri:build must use the memory-safe Windows download build wrapper.",
);
assertContains(
  buildTauriWindowsDownload,
  /CARGO_BUILD_JOBS: process\.env\.CARGO_BUILD_JOBS \?\? "1"[\s\S]*CARGO_PROFILE_RELEASE_CODEGEN_UNITS: process\.env\.CARGO_PROFILE_RELEASE_CODEGEN_UNITS \?\? "16"[\s\S]*CARGO_PROFILE_RELEASE_OPT_LEVEL: process\.env\.CARGO_PROFILE_RELEASE_OPT_LEVEL \?\? "3"[\s\S]*CARGO_PROFILE_RELEASE_STRIP: process\.env\.CARGO_PROFILE_RELEASE_STRIP \?\? "symbols"[\s\S]*npm\.cmd run tauri -- build[\s\S]*scripts\/publish-tauri-windows-download\.mjs/,
  "Windows download builds must use memory-safe Cargo release defaults before publishing the installer.",
);
assertContains(
  startupOptimization,
  /windows:\s*\{[\s\S]*bubbleOpenStaggerMs:\s*0,[\s\S]*deferredBarCollectionRefreshDelayMs:\s*1_800,[\s\S]*deferredBarFullDisplayDelayMs:\s*120,[\s\S]*deferBarAgentCollectionsOnInitialDisplay:\s*true,[\s\S]*deferBarFullDisplayUntilAfterFirstPaint:\s*true,[\s\S]*displayRefreshThrottleMs:\s*200,[\s\S]*displayRequestTimeoutMs:\s*650,[\s\S]*initialDisplayPageSize:\s*30,[\s\S]*initialNotificationScanPages:\s*2,[\s\S]*menuOrbBadgeRefreshIntervalMs:\s*20_000,[\s\S]*preloadWidgetSettingsDuringStartup:\s*false,[\s\S]*requireMenuWindowDuringStartupReuse:\s*true,[\s\S]*summaryPrewarmTimeoutMs:\s*1_800,[\s\S]*widgetContextRefreshIntervalMs:\s*30_000/,
  "Windows startup optimization must use batched widget opening, defer initial bar collection refreshes, defer duplicate bar agent collection loads, bound display refreshes and display request waits, bounded initial display loads, bounded initial notification scans, slower fallback polling, no startup settings prefetch, menu reuse verification, first-paint deferral, and summary prewarm.",
);
assertContains(
  chatRealtime,
  /"heart-beat":\s*"10000,10000"[\s\S]*"X-Client-Type":\s*isTauriRuntime\(\)\s*\?\s*"desktop"\s*:\s*"web"/,
  "Chat realtime STOMP must advertise desktop client type and heartbeat so backend desktop presence is accurate on Windows/Tauri.",
);
assertContains(
  workspaceDashboard,
  /readWindowsDashboardInitialTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withDashboardInitialDeadline[\s\S]*dashboardApi\.getWork\(\)[\s\S]*return \{ data: emptyDashboard, kind: "ready" \}[\s\S]*workPromise[\s\S]*setState\(hasDashboardItems\(data\)/,
  "Windows Tauri dashboard must switch out of the loading state after a bounded initial wait and finish the slower server summary in the background.",
);
assertContains(
  workspaceDashboard,
  /fetchDashboard = useCallback\(async \(options\?: \{ keepCurrentOnWindowsRefresh\?: boolean \}\)[\s\S]*options\?\.keepCurrentOnWindowsRefresh && isWindowsTauriRuntime\(\) && \(current\.kind === "ready" \|\| current\.kind === "empty"\)[\s\S]*return current[\s\S]*refreshDashboard[\s\S]*fetchDashboard\(\{ keepCurrentOnWindowsRefresh: true \}\)/,
  "Windows Tauri dashboard refreshes must keep the current dashboard visible while slower dashboard data backfills.",
);
assertContains(
  workspaceDashboard,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*const cachedRooms = await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)[\s\S]*setRooms\(cachedRooms\)[\s\S]*setRoomsLoaded\(true\)[\s\S]*setRooms\(roomResult\.value\.items\)[\s\S]*writeWindowsProjectRoomsCache\(roomResult\.value\.items\)[\s\S]*else if \(!cachedRooms\)[\s\S]*setRooms\(\[\]\)/,
  "Windows Tauri dashboard must seed project-room widgets from the Windows route cache while the broader dashboard batch backfills.",
);
assertContains(
  memoDashboardCard,
  /readWindowsMemoInitialTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withMemoInitialDeadline[\s\S]*const memosRequest = roomId \? memoApi\.listRoom\(roomId, \{ size: MEMO_PAGE_SIZE \}\) : memoApi\.listPersonal\(\{ size: MEMO_PAGE_SIZE \}\)[\s\S]*const initialPage = await withMemoInitialDeadline\(memosRequest, initialTimeoutMs\)[\s\S]*setState\(\(current\) => \(current\.kind === "ready" \? current : \{ kind: "ready", memos: \[\] \}\)\)[\s\S]*memosRequest\.then\(applyMemoPage\)/,
  "Windows Tauri memo dashboard card must not hold the dashboard on memo server latency; it should deadline-bound the first load and backfill memos.",
);
assertContains(
  appAgent,
  /readWindowsAgentInitialTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withAgentInitialDeadline[\s\S]*const loadData = Promise\.all\([\s\S]*projectRoomApi\.list\(\)[\s\S]*agentApi\.listDailySummaries\(\)[\s\S]*const initialData = await withAgentInitialDeadline\(loadData, initialTimeoutMs\)[\s\S]*emptyAgentLoadData\(roomId, rooms\)[\s\S]*loadData\.then\(applyLoadedData\)/,
  "Windows Tauri agent page must switch out of loading after a bounded initial wait and finish slower agent collections in the background.",
);
assertContains(
  appAgent,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*void writeWindowsProjectRoomsCache\(data\.rooms\)[\s\S]*const cachedRooms = \(await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)\) \?\? \[\][\s\S]*current\.kind === "ready" \? current\.rooms : cachedRooms/,
  "Windows Tauri agent page must seed project-room options from the Windows route cache while slower agent data backfills.",
);
assertContains(
  appAgent,
  /keepCurrentOnWindowsRefresh[\s\S]*isWindowsTauriRuntime\(\)[\s\S]*return \{ \.\.\.current, selectedRoomId: roomId \}[\s\S]*refreshAgent[\s\S]*load\(roomId, \{ keepCurrentOnWindowsRefresh: true \}\)/,
  "Windows Tauri agent refreshes must keep current agent content visible while slower agent collections backfill.",
);
assertContains(
  appChat,
  /const displayMessages = useMemo\([\s\S]*withAgentCommandMessages\(t, withoutSyntheticAgentCommands\(messagesState\.messages\), currentUser, knownSenderNamesById\)[\s\S]*const messagesRequest = chatApi\.getMessages\(chatRoomId, \{ size: 40 \}\)[\s\S]*if \(isWindowsTauriRuntime\(\)\) \{[\s\S]*readCachedRoomMessages\(chatRoomId, 40\)[\s\S]*setMessagesState\(\{ kind: "ready", messages: cachedMessages \}\)[\s\S]*const page = await messagesRequest[\s\S]*syncCachedRoomMessages\(chatRoomId, sortedMessages, 0\)[\s\S]*setMessagesState\(\{ kind: "ready", messages: sortedMessages \}\)/,
  "Windows Tauri chat messages must show cached SQLite messages before waiting on the server, then backfill with the latest server page while keeping display-only agent command expansion out of message state.",
);
assertContains(
  appChat,
  /readWindowsChatRoomsCache[\s\S]*writeWindowsChatRoomsCache[\s\S]*const cachedRooms = await readWindowsChatRoomsCache\(\)[\s\S]*setRoomsState\(\{ kind: "ready", rooms: cachedRooms \}\)[\s\S]*setRoomsState\(\{ kind: "loading" \}\)[\s\S]*chatApi\.listRooms\(\)[\s\S]*void writeWindowsChatRoomsCache\(page\.items\)/,
  "Windows Tauri chat room lists must render the recent successful room list before waiting on the server, then replace it with the latest server list.",
);
assertContains(
  appChat,
  /readWindowsChatAuxTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withWindowsChatAuxDeadline[\s\S]*windowsChatAuxDelayMs[\s\S]*const friendsRequest = friendApi\.listFriends\(\)[\s\S]*const requestsRequest = friendApi\.listRequests\(\)[\s\S]*withWindowsChatAuxDeadline\(friendsRequest[\s\S]*withWindowsChatAuxDeadline\(requestsRequest[\s\S]*Promise\.allSettled\(\[friendsRequest, requestsRequest\]\)[\s\S]*const userRequest = authApi\.getMe\(\)[\s\S]*withWindowsChatAuxDeadline<AuthUser \| null>\(userRequest[\s\S]*WINDOWS_CHAT_AUX_POLL_INTERVAL_MS/,
  "Windows Tauri chat auxiliary social/profile/invitation requests must be delayed, deadline-bound, and backfilled so route transitions are not blocked by secondary server calls.",
);
assertContains(
  appChat,
  /const membersRequest = projectRoomApi\.getMembers\(selectedProjectRoomId\)[\s\S]*const windowsTimeoutMs = await readWindowsChatAuxTimeoutMs\(\)[\s\S]*withWindowsChatAuxDeadline<Awaited<typeof membersRequest> \| null>\(membersRequest, windowsTimeoutMs, null\)[\s\S]*setProjectRoomMembers\(\[\]\)[\s\S]*membersRequest[\s\S]*then\(\(latest\) => \{[\s\S]*setProjectRoomMembers\(latest\.items\.filter\(\(member\) => member\.status === "ACTIVE"\)\)/,
  "Windows Tauri project-room chat member hydration must be deadline-bound and backfilled so room switching is not held by the member-list call.",
);
assertContains(
  appChat,
  /getStoredAuthSession[\s\S]*const cachedUser = isWindowsTauriRuntime\(\) \? getStoredAuthSession\(\)\?\.user \?\? null : null[\s\S]*setProfileState\(\{ kind: "ready", user: cachedUser \}\)[\s\S]*const userRequest = authApi\.getMe\(\)[\s\S]*withWindowsChatAuxDeadline<AuthUser \| null>\(userRequest, windowsTimeoutMs, cachedUser\)[\s\S]*userRequest[\s\S]*then\(\(latestUser\) => setProfileState\(\{ kind: "ready", user: latestUser \}\)\)/,
  "Windows Tauri chat profile must show the mirrored session user immediately while /api/me validates and backfills in the background.",
);
assertContains(
  friendApi,
  /getStoredAuthSession[\s\S]*isWindowsTauriRuntime[\s\S]*async function resolveCurrentUserIdForFriendRequest\(\)[\s\S]*isWindowsTauriRuntime\(\)[\s\S]*getStoredAuthSession\(\)\?\.user\?\.id[\s\S]*authApi\.getMe\(\)[\s\S]*resolveCurrentUserIdForFriendRequest\(\)[\s\S]*apiRequest<FriendRequestApiResponse\[\]>\("\/api\/friend-requests"\)/,
  "Windows Tauri friend-request mapping must reuse the mirrored session user id instead of adding a duplicate /api/me call to chat auxiliary hydration.",
);
assertContains(
  projectRoomsPage,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*const cachedRooms = await readWindowsProjectRoomsCache\(\)[\s\S]*setState\(cachedRooms \? \{ kind: "ready", rooms: cachedRooms \} : \{ kind: "loading" \}\)[\s\S]*projectRoomApi\.list\(\)[\s\S]*void writeWindowsProjectRoomsCache\(page\.items\)/,
  "Windows Tauri project room lists must render the recent successful room list before waiting on the server, then replace it with the latest server list.",
);
assertContains(
  settingsPage,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*const cachedRooms = await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)[\s\S]*rooms: roomPageResult\?\.items \?\? cachedRooms \?\? \[\][\s\S]*void writeWindowsProjectRoomsCache\(retryRoomPage\.items\)/,
  "Windows Tauri settings must keep recent project-room options while slower settings hydration and room-list backfill finish.",
);
assertContains(
  calendarPage,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*const cachedRooms = await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)[\s\S]*setRoomCalendarNames\(cachedNames\)[\s\S]*projectRoomApi\.list\(\)[\s\S]*void writeWindowsProjectRoomsCache\(roomsResult\.value\.items\)[\s\S]*else if \(cachedRooms\)/,
  "Windows Tauri calendar must reuse cached project-room names for calendar grouping while the server room list backfills.",
);
assertContains(
  windowsRouteCache,
  /WINDOWS_CHAT_ROOMS_CACHE_KEY[\s\S]*WINDOWS_PROJECT_ROOMS_CACHE_KEY[\s\S]*isWindowsTauriRuntime\(\)[\s\S]*tauriCommands\.readWidgetPref[\s\S]*isWindowsTauriRuntime\(\)[\s\S]*tauriCommands\.storeWidgetPref[\s\S]*readWindowsChatRoomsCache[\s\S]*writeWindowsChatRoomsCache[\s\S]*readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache/,
  "Windows route caches must use Tauri SQLite widget preferences instead of browser localStorage.",
);
assertContains(
  appShell,
  /writeWindowsChatRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*void writeWindowsProjectRoomsCache\(roomPage\.items\)[\s\S]*const rooms = roomPage\.value\.items[\s\S]*void writeWindowsProjectRoomsCache\(rooms\)[\s\S]*chatApi[\s\S]*\.listRooms\(\)[\s\S]*writeWindowsChatRoomsCache\(page\.items\)/,
  "AppShell must prewarm Windows route caches so first navigation does not wait on room-list server calls.",
);
assertContains(
  appShell,
  /isWindowsTauriRuntime[\s\S]*WINDOWS_SHELL_BACKGROUND_DELAY_MS[\s\S]*windowsShellBackgroundDelayMs[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*notificationApi\.list\(\{ status: "UNREAD" \}\)[\s\S]*projectRoomApi\.getMyInvitations\("PENDING"\)[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*chatApi[\s\S]*\.listRooms\(\)[\s\S]*windowsShellBackgroundDelayMs\(\)/,
  "Windows AppShell background notification/invitation/chat-cache requests must be delayed and request only unread notifications so they do not compete with first route rendering.",
);
assertContains(
  appShell,
  /const refreshShellLists = useCallback\(async \(\) => \{[\s\S]*const workspaceHydrationTimeoutMs = await readWindowsWorkspaceHydrationTimeoutMs\(\)[\s\S]*const roomRequest = projectRoomApi\.list\(\)[\s\S]*const notificationRequest = notificationApi\.list\(\{ status: "UNREAD" \}\)[\s\S]*const invitationRequest = projectRoomApi\.getMyInvitations\("PENDING"\)[\s\S]*boundWindowsWorkspaceHydration\(roomRequest, workspaceHydrationTimeoutMs, null\)[\s\S]*boundWindowsWorkspaceHydration\(notificationRequest, workspaceHydrationTimeoutMs, null\)[\s\S]*Promise\.allSettled\(\[roomRequest, notificationRequest, invitationRequest\]\)\.then/,
  "Windows AppShell refreshes must deadline-bound shell list refreshes and backfill project rooms, unread notifications, and invitations instead of letting one slow request delay the shell update batch.",
);
assertContains(
  projectRoomWorkRoute,
  /getStoredAuthSession[\s\S]*readWindowsProjectRoomsCache[\s\S]*readWindowsWorkRouteTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withWorkRouteDeadline[\s\S]*readCachedWindowsWorkRoom[\s\S]*const cachedUser = isWindowsTauriRuntime\(\) \? getStoredAuthSession\(\)\?\.user \?\? null : null[\s\S]*const cachedRoom = await readCachedWindowsWorkRoom\(roomId\)[\s\S]*const currentUserRequest = authApi\.getMe\(\)[\s\S]*const roomRequest = projectRoomApi\.get\(roomId\)[\s\S]*const boardRequest = wbsApi\.getBoard\(roomId\)[\s\S]*withWorkRouteDeadline<AuthUser>\(currentUserRequest, routeTimeoutMs, cachedUser\)[\s\S]*withWorkRouteDeadline<ProjectRoomResponse>\(roomRequest, routeTimeoutMs, cachedRoom\)[\s\S]*withWorkRouteDeadline\(membersPromise, routeTimeoutMs\)[\s\S]*Promise\.allSettled\(\[currentUserRequest, roomRequest\]\)[\s\S]*membersPromise\.then/,
  "Project room work route must not block Windows board entry on user, room, or member-list hydration; cached session/room context should render first and slower server details should backfill.",
);
assertContains(
  projectRoomWorkBoard,
  /isWindowsTauriRuntime[\s\S]*readWindowsWorkCandidateTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withWindowsWorkCandidateDeadline[\s\S]*const wbsRequest = fetchCandidateSuggestions\("wbs"\)[\s\S]*const taskRequest = fetchCandidateSuggestions\("tasks"\)[\s\S]*withWindowsWorkCandidateDeadline\(wbsRequest, timeoutMs, \[\]\)[\s\S]*withWindowsWorkCandidateDeadline\(taskRequest, timeoutMs, \[\]\)[\s\S]*Promise\.allSettled\(\[wbsRequest, taskRequest\]\)[\s\S]*setCandidateSuggestions/,
  "Project room work board must not block Windows board interaction on initial AI candidate suggestions; candidate lists should be deadline-bound and backfilled.",
);
assertContains(
  wbsGanttPanel,
  /readWindowsWbsCalendarTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withWindowsWbsCalendarDeadline[\s\S]*const request = calendarApi\.getEvents\(\{ roomId, \.\.\.scheduleRangeQuery\(\) \}\)[\s\S]*withWindowsWbsCalendarDeadline\(request, timeoutMs, null\)[\s\S]*setSchedules\(page\.items\.filter[\s\S]*request[\s\S]*setSchedules\(latest\.items\.filter[\s\S]*const request = calendarApi\.getGoogleConnection\(\)[\s\S]*withWindowsWbsCalendarDeadline<GoogleCalendarConnectionResponse \| null>\(request, timeoutMs, null\)[\s\S]*setCalendarSync\(isActive \? "recording" : "off"\)[\s\S]*const request = calendarApi\.getGroupedEvents\(\{ from, roomId, to \}\)[\s\S]*setRoomGroupEventCount/,
  "WBS Gantt panel must not block Windows work-board rendering on auxiliary calendar/Google status calls; it should deadline-bound and backfill those calendar details.",
);
assertContains(
  projectRoomSettingsPanel,
  /readWindowsRoomSettingsTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withWindowsRoomSettingsDeadline[\s\S]*const referencesRequest = agentApi\.listRoomContractReferences\(room\.id\)[\s\S]*const resourcesRequest = resourcesApi\.listRoomResources\(room\.id\)\.then\(\(page\) => page\.items\)[\s\S]*withWindowsRoomSettingsDeadline\(referencesRequest, timeoutMs, \[\]\)[\s\S]*withWindowsRoomSettingsDeadline\(resourcesRequest, timeoutMs, \[\]\)[\s\S]*Promise\.allSettled\(\[referencesRequest, resourcesRequest\]\)[\s\S]*const request = projectRoomApi\.getInvitations\(room\.id\)[\s\S]*withWindowsRoomSettingsDeadline<Awaited<typeof request> \| null>\(request, timeoutMs, null\)[\s\S]*const request = friendApi\.listFriends\(\)[\s\S]*withWindowsRoomSettingsDeadline<FriendResponse\[\] \| null>\(request, timeoutMs, null\)/,
  "Project room settings panel must not block Windows settings interactions on contract/friend/invitation hydration; those requests should be deadline-bound and backfilled.",
);
assertContains(
  startupOptimization,
  /const STARTUP_OPTIMIZATION_PLATFORM = "windows"[\s\S]*function resolveCachedProfile\(parsed: \{ platform\?: unknown; profile\?: unknown \}\)[\s\S]*isWindowsRuntime\(\) && parsed\.platform !== STARTUP_OPTIMIZATION_PLATFORM[\s\S]*return "windows"[\s\S]*return cachedProfile \?\? resolveDefaultProfile\(\)[\s\S]*platform: isWindowsRuntime\(\) \? STARTUP_OPTIMIZATION_PLATFORM : "default"/,
  "Windows startup optimization must migrate legacy cached profiles to the Windows profile while preserving newly written platform-tagged preferences.",
);
assertContains(
  publishTauriWindowsDownload,
  /const sourceRelative = windowsInstallerSourceRelative\(\)[\s\S]*const source = resolve\(root, sourceRelative\)[\s\S]*public\/downloads\/windows\/Bubli-Windows-latest\.exe[\s\S]*manifest\.json[\s\S]*const hash = sha256\(target\)[\s\S]*sha256: hash[\s\S]*source: sourceRelative[\s\S]*src-tauri\/target\/release\/bundle\/nsis\/\$\{productName\}_\$\{version\}_x64-setup\.exe/,
  "Windows download publish must copy the signed/iconed NSIS installer to the public direct-download exe path and record its SHA256 in the manifest.",
);
if (existsSync(files.publicDownloadRoute)) {
  throw new Error("/download must not be implemented as a public page; public CTAs must download installers directly from the landing page.");
}
assertNotContains(
  publicRouteContract,
  /path:\s*"\/download"/,
  "The public route contract must not list /download as a page route.",
);
assertNotContains(
  frontendSmoke,
  /"\/download"/,
  "Frontend smoke routes must not expect the removed /download page.",
);
assertContains(
  publicSiteConfig,
  /href:\s*"\/#download"/,
  "Public site config must point download navigation to the landing-page download section.",
);
assertContains(
  publicHeader,
  /"\/#download":\s*"nav\.public\.download"/,
  "Public header must map the download nav item to the landing-page download section.",
);
assertContains(
  publicLandingNav,
  /href:\s*"\/#download"[\s\S]*id:\s*"download"/,
  "Landing nav must link to the in-page download section instead of /download.",
);
assertContains(
  publicHero,
  /const windowsInstallerHref = "\/downloads\/windows\/Bubli-Windows-latest\.exe";[\s\S]*download href=\{windowsInstallerHref\}/,
  "Public hero download CTA must directly download the Windows installer instead of navigating to /download.",
);
assertContains(
  publicHomePage,
  /const windowsInstallerHref = "\/downloads\/windows\/Bubli-Windows-latest\.exe";[\s\S]*download href=\{windowsInstallerHref\}[\s\S]*href="\/#download"/,
  "Public landing page must keep direct installer links and footer navigation to the in-page download section.",
);
assertContains(
  personalResourceWorkspace,
  /const windowsInstallerHref = "\/downloads\/windows\/Bubli-Windows-latest\.exe";[\s\S]*download href=\{windowsInstallerHref\}/,
  "Resource empty-state desktop CTA must directly download the Windows installer instead of navigating to /download.",
);
assertContains(
  personalResourceWorkspace,
  /readWindowsResourceInitialTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withResourceInitialDeadline[\s\S]*const loadData = Promise\.all\([\s\S]*resourcesApi\.listPersonal\(\)[\s\S]*agentApi\.listGeneratedDocuments\(\)[\s\S]*const initialData = await withResourceInitialDeadline\(loadData, initialTimeoutMs\)[\s\S]*loadData\.then\(applyLoadedData\)/,
  "Windows Tauri personal resources must switch out of loading after a bounded initial wait and finish slower resource collections in the background.",
);
assertContains(
  personalResourceWorkspace,
  /const refreshResources = useCallback\(\(\) => \{[\s\S]*if \(!isWindowsTauriRuntime\(\)\) \{[\s\S]*setState\(\{ kind: "loading" \}\)[\s\S]*void loadResources\(\)/,
  "Windows Tauri personal resource refreshes must keep the current list visible while server data backfills.",
);
assertContains(
  roomResourceWorkspace,
  /readWindowsResourceInitialTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withResourceInitialDeadline[\s\S]*const loadData = Promise\.all\([\s\S]*resourcesApi\.listRoomResources\(roomId\)[\s\S]*agentApi\.listRoomGeneratedDocuments\(roomId\)[\s\S]*const initialData = await withResourceInitialDeadline\(loadData, initialTimeoutMs\)[\s\S]*loadData\.then\(applyLoadedData\)/,
  "Windows Tauri room resources must switch out of loading after a bounded initial wait and finish slower resource collections in the background.",
);
assertContains(
  roomResourceWorkspace,
  /const refreshResources = useCallback\(\(\) => \{[\s\S]*if \(!isWindowsTauriRuntime\(\)\) \{[\s\S]*setState\(\{ kind: "loading" \}\)[\s\S]*void loadResources\(\)/,
  "Windows Tauri room resource refreshes must keep the current list visible while server data backfills.",
);
assertContains(
  resourceBoardCommon,
  /readWindowsResourceDetailTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*withWindowsResourceDetailDeadline[\s\S]*const detailRequest = Promise\.allSettled\(\[[\s\S]*resourcesApi\.get\(resource\.id\)[\s\S]*resourcesApi\.getSummary\(resource\.id\)[\s\S]*resourcesApi\.getVersions\(resource\.id\)[\s\S]*resourcesApi\.getComments\(resource\.id\)[\s\S]*resourcesApi\.getRelated\(resource\.id\)[\s\S]*withWindowsResourceDetailDeadline<Awaited<typeof detailRequest> \| null>\(detailRequest, timeoutMs, null\)[\s\S]*setDetailLoading\(false\)[\s\S]*detailRequest\.then\(applyDetailResults\)/,
  "Windows Tauri resource detail panels must stop showing detail loading after a bounded wait and backfill slower summary/version/comment/related data.",
);
assertContains(
  settingsPage,
  /import \{ DesktopAppDownload \} from "@\/features\/download\/components\/desktop-app-download";[\s\S]*<DesktopAppDownload \/>/,
  "Settings desktop tab must render the direct desktop installer download component.",
);
assertContains(
  desktopAppDownload,
  /const WINDOWS_FALLBACK_HREF = "\/downloads\/windows\/Bubli-Windows-latest\.exe";[\s\S]*download[\s\S]*href=\{windowsHref\}/,
  "Settings desktop CTA must directly download the Windows installer instead of navigating to /download.",
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
  /<TauriRuntimeGates\s*\/>/,
  "Root layout must mount TauriRuntimeGates so Tauri guards and explicit QA runners stay available.",
);
assertContains(
  tauriLib,
  /fn widget_uses_transparent_pointer_passthrough\(widget: &WidgetWindowState\) -> bool \{[\s\S]*cfg!\(target_os = "windows"\) && matches!\(widget\.active_bubble\.as_str\(\), "bar" \| "menu"\)[\s\S]*fn widget_initial_ignore_cursor_events\(widget: &WidgetWindowState\) -> bool \{[\s\S]*widget\.click_through \|\| widget_uses_transparent_pointer_passthrough\(widget\)[\s\S]*if rects\.is_empty\(\) \{[\s\S]*return widget_label_defaults_to_pointer_passthrough\(label\);/,
  "Windows transparent bar/menu widget chrome must pass clicks through before interactive rects are reported.",
);
assertContains(
  tauriRuntimeGates,
  /const realOAuthQaEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";[\s\S]*import\("@\/lib\/tauri\/tauri-real-oauth-qa-reporter"\)[\s\S]*realOAuthQaEnabled \? <TauriRealOAuthQaReporter \/> : null/,
  "TauriRuntimeGates must lazy-load TauriRealOAuthQaReporter only when the explicit real OAuth QA flag is enabled.",
);
assertContains(
  realOAuthQaReporter,
  /const realOAuthQaEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL/,
  "TauriRealOAuthQaReporter must require the explicit real OAuth QA env flag and report URL, including QA-instrumented release builds.",
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
assertContains(
  realOAuthQaReporter,
  /type RealOAuthQaRouteProbe[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_EVENT_URL[\s\S]*const realOAuthQaAttemptTimeoutMs[\s\S]*const routeProbeGraceMs[\s\S]*const missingAuthSessionReportAttempts = 3[\s\S]*assertTauriRealGoogleAuthWidgetQaBeforeTimeout[\s\S]*Math\.min\(remainingMs, realOAuthQaAttemptTimeoutMs\)[\s\S]*hasAnyStoredAuthSessionForQa[\s\S]*const recordRouteSample[\s\S]*const buildRouteProbe[\s\S]*latestAssertion = await assertTauriRealGoogleAuthWidgetQaBeforeTimeout\(startedAt\)[\s\S]*failedChecks: latestAssertion\.failedChecks[\s\S]*stage: "assertion"[\s\S]*stage: "report-posted"[\s\S]*stage: "report-error"/,
  "TauriRealOAuthQaReporter must emit redacted lifecycle diagnostics and route/paint probes for release QA timeouts.",
);
assertContains(
  realOAuthQaReporter,
  /let missingAuthSessionCount = 0[\s\S]*if \(await hasAnyStoredAuthSessionForQa\(\)\) \{[\s\S]*missingAuthSessionCount = 0[\s\S]*missingAuthSessionCount \+= 1[\s\S]*missingAuthSessionCount >= missingAuthSessionReportAttempts[\s\S]*Missing a real Google TAURI session/,
  "TauriRealOAuthQaReporter must fail fast with a redacted report when release QA starts without a stored auth session.",
);
assertContains(
  realOAuthQaReporter,
  /let realOAuthQaRunActive = false;[\s\S]*let realOAuthQaReportPosted = false;[\s\S]*const pathnameRef = useRef\(pathname\)[\s\S]*recordRouteSample = useCallback\(\(nextPathname = currentPathname\(pathnameRef\.current\)\)[\s\S]*pathnameRef\.current = pathname[\s\S]*realOAuthQaRunActive \|\| realOAuthQaReportPosted[\s\S]*realOAuthQaRunActive = true[\s\S]*realOAuthQaReportPosted = true[\s\S]*if \(!running\) \{[\s\S]*disposed = true[\s\S]*\}, \[buildRouteProbe, isDesktopWidgetSurface, recordRouteSample\]\);/,
  "TauriRealOAuthQaReporter must keep one QA run alive across /app to /login route changes instead of starting duplicate runs.",
);
assertContains(
  realOAuthQaReporter,
  /finalPathname\.startsWith\("\/app"\)[\s\S]*!state\.sawAuthGateAfterGrace[\s\S]*!state\.sawLoginPathAfterGrace[\s\S]*!state\.sawLoginSurfaceAfterGrace[\s\S]*!finalEntry\.hasAuthGate[\s\S]*!finalEntry\.hasLoginSurface/,
  "TauriRealOAuthQaReporter route probe must fail if the app auth gate or login surface remains visible after grace.",
);
assertNotContains(
  realOAuthQaReporter,
  /const realOAuthQaEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true"/,
  "TauriRealOAuthQaReporter must not be development-only because release-exe QA needs the report bridge in a production bundle.",
);
assertContains(
  launcher,
  /const realOAuthQaEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";[\s\S]*!\(authDiagnosticsEnabled \|\| realOAuthQaEnabled\)/,
  "Tauri auth diagnostics globals must stay available for explicit real OAuth QA release builds.",
);
assertNotContains(
  launcher,
  /process\.env\.NODE_ENV !== "development"[\s\S]*!\(authDiagnosticsEnabled \|\| realOAuthQaEnabled\)/,
  "Tauri auth diagnostics globals must not be development-only because release-exe QA needs them in a production bundle.",
);
assertNotContains(
  realOAuthQaReporter,
  /NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN|accessToken\s*[?:]:|refreshToken\s*[?:]:|sessionJson\s*[?:]:/,
  "TauriRealOAuthQaReporter must not depend on dev tokens or expose raw auth secrets.",
);
assertContains(
  realOAuthQaScript,
  /NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN:\s*"false"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_PREPARE_URL[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_CREATE_URL[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_DELETE_URL[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_MUTATE_URL[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS:\s*"15000"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA:\s*"true"[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_EVENT_URL[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_REPORT_URL/,
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
  /request\.on\("end"[\s\S]*const report = decorateQaReport\(JSON\.parse\(body\)\);[\s\S]*validateRealOAuthQaReport\(report\)[\s\S]*resolveReport\(report\)/,
  "Manual real OAuth QA script must validate posted reports before accepting them.",
);
assertContains(
  realOAuthQaScript,
  /request\.method === "POST" && request\.url === "\/event"[\s\S]*validateRealOAuthQaEvent\(event\)[\s\S]*qaEvents\.push\(event\)[\s\S]*writeDiagnostics\(error, qaEvents\)[\s\S]*event\.failedChecks !== undefined[\s\S]*event\.failedChecks\.every/,
  "Manual real OAuth QA script must collect redacted lifecycle diagnostics when the release app does not post a final report.",
);
assertContains(
  realOAuthQaScript,
  /currentFileName = `real-oauth-local-sync-note-\$\{prepareCount\}-\$\{Date\.now\(\)\}\.txt`[\s\S]*return \{ fileName: currentFileName, notePath: currentNotePath \}[\s\S]*\/mutate-local-file[\s\S]*JSON\.stringify\(\{ fileName: mutation\.fileName, marker: mutation\.marker \}\)[\s\S]*\/prepare-local-file[\s\S]*JSON\.stringify\(\{ fileName: prepared\.fileName, notePath: prepared\.notePath \}\)/,
  "Manual real OAuth QA local file fixture must use a fresh fileName per prepare so repeated assertions still prove CREATED sync.",
);
assertContains(
  realOAuthQaScript,
  /const REPORTER_TIMEOUT_MS = Number\([\s\S]*Math\.max\(10_000, TIMEOUT_MS - 60_000\)[\s\S]*const REPORTER_ATTEMPT_TIMEOUT_MS = Number\([\s\S]*30_000[\s\S]*Reporter timeout: \$\{REPORTER_TIMEOUT_MS\}ms; harness timeout: \$\{TIMEOUT_MS\}ms[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_ATTEMPT_TIMEOUT_MS: String\(REPORTER_ATTEMPT_TIMEOUT_MS\)[\s\S]*NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA_TIMEOUT_MS: String\(REPORTER_TIMEOUT_MS\)/,
  "Manual real OAuth QA script must give the reporter a shorter timeout and cap each assertion so failed reports can arrive before harness timeout.",
);
assertContains(
  realOAuthQaScript,
  /const rawReport = await Promise\.race[\s\S]*const report = decorateQaReport\(rawReport\)[\s\S]*validateRealOAuthQaReport\(report\)[\s\S]*const outputPaths = writeReport\(report\)[\s\S]*JSON\.stringify\(\{ \.\.\.outputPaths, \.\.\.report \}/,
  "Manual real OAuth QA script must validate the final report before writing JSON and markdown evidence outputs.",
);
assertContains(
  realOAuthQaScript,
  /function validateRealOAuthQaReport[\s\S]*forbiddenReportFieldPattern[\s\S]*assert\(report\.assertion\?\.ok === true[\s\S]*assert\(snapshot\.localSession\.isDevAccessTokenSession === false[\s\S]*assert\([\s\S]*snapshot\.tauriMirrorSession\.isDevAccessTokenSession === false[\s\S]*launchReadinessTimings\(snapshot\)[\s\S]*finite readiness timing anchors[\s\S]*assert\(widgetStartupRestoreReady\(snapshot\)[\s\S]*assert\(snapshot\.syncRuntime\?\.allAutoSyncLoopsRunning[\s\S]*managedFolderStatusHealthy\(snapshot\)[\s\S]*lastFileAnalysisFailedCountScope[\s\S]*assert\(snapshot\.localSyncProbe\?\.enabled[\s\S]*assert\(snapshot\.localSyncProbe\.sqlite\?\.ok[\s\S]*snapshot\.localSyncProbe\.localFiles\?\.enabled[\s\S]*initialPreviewIncludesMarker[\s\S]*initialSyncSyncedCount[\s\S]*initialSyncAnalysisRequestedCount[\s\S]*initialSyncAnalysisFailedCount === 0[\s\S]*mutationRequested[\s\S]*reindexStatus === "REINDEXED"[\s\S]*updatedPreviewIncludesMarker[\s\S]*updateSyncSyncedCount[\s\S]*updateSyncAnalysisRequestedCount[\s\S]*updateSyncAnalysisFailedCount === 0[\s\S]*deleteRequested[\s\S]*stagedDeletedCount[\s\S]*deleteSyncSyncedCount[\s\S]*deletedSearchCleared[\s\S]*nativeWatchStarted[\s\S]*stagedNativeWatchCreatedCount[\s\S]*nativeWatchCreateSyncSyncedCount[\s\S]*nativeWatchInitialSearchMatched[\s\S]*nativeWatchMutationRequested[\s\S]*stagedNativeWatchUpdatedCount[\s\S]*nativeWatchUpdateSyncSyncedCount[\s\S]*nativeWatchUpdatedSearchMatched[\s\S]*nativeWatchDeleteRequested[\s\S]*stagedNativeWatchDeletedCount[\s\S]*nativeWatchDeleteSyncSyncedCount[\s\S]*remainingQaEvents === 0[\s\S]*snapshot\.localSyncProbe\.outbox\?\.widgetSentCount \?\? 0\) >= 1[\s\S]*snapshot\.localSyncProbe\.activity\?\.consentGranted[\s\S]*snapshot\.localSyncProbe\.activity\.nativeCaptured[\s\S]*snapshot\.localSyncProbe\.outbox\?\.activitySentCount \?\? 0\) >= 1[\s\S]*snapshot\.stabilityProbe\?\.enabled[\s\S]*widgetStartupRestoreReady\(snapshot\)[\s\S]*snapshot\.stabilityProbe\.allAutoSyncLoopsRunning[\s\S]*snapshot\.sessionRestoreProbe\?\.enabled[\s\S]*snapshot\.sessionRestoreProbe\.restoredLocalSession[\s\S]*snapshot\.sessionRestoreProbe\.backendMeOk[\s\S]*snapshot\.stopCleanupProbe\?\.enabled[\s\S]*snapshot\.stopCleanupProbe\.activeProjectRoomCleared[\s\S]*snapshot\.stopCleanupProbe\.allExpectedWindowsHidden[\s\S]*snapshot\.stopCleanupProbe\.barWindowHidden[\s\S]*snapshot\.stopCleanupProbe\.syncLoopsStopped/,
  "Manual real OAuth QA script must prove redaction, real TAURI sessions, visible widgets, sync loops, managed-folder watcher status, local SQLite/file/widget/native-activity sync, stability dwell, session restore, and stop cleanup for passed reports.",
);
assertContains(
  realOAuthQaScript,
  /const RAW_RELEASE_MODE[\s\S]*process\.argv\.includes\("--release"\)[\s\S]*const RELEASE_EXE_PATH = join\("src-tauri", "target", "release", "bubli\.exe"\)[\s\S]*const DEFAULT_API_BASE_URL = RELEASE_MODE \? "https:\/\/bubli\.n-e\.kr" : "http:\/\/localhost:8080"[\s\S]*if \(RAW_RELEASE_MODE\) \{[\s\S]*buildReleaseTauri\(qaEnv\)[\s\S]*spawn\(RELEASE_EXE_PATH[\s\S]*function buildReleaseTauri\(qaEnv\)[\s\S]*stopProcessByPath\(RELEASE_EXE_ABSOLUTE_PATH\)[\s\S]*"npm\.cmd run tauri -- build --no-bundle"/,
  "Manual real OAuth QA script must support a QA-instrumented release exe mode without publishing the installer.",
);
assertContains(
  realOAuthQaScript,
  /const INSTALLED_RELEASE_MODE[\s\S]*process\.argv\.includes\("--installed-release"\)[\s\S]*const NSIS_SETUP_PATH = windowsInstallerSourcePath\(\)[\s\S]*const INSTALLED_EXE_PATH = join\([\s\S]*"Bubli"[\s\S]*"bubli\.exe"[\s\S]*if \(INSTALLED_RELEASE_MODE\) \{[\s\S]*buildInstalledReleaseTauri\(qaEnv\)[\s\S]*installReleaseBundle\(qaEnv\)[\s\S]*spawn\(INSTALLED_EXE_PATH[\s\S]*function buildInstalledReleaseTauri\(qaEnv\)[\s\S]*"npm\.cmd run tauri -- build"[\s\S]*function installReleaseBundle\(qaEnv\)[\s\S]*spawnSync\(NSIS_SETUP_PATH, \["\/S"\][\s\S]*function windowsInstallerSourcePath\(\)[\s\S]*\$\{productName\}_\$\{version\}_x64-setup\.exe/,
  "Manual real OAuth QA script must support a QA-instrumented installed-release mode that proves the NSIS-installed app.",
);
assertContains(
  realOAuthQaScript,
  /const PUBLIC_INSTALLER_PATH = join\("public", "downloads", "windows", "Bubli-Windows-latest\.exe"\)[\s\S]*const PUBLIC_MANIFEST_PATH = join\("public", "downloads", "windows", "manifest\.json"\)[\s\S]*const installedReleaseArtifactSnapshot = INSTALLED_RELEASE_MODE \? createInstalledReleaseArtifactSnapshot\(\) : null[\s\S]*restoreInstalledReleaseArtifacts\(installedReleaseArtifactSnapshot\)[\s\S]*function restoreInstalledReleaseArtifacts\(snapshot\)[\s\S]*copyFileSync\(snapshot\.installerPath, PUBLIC_INSTALLER_PATH\)[\s\S]*copyFileSync\(snapshot\.manifestPath, PUBLIC_MANIFEST_PATH\)[\s\S]*copyFileSync\(snapshot\.installerPath, NSIS_SETUP_PATH\)[\s\S]*reinstallPublicReleaseBundle\(snapshot\.installerPath\)/,
  "Manual real OAuth installed-release QA must restore public installer artifacts and reinstall the clean public app after QA instrumentation.",
);
assertContains(
  realOAuthQaScript,
  /function stopProcessByPath\(executablePath\)[\s\S]*GetFullPath\(\$env:BUBLI_QA_RELEASE_EXE_PATH\);[\s\S]*Get-CimInstance Win32_Process[\s\S]*ExecutablePath -eq \$target[\s\S]*Stop-Process[\s\S]*BUBLI_QA_RELEASE_EXE_PATH: executablePath/,
  "Manual real OAuth QA release builds must stop only the target QA executable before rebuilding or installing.",
);
assertContains(
  realOAuthQaScript,
  /CARGO_BUILD_JOBS: process\.env\.CARGO_BUILD_JOBS \?\? "1"[\s\S]*CARGO_PROFILE_RELEASE_CODEGEN_UNITS: process\.env\.CARGO_PROFILE_RELEASE_CODEGEN_UNITS \?\? "16"[\s\S]*CARGO_PROFILE_RELEASE_OPT_LEVEL: process\.env\.CARGO_PROFILE_RELEASE_OPT_LEVEL \?\? "3"[\s\S]*CARGO_PROFILE_RELEASE_STRIP: process\.env\.CARGO_PROFILE_RELEASE_STRIP \?\? "symbols"/,
  "Manual real OAuth QA release builds must use memory-safe Cargo defaults unless the caller overrides them.",
);
assertContains(
  realOAuthQaScript,
  /function writeReport\(report\)[\s\S]*const reportPath = join\(directory, `tauri-real-oauth-qa-\$\{timestamp\}\.json`\)[\s\S]*const summaryPath = join\(directory, `tauri-real-oauth-qa-\$\{timestamp\}\.md`\)[\s\S]*writeFileSync\(reportPath, JSON\.stringify\(report, null, 2\)\)[\s\S]*writeFileSync\(summaryPath, renderEvidenceSummary\(report, reportPath\)\)[\s\S]*return \{ reportPath, summaryPath \}/,
  "Manual real OAuth QA script must persist both the redacted JSON report and a markdown evidence summary.",
);
assertContains(
  realOAuthQaScript,
  /function renderEvidenceSummary\(report, reportPath\)[\s\S]*Redacted Proof[\s\S]*Real TAURI local session[\s\S]*Backend \/api\/me[\s\S]*Widget startup restore ready[\s\S]*Local file scan\/read initial sync[\s\S]*Local file update\/reindex sync[\s\S]*Local file delete sync\/search clear[\s\S]*Native watcher create\/update\/delete sync[\s\S]*Stability dwell ms[\s\S]*Session restored from Tauri mirror[\s\S]*Stop cleanup closed widgets and loops[\s\S]*Raw tokens, session JSON, user IDs, email, and Google subject are intentionally excluded/,
  "Manual real OAuth QA evidence summary must stay redacted and list the core auth, backend, widget, stability, restore, and cleanup proofs.",
);
assertContains(
  realOAuthQaScript,
  /function renderEvidenceSummary\(report, reportPath\)[\s\S]*Launch Readiness Timing[\s\S]*Auth validation to auth gate enabled ms[\s\S]*Auth validation to widget bar visible ms[\s\S]*Auth validation to bubble restore items seeded ms[\s\S]*Auth validation to sync loops started ms[\s\S]*Launch start to completed ms[\s\S]*These timings are measured inside the QA-instrumented installed Tauri session/,
  "Manual real OAuth QA evidence summary must include launch-readiness timing derived from installed Tauri timeline anchors.",
);
assertContains(
  realOAuthQaScript,
  /function launchReadinessTimings\(snapshot\)[\s\S]*authValidationToAuthGateMs[\s\S]*backendAuthValidatedAt[\s\S]*authGateEnabledAt[\s\S]*authValidationToBarMs[\s\S]*barWindowOpenedAt[\s\S]*authValidationToBubblesMs[\s\S]*bubbleWindowsOpenedAt[\s\S]*authValidationToSyncLoopsMs[\s\S]*syncLoopsStartedAt[\s\S]*launchStartedToCompletedMs[\s\S]*launchCompletedAt/,
  "Manual real OAuth QA script must derive installed-launch readiness timing from authenticated-surface timeline anchors.",
);
const realOAuthWidgetQaRequiredPatterns = [
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_QA === "true"/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_FOLDER/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_MUTATE_URL/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_DELETE_URL/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_PREPARE_URL/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_CREATE_URL/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_DELETE_URL/,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_LOCAL_SYNC_WATCH_MUTATE_URL/,
  /selectManagedFolder\(\{ path: fixturePath \}\)/,
  /setFolderSync\(\{ enabled: true/,
  /scanManagedFolder/,
  /readLocalFilePreview/,
  /reindexFile/,
  /searchLocalFilesUntilMissing/,
  /watchManagedFolder/,
  /nativeWatchStarted/,
  /nativeWatchCreateSyncSyncedCount/,
  /nativeWatchUpdateSyncSyncedCount/,
  /nativeWatchDeleteSyncSyncedCount/,
  /removeManagedFolder\(\{ localFolderId \}\)/,
  /setActivityContextConsent/,
  /readActivityContext/,
  /recordActivityContext\(\{/,
  /recordWidgetUsageEvent\(/,
  /syncAllLocalOutboxToServer\(\{/,
  /failedCountScope: "current-sync-attempt"/,
  /pendingCountScope: "global-sqlite-backlog"/,
  /localSyncProbe:sqliteQuickCheck/,
  /localSyncProbe:localFileInitialPreviewMarker/,
  /localSyncProbe:localFileUpdatedPreviewMarker/,
  /localSyncProbe:localFileDeletedSynced/,
  /localSyncProbe:nativeWatchStarted/,
  /localSyncProbe:nativeWatchDeletedSynced/,
  /localSyncProbe:activityNativeCaptured/,
  /localSyncProbe:activityReachedBackend/,
];
for (const pattern of realOAuthWidgetQaRequiredPatterns) {
  assertContains(
    authWidgetQa,
    pattern,
    "Real OAuth widget QA must include an opt-in local SQLite, managed-folder scan/read/reindex/sync, widget outbox, and native activity outbox sync probe.",
  );
}
assertContains(
  authWidgetQa,
  /const REAL_OAUTH_LOCAL_SYNC_FOLDER_MARKER = "bubli-real-oauth-local-sync-"[\s\S]*async function cleanupStaleRealOAuthQaManagedFolders\(currentFixturePath: string\)[\s\S]*tauriCommands\.listManagedFolders\(\)[\s\S]*folderPath\.includes\(REAL_OAUTH_LOCAL_SYNC_FOLDER_MARKER\)[\s\S]*tauriCommands\.removeManagedFolder\(\{ localFolderId: folder\.localFolderId \}\)[\s\S]*cleanupStaleRealOAuthQaManagedFolders\(fixturePath\)[\s\S]*staleQaFolderRemovedCount/,
  "Real OAuth widget QA must remove stale temporary QA managed folders before selecting the current fixture.",
);
assertContains(
  authWidgetQa,
  /realOAuthQaOriginalPrivacyConsents[\s\S]*enableRealOAuthQaPrivacyConsents\(\)[\s\S]*settingsApi\.updatePrivacyConsents\(\{[\s\S]*activityDetectionEnabled: true[\s\S]*localFolderEnabled: true[\s\S]*restoreRealOAuthQaPrivacyConsents\(\)[\s\S]*settingsApi\.updatePrivacyConsents\(realOAuthQaOriginalPrivacyConsents\)[\s\S]*restoreRealOAuthQaPrivacyConsents\(\)\.catch\(\(\) => undefined\)/,
  "Real OAuth widget QA must restore the real account's privacy consent settings after temporary local-sync/activity probes.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STABILITY_QA_MS[\s\S]*waitForMs\(dwellMs\)[\s\S]*readWidgetRuntimeState\(selectedRoomId, serverSelectedRoomId\)[\s\S]*widgetApi\.getSummary\(selectedRoomId\)[\s\S]*stabilityProbe:startupRestoreReady[\s\S]*stabilityProbe:syncLoopsStillRunning[\s\S]*stabilityProbe:backendWidgetSummary/,
  "Real OAuth widget QA must include an opt-in stability dwell probe that re-checks widgets, room context, sync loops, and backend widget summary.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_SESSION_RESTORE_QA === "true"[\s\S]*probeStoredAuthSessionRestoreFromTauriMirrorForQa\(\)[\s\S]*authApi\.getMe\(\)[\s\S]*sessionRestoreProbe:restoredLocalSession[\s\S]*sessionRestoreProbe:restoredTauriClient[\s\S]*sessionRestoreProbe:backendMeAfterRestore/,
  "Real OAuth widget QA must include an opt-in Tauri mirror session restore probe that proves backend auth after localStorage restart recovery.",
);
assertContains(
  authSession,
  /probeStoredAuthSessionRestoreFromTauriMirrorForQa[\s\S]*const originalSession = originalRawSession \? parseStoredAuthSession\(originalRawSession\) : null[\s\S]*finally \{[\s\S]*setStoredAuthSessionAndWaitForTauriMirror\(originalSession\)/,
  "Tauri session restore QA must restore the original local session and Tauri mirror after the destructive localStorage probe.",
);
assertContains(
  authWidgetQa,
  /NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_STOP_CLEANUP_QA === "true"[\s\S]*stopTauriAuthenticatedSurfaces\(\)[\s\S]*waitForRealOAuthAutoSyncLoopsStopped\(\)[\s\S]*readActiveProjectRoom\(\)[\s\S]*allExpectedWindowsHidden[\s\S]*barWindowHidden[\s\S]*syncLoopsStopped[\s\S]*readTauriAuthWidgetQaSnapshot\(\{ runStopCleanupProbe: false \}\)[\s\S]*failedChecks\.length === 0 && shouldRunRealOAuthStopCleanupProbe\(\)[\s\S]*runRealOAuthStopCleanupProbe\(\)[\s\S]*stopCleanupProbe:activeProjectRoomCleared[\s\S]*stopCleanupProbe:allExpectedWindowsHidden[\s\S]*stopCleanupProbe:syncLoopsStopped/,
  "Real OAuth widget QA must run the destructive stop cleanup probe only after non-destructive readiness checks pass.",
);
assertContains(
  authWidgetQa,
  /getManagedFolderAutoSyncStatus[\s\S]*managedFolderStatus: ManagedFolderAutoSyncStatus[\s\S]*sync:managedFolderStatusMatchesRunningFlag[\s\S]*sync:managedFolderStatusHealthy[\s\S]*managedFolderStatus,/,
  "Real OAuth widget QA must include managed-folder watcher status diagnostics in the redacted snapshot.",
);
assertContains(
  authWidgetQa,
  /function realOAuthAutoSyncLoopsRunning\(\)[\s\S]*function realOAuthAutoSyncLoopsStopped\(\)[\s\S]*async function waitForRealOAuthAutoSyncLoopsStopped[\s\S]*async function ensureTauriAuthenticatedSurfacesForQa\(localSession: AuthSessionDiagnostics\)[\s\S]*launchTauriAuthenticatedSurfaces\(\{ retryPolicy: "force", sessionAlreadyValidated: true \}\)[\s\S]*await waitForRealOAuthAutoSyncLoops\(\)[\s\S]*options\.ensureAuthenticatedSurfaces !== false[\s\S]*await ensureTauriAuthenticatedSurfacesForQa\(localSession\)/,
  "Real OAuth widget QA must force relaunch authenticated surfaces when needed while allowing stop-cleanup checks to verify the stopped state.",
);
assertContains(
  authWidgetQa,
  /let localSession = getStoredAuthSessionDiagnostics\(\)[\s\S]*let tauriMirrorSession = await readTauriAuthSessionDiagnostics\(\)[\s\S]*await ensureTauriAuthenticatedSurfacesForQa\(localSession\)[\s\S]*localSession = getStoredAuthSessionDiagnostics\(\)[\s\S]*tauriMirrorSession = await readTauriAuthSessionDiagnostics\(\)[\s\S]*const hasAuthSession = localSession\.hasSession \|\| tauriMirrorSession\.hasSession[\s\S]*hasAuthSession[\s\S]*runRealOAuthLocalSyncProbe[\s\S]*: \{ enabled: false \}[\s\S]*hasAuthSession[\s\S]*runRealOAuthStabilityProbe[\s\S]*: \{ enabled: false \}/,
  "Real OAuth widget QA must reread restored Tauri sessions and skip expensive probes while no auth session exists.",
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
  devWidgetRealBackend,
  /Tauri widget real API smoke task[\s\S]*timestamp with time zone '2000-01-01 00:00:00\+00'[\s\S]*Confirm backend summary rendering[\s\S]*timestamp with time zone '2000-01-01 00:05:00\+00'/,
  "Windows real-backend smoke seed tasks must stay inside the backend room summary limit even when demo tasks already exist.",
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
  tauriRuntimeGates,
  /<TauriPostLoginLauncher\s*\/>/,
  "TauriRuntimeGates must mount TauriPostLoginLauncher so hybrid app login can start native widgets.",
);
assertContains(
  tauriRuntimeGates,
  /<TauriDevtoolsGuard\s*\/>/,
  "TauriRuntimeGates must mount TauriDevtoolsGuard for hybrid/widget devtools hardening.",
);
assertContains(
  tauriConf,
  /"devtools":\s*false/,
  "The main Tauri hybrid app window must keep devtools disabled in tauri.conf.json.",
);
assertContains(
  tauriMain,
  /#!\[cfg_attr\(not\(debug_assertions\), windows_subsystem = "windows"\)\]/,
  "Windows release executables must use the GUI subsystem so users never see a console window.",
);
assertContains(
  tauriMain,
  /#\[cfg\(windows\)\][\s\S]*fn windows_single_instance_guard\(\) -> Option<WindowsSingleInstanceGuard>[\s\S]*CreateMutexW[\s\S]*Local\\{2}BubliDesktopSingleInstance[\s\S]*ERROR_ALREADY_EXISTS[\s\S]*return None/,
  "Windows Tauri entrypoint must hold a named mutex and exit duplicate launches before a second widget window set can be created.",
);
assertContains(
  tauriConf,
  /"beforeBuildCommand":\s*"npm run build && node scripts\/prepare-tauri-dist\.mjs"[\s\S]*"frontendDist":\s*"\.\.\/\.tauri-dist"/,
  "Tauri release builds must package the prepared .tauri-dist directory instead of raw .next server output.",
);
assertContains(
  tauriMacosConf,
  /"beforeBuildCommand":\s*"npm run build && node scripts\/prepare-tauri-dist\.mjs"[\s\S]*"frontendDist":\s*"\.\.\/\.tauri-dist"/,
  "macOS Tauri release builds must use the optimized .tauri-dist directory instead of the legacy dist-tauri installer mirror.",
);
assertContains(
  tauriConf,
  /"url":\s*"\/app\/"/,
  "The packaged hybrid app window must open /app/ so the release asset protocol resolves app/index.html.",
);
assertContains(
  tauriConf,
  /"icon":\s*\[[\s\S]*"icons\/icon\.png"[\s\S]*"icons\/icon\.ico"[\s\S]*\]/,
  "Tauri Windows bundles must use the Bubli app PNG and ICO assets for the downloaded executable icon.",
);
assertContains(
  tauriConf,
  /"windows":\s*\{[\s\S]*"nsis":\s*\{[\s\S]*"installerIcon":\s*"icons\/icon\.ico"[\s\S]*"uninstallerIcon":\s*"icons\/icon\.ico"[\s\S]*"headerImage":\s*"icons\/installer-header\.bmp"[\s\S]*"sidebarImage":\s*"icons\/installer-sidebar\.bmp"[\s\S]*"uninstallerHeaderImage":\s*"icons\/installer-header\.bmp"/,
  "Tauri NSIS bundles must explicitly use Bubli installer icons and branded setup UI bitmaps.",
);
if (!tauriIconPng.equals(brandAppIconPng)) {
  throw new Error("src-tauri/icons/icon.png must match public/brand/icon-app-512.png so Windows builds use the Bubli app logo.");
}
{
  const requiredIcoSizes = ["16x16", "24x24", "32x32", "48x48", "64x64", "128x128", "256x256"];
  const icoSizes = readIcoSizes(tauriIconIco);
  for (const requiredSize of requiredIcoSizes) {
    if (!icoSizes.includes(requiredSize)) {
      throw new Error(`src-tauri/icons/icon.ico must include ${requiredSize} for Windows explorer/download surfaces.`);
    }
  }
}
{
  const headerSize = readBmpSize(tauriInstallerHeaderBmp);
  if (headerSize.width !== 150 || headerSize.height !== 57) {
    throw new Error("src-tauri/icons/installer-header.bmp must be the NSIS-recommended 150x57 bitmap.");
  }

  const sidebarSize = readBmpSize(tauriInstallerSidebarBmp);
  if (sidebarSize.width !== 164 || sidebarSize.height !== 314) {
    throw new Error("src-tauri/icons/installer-sidebar.bmp must be the NSIS-recommended 164x314 bitmap.");
  }
}
assertContains(
  prepareTauriDist,
  /SERVER_APP_DIR[\s\S]*routeHtmlDestination[\s\S]*copyRequiredFile\(source, join\(TAURI_DIST_DIR, routeHtmlDestination\(relativePath\)\)\)[\s\S]*copyIfExists\(join\(NEXT_DIR, "static"\), join\(TAURI_DIST_DIR, "_next", "static"\)\)/,
  "prepare-tauri-dist must expand Next static route HTML into /route/index.html and copy _next/static for packaged Tauri release windows.",
);
assertContains(
  prepareTauriDist,
  /function shouldSkipPublicFile\(relativePath, file\)[\s\S]*normalizedPath === "downloads"[\s\S]*normalizedPath\.startsWith\("downloads\/"\)[\s\S]*if \(shouldSkipPublicFile\(relativePath, source\)\) continue;/,
  "prepare-tauri-dist must exclude public/downloads so Windows installers are not recursively bundled inside the app.",
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
  tauriLib,
  /fn close_widget_window[\s\S]*widget\.mode = "DEFAULT"\.to_string\(\);[\s\S]*widget\.dock_orb_visible = false;[\s\S]*widget\.window_visible = false;[\s\S]*emit_widget_bar_items_changed\(&app\);/,
  "Desktop widget close must remove the bubble from restore bar items while keeping runtime state persisted.",
);
assertNotContains(
  tauriLib,
  /fn close_widget_window[\s\S]*widget\.mode = "MINIMIZED"\.to_string\(\);/,
  "Desktop widget close must not convert closed bubbles into minimized restore-bar items.",
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
  tauriRuntimeGates,
  /const runtimeSmokeEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";[\s\S]*import\("@\/lib\/tauri\/tauri-runtime-smoke-runner"\)[\s\S]*runtimeSmokeEnabled \? <TauriRuntimeSmokeRunner \/> : null/,
  "TauriRuntimeGates must lazy-load TauriRuntimeSmokeRunner only for explicit development runtime smoke.",
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
  /import \{ isTauriRuntime \} from "@\/lib\/tauri\/is-tauri";/,
  "Desktop onboarding overlay must gate on the Tauri runtime (any desktop OS); the translucent scrim no longer covers Windows widget windows opaquely.",
);
assertContains(
  firstRunController,
  /const openWidgetTutorial = useCallback\(\(\) => \{[\s\S]*if \(isTauriRuntime\(\)\) \{[\s\S]*tauriCommands\.openOnboardingOverlay\(\)[\s\S]*\}[\s\S]*setPhase\("widget"\);/,
  "First-run onboarding must open the native full-monitor overlay only inside the Tauri runtime guard; non-Tauri web must fall back to the in-app widget tutorial.",
);
assertContains(
  firstRunController,
  /if \(phase === "widget"\) \{[\s\S]*<WidgetTutorial/,
  "Web (non-Tauri) must still render the in-app WidgetTutorial modal instead of the desktop onboarding overlay window.",
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
  /setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\)[\s\S]*openWidgetWindows\(\{[\s\S]*bubbleType: "bar"[\s\S]*\.\.\.smokeWidgetBubbles\.map[\s\S]*native bar and all bubble widget windows can be opened explicitly[\s\S]*setWidgetRoomContext\(\{ selectedRoomId: smokeRoomId \}\)[\s\S]*Promise\.all\([\s\S]*getWidgetWindowState\(\{ bubbleType, windowId: bubbleType \}\)[\s\S]*all bubble widget windows visible[\s\S]*project room context propagated to all bubble widgets/,
  "TauriRuntimeSmokeRunner must verify post-login native bar plus all bubble widget windows and room context propagation.",
);
assertContains(
  tauriLib,
  /fn snapshot_widget_window_store\(state: &WidgetState\) -> Result<WidgetWindowStore, String>[\s\S]*fn restore_widget_window_store\([\s\S]*persist_widget_window_state\(app, state\)[\s\S]*fn rollback_open_widget_windows_failure\([\s\S]*restore_widget_window_store\(app, state, snapshot\.clone\(\)\)[\s\S]*apply_widget_window_state\(app, monitor_state, &restored_widget\)[\s\S]*window\.destroy\(\)/,
  "Native batched widget open must restore persisted widget state and clean up touched windows when a partial open fails.",
);
assertContains(
  tauriLib,
  /async fn open_widget_windows\([\s\S]*let snapshot = snapshot_widget_window_store\(&state\)\?;[\s\S]*prepare_open_widget_window\(&app, &state, window\)\.map_err\(\|error\| \{[\s\S]*rollback_open_widget_windows_failure\([\s\S]*persist_widget_window_state\(&app, &state\)\.map_err\(\|error\| \{[\s\S]*rollback_open_widget_windows_failure\([\s\S]*for widget in &widgets \{[\s\S]*schedule_widget_window_build_and_raise\(&app, &monitor_state, widget\)\.map_err\([\s\S]*\|error\| \{[\s\S]*rollback_open_widget_windows_failure\([\s\S]*refresh_widget_bar_window\(&app, &monitor_state, &state\)\.map_err\(\|error\| \{/,
  "open_widget_windows must route prepare, persist, build, and bar refresh failures through native batch rollback.",
);
assertContains(
  runtimeSmokeRunner,
  /setWidgetWindowPosition\(\{[\s\S]*all bubble widget positions persisted with project room context[\s\S]*setWidgetWindowMode\(\{[\s\S]*mode: "MINIMIZED"[\s\S]*all bubble widget windows minimized without losing project room context[\s\S]*getWidgetWindowState\(\{ bubbleType: "bar", windowId: "bar" \}\)[\s\S]*widget bar remains visible after all bubble widgets are minimized[\s\S]*getWidgetBarItems\(\)[\s\S]*all minimized bubble widgets appear as bar restore items[\s\S]*openWidgetWindows\(\{[\s\S]*mode: "DEFAULT" as const[\s\S]*all minimized bubble widget windows restore with position and project room context/,
  "TauriRuntimeSmokeRunner must verify all eight bubble widgets preserve position while minimizing to the bar and restoring with project-room context.",
);
assertContains(
  tauriLib,
  /fn widget_bar_items_from_store\(store: &WidgetWindowStore\)[\s\S]*widget\.active_bubble != "bar" && widget\.mode == "MINIMIZED" && !widget\.window_visible/,
  "Native widget bar items must include every minimized bubble, including resource, while excluding only the bar window.",
);
assertNotContains(
  tauriLib,
  /widget\.active_bubble != "resource"/,
  "Native widget bar items must not exclude the resource bubble from restore chips.",
);
assertContains(
  widgetBubble,
  /const hiddenDesktopWidgetBubbleTypes = new Set<WidgetBubbleType>\(\[\s*"resource"\s*\]\);/,
  "Desktop widget UI must hide the standalone resource/draft bubble because generated drafts live inside the agent widget.",
);
assertContains(
  widgetPage,
  /const setWindowMode = useCallback[\s\S]*const previousMode = mode;[\s\S]*const previousClickThrough = clickThrough;[\s\S]*const previousWindowVisible = windowVisible;[\s\S]*setWidgetWindowMode\(\{[\s\S]*mode: nextMode[\s\S]*selectedRoomId: selectedWidgetRoomId[\s\S]*eventType: `mode:\$\{state\.mode\}`[\s\S]*catch \{[\s\S]*setMode\(previousMode\);[\s\S]*setClickThrough\(previousClickThrough\);[\s\S]*setWindowVisible\(previousWindowVisible\);/,
  "Desktop widget mode control must persist MINIMIZED mode and roll back optimistic UI when native mode changes fail.",
);
assertContains(
  widgetPage,
  /const restoreCurrentWindow = useCallback[\s\S]*const previousMode = mode;[\s\S]*const previousClickThrough = clickThrough;[\s\S]*const previousWindowVisible = windowVisible;[\s\S]*openWidgetWindow\(\{[\s\S]*mode: "DEFAULT"[\s\S]*selectedRoomId: selectedWidgetRoomId[\s\S]*eventType: "open"[\s\S]*catch \{[\s\S]*setMode\(previousMode\);[\s\S]*setClickThrough\(previousClickThrough\);[\s\S]*setWindowVisible\(previousWindowVisible\);/,
  "Desktop widget restore control must roll back optimistic visible/default state when native restore fails.",
);
assertContains(
  widgetPage,
  /const closeWindow = useCallback[\s\S]*const previousWindowVisible = windowVisible;[\s\S]*closeWidgetWindow\(\{[\s\S]*bubbleType: activeBubble[\s\S]*windowId[\s\S]*eventType: "close"[\s\S]*catch \{[\s\S]*setWindowVisible\(previousWindowVisible\);/,
  "Desktop widget close control must fully close the bubble and roll back optimistic hidden state when native close fails.",
);
assertContains(
  runtimeSmokeRunner,
  /function runtimeSmokeWidgetPosition[\s\S]*async function verifyWidgetRestartLayout[\s\S]*widget layout restored positions and room context after app restart[\s\S]*openWidgetWindows\(\{[\s\S]*selectedRoomId: smokeRoomId[\s\S]*widget layout rebuilt native windows after app restart[\s\S]*async function persistWidgetRestartLayoutCheckpoint[\s\S]*widget restart layout checkpoint persisted before app restart[\s\S]*smokePhase === "restore-verify"[\s\S]*await verifyWidgetRestartLayout\(assert\)[\s\S]*await tauriCommands\.closeAllWidgetWindows\(\)\.catch/,
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
  tauriWidgetUsage,
  /lower\(event_type\) LIKE 'open%' AND lower\(event_type\) != 'open:auto-login'[\s\S]*lower\(event_type\) LIKE 'open%' THEN 0[\s\S]*\('event-2', 'todo', 'open:auto-login'[\s\S]*assert_eq!\(open_count, 1\)/,
  "Widget usage openCount must exclude automatic login restores so repeated app launches do not look like manual widget opens.",
);
assertContains(
  runtimeSmokeRunner,
  /selectManagedFolder\(\{ path: smokeFolderPath \}\)[\s\S]*scanManagedFolder[\s\S]*searchLocalFiles[\s\S]*readLocalFilePreview[\s\S]*stageLocalFileEventsForSync[\s\S]*local file event sync marked SQLite rows as SYNCED[\s\S]*triggerIndexedFileMutation\(\)[\s\S]*reindexFile\(\{ localFileId: noteFile\.localFileId \}\)[\s\S]*local file reindex refreshed SQLite FTS search[\s\S]*local file reindex refreshed readable preview[\s\S]*local file reindex staged update event with backend resource[\s\S]*local file reindex update event synced to backend[\s\S]*watchManagedFolder[\s\S]*triggerManagedFolderMutation[\s\S]*managed folder watcher staged update and delete events/,
  "TauriRuntimeSmokeRunner must verify managed-folder scan/search/preview, manual reindex refresh, event staging, and live watcher update/delete events against a temp folder.",
);
assertContains(
  runtimeSmokeRunner,
  /const runtimeSmokeFolderMarker = "bubli-tauri-runtime-smoke-"[\s\S]*cleanupStaleRuntimeSmokeManagedFolders\(smokeFolderPath\)[\s\S]*runtimeSmokeManagedFolderId = folder\.localFolderId[\s\S]*cleanupRuntimeSmokeManagedFolder\(runtimeSmokeManagedFolderId\)[\s\S]*runtime smoke managed folder removed after Windows QA[\s\S]*cleanupStaleRuntimeSmokeManagedFolders\(currentSmokeFolderPath: string\)[\s\S]*folder\.path\.includes\(runtimeSmokeFolderMarker\)[\s\S]*tauriCommands\.removeManagedFolder\(\{ localFolderId: folder\.localFolderId \}\)/,
  "TauriRuntimeSmokeRunner must remove runtime-smoke managed folders so Windows QA does not leave temp folders ACTIVE in local SQLite.",
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
  /const shouldFlush =[\s\S]*Boolean\(input\?\.flush\)[\s\S]*captureIntervalId = null;[\s\S]*if \(shouldFlush\) \{[\s\S]*await flushActivityAutoCapture\(\);[\s\S]*updateActivityAutoCaptureStatus\(\{ lastStatus: "stopped", running: false \}\);[\s\S]*await mirrorNativeActivityConsent\(false\);/,
  "stopActivityAutoCapture must leave status stopped after flush so local-auto-sync smoke does not see a stale running state.",
);
assertContains(
  activityClient,
  /let activityRecordInFlight = false;[\s\S]*export async function recordCurrentActivityContext[\s\S]*if \(activityRecordInFlight\) \{[\s\S]*activity_no_new_duration[\s\S]*activityRecordInFlight = true;[\s\S]*const recordLock = await tryAcquireActivityRecordLock\(\);[\s\S]*if \(!recordLock\) \{[\s\S]*activityRecordInFlight = false;[\s\S]*releaseActivityRecordLock\(recordLock\);[\s\S]*activityRecordInFlight = false;/,
  "Activity recording must use a shared in-process guard plus the SQLite-backed record lock so manual, flush, and auto capture cannot create duplicate segments.",
);
assertContains(
  activityClient,
  /async function tryAcquireActivityRecordLock\(\)[\s\S]*readActivityRecordLockValue\(\)[\s\S]*writeActivityRecordLockValue\(value\)[\s\S]*const confirmed = await readActivityRecordLockValue\(\)[\s\S]*confirmed !== value[\s\S]*function releaseActivityRecordLock\(lock: string\)[\s\S]*writeActivityRecordLockValue\(null\)/,
  "Activity record lock must keep compare-after-write SQLite semantics across Tauri webviews.",
);
assertContains(
  managedFolderAutoSync,
  /export type ManagedFolderAutoSyncStatus[\s\S]*lastFileEventFailedCount\?: number;[\s\S]*lastStartupScanFailedCount\?: number;[\s\S]*lastSyncedFolderId[\s\S]*lastWatchEventFolderId[\s\S]*lastWatchedCount[\s\S]*pendingFolderCount[\s\S]*export function getManagedFolderAutoSyncStatus\(\)[\s\S]*updateManagedFolderAutoSyncStatus/,
  "Managed folder auto-sync must expose a non-UI status snapshot for runtime QA.",
);
assertContains(
  managedFolderAutoSync,
  /watchAllManagedFolders\(\)\.catch\(\(\) => null\)[\s\S]*lastSkippedCount: watchResult\.skippedCount[\s\S]*lastWatchedCount: watchResult\.watchedCount/,
  "Managed folder auto-sync status must retain native watchAllManagedFolders results.",
);
assertContains(
  managedFolderAutoSync,
  /let stopRequested = false;[\s\S]*export function startManagedFolderAutoSync\(\)[\s\S]*stopRequested = false;[\s\S]*export async function stopManagedFolderAutoSync[\s\S]*stopRequested = true;[\s\S]*window\.clearInterval\(syncIntervalId\);[\s\S]*clearPendingWatchEventSyncs\(\);[\s\S]*detachManagedFolderWatchListener\(\);[\s\S]*await tauriCommands\.unwatchAllManagedFolders\(\)[\s\S]*if \(input\?\.flush\) \{[\s\S]*await flushManagedFolderAutoSync\(\);/,
  "stopManagedFolderAutoSync must stop intervals and native watchers before flushing so shutdown cannot re-arm watcher sync.",
);
assertContains(
  managedFolderAutoSync,
  /if \(!stopRequested && \(pendingFullSyncRequested \|\| pendingFolderSyncIds\.size > 0\)\) \{[\s\S]*await syncManagedFolderEventsOnce\(\);[\s\S]*if \(!stopRequested\) \{[\s\S]*attachManagedFolderWatchListener\(\);[\s\S]*watchAllManagedFolders\(\)/,
  "Managed folder auto-sync must not recursively restart sync or reattach native watchers while stop is in progress.",
);
assertContains(
  managedFolderAutoSync,
  /if \(!startupScanHasRun\) \{[\s\S]*const startupScanFailedCount = await scanSyncEnabledManagedFoldersOnce\(consentGranted\);[\s\S]*startupScanHasRun = startupScanFailedCount === 0;[\s\S]*lastStartupScanFailedCount: startupScanFailedCount[\s\S]*async function scanSyncEnabledManagedFoldersOnce\(consentGranted: boolean\)[\s\S]*if \(folders\.status !== "ready"\) return 1;[\s\S]*let failedCount = 0;[\s\S]*if \(!result \|\| result\.status !== "ready"\) \{[\s\S]*failedCount \+= 1;[\s\S]*return failedCount;/,
  "Managed folder startup scan must stay retryable when folder listing or scan fails.",
);
assertContains(
  managedFolderAutoSync,
  /type ManagedFolderDrainSummary = \{[\s\S]*errorMessage\?: string;[\s\S]*failedCount: number;[\s\S]*function managedFolderDrainStatus\(drained: ManagedFolderDrainSummary\)[\s\S]*drained\.failedCount > 0 \? "failed" : "synced"[\s\S]*lastFileEventFailedCount: drained\.failedCount[\s\S]*lastErrorMessage: drained\.errorMessage[\s\S]*lastStatus: managedFolderDrainStatus\(drained\)[\s\S]*lastSuccessAt: drained\.failedCount > 0 \? undefined : new Date\(\)\.toISOString\(\)/,
  "Managed folder auto-sync must surface backend/auth local-file sync failures as failed instead of synced.",
);
assertContains(
  managedFolderAutoSync,
  /if \(result\.status !== "ready"\) \{[\s\S]*summary\.failedCount \+= 1;[\s\S]*summary\.errorMessage = result\.message;[\s\S]*return summary;[\s\S]*summary\.failedCount \+= result\.data\.failedCount;/,
  "Managed folder drain must carry failed local-file sync attempts into status reporting.",
);
assertContains(
  runtimeSmokeRunner,
  /launchTauriAuthenticatedSurfaces\(\)[\s\S]*post-login launcher opened only the bar and menu by default[\s\S]*post-login launcher kept bubble widgets hidden by default[\s\S]*post-login launcher seeded bubble restore items without opening them[\s\S]*isActivityAutoCaptureRunning\(\)[\s\S]*isManagedFolderAutoSyncRunning\(\)[\s\S]*isWidgetUsageAutoSyncRunning\(\)[\s\S]*post-login launcher started activity folder and widget sync loops[\s\S]*stopTauriAuthenticatedSurfaces\(\)[\s\S]*post-login stop cleared active project room context[\s\S]*post-login stop closed all bubble widget windows[\s\S]*post-login stop stopped activity folder and widget sync loops/,
  "TauriRuntimeSmokeRunner must prove the real post-login authenticated launcher opens bar/menu, seeds restore items, starts sync loops, and stops both widgets and loops.",
);
assertContains(
  runtimeSmokeRunner,
  /closeWidgetWindow\(\{ bubbleType: "chat", windowId: "chat" \}\)[\s\S]*post-login relaunch setup closed one bubble widget[\s\S]*getWidgetBarItems\(\)[\s\S]*closed chat widget is removed from the bar restore items[\s\S]*openWidgetWindow\(\{[\s\S]*bubbleType: "chat"[\s\S]*closed chat widget reopened with project room context/,
  "TauriRuntimeSmokeRunner must prove close removes the bar restore item while reopening keeps project room context.",
);
assertContains(
  runtimeSmokeRunner,
  /const authWidgetQaSnapshot = await readTauriAuthWidgetQaSnapshot\(\);[\s\S]*post-login QA snapshot confirmed Tauri auth session without raw tokens[\s\S]*post-login QA snapshot confirmed real backend auth and widget APIs[\s\S]*post-login QA snapshot confirmed project room context across memory Tauri and backend[\s\S]*barWindow\?\.windowVisible[\s\S]*windows\.chat\?\.windowVisible[\s\S]*missingVisibleBubbles\.every[\s\S]*barRestoreItems\.allMatchActiveRoom[\s\S]*post-login QA snapshot confirmed launcher widget room context and restore items[\s\S]*stopTauriAuthenticatedSurfaces\(\)/,
  "TauriRuntimeSmokeRunner must verify the redacted QA snapshot after the post-login launcher opens authenticated widgets.",
);
assertContains(
  runtimeSmokeRunner,
  /verifyLocalAutoSyncLoops[\s\S]*startActivityAutoCapture\(\)[\s\S]*startManagedFolderAutoSync\(\)[\s\S]*getActivityAutoCaptureStatus[\s\S]*local auto-sync activity loop repeated on smoke interval[\s\S]*getManagedFolderAutoSyncStatus[\s\S]*local auto-sync managed folder watcher restored active folders[\s\S]*triggerManagedFolderMutation[\s\S]*lastFileEventSentCount[\s\S]*handledFileEventCount[\s\S]*lastFileAnalysisFailedCount[\s\S]*local auto-sync managed folder events drained through backend sync[\s\S]*stopActivityAutoCapture\(\{ flush: true \}\)[\s\S]*stopManagedFolderAutoSync\(\{ flush: true \}\)/,
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
  /const CONTRACT_ONLY = process\.argv\.includes\("--contract"\)[\s\S]*if \(CONTRACT_ONLY\) \{[\s\S]*const contractChecks = runContractCheck\(\);[\s\S]*checks: contractChecks[\s\S]*mode: "contract"[\s\S]*process\.exit\(0\);[\s\S]*function runContractCheck\(\)[\s\S]*runner verifies post-login bar menu and hidden bubble restore items[\s\S]*runner verifies real backend widget context and settings persistence[\s\S]*runner verifies SQLite backup creation and restore queueing[\s\S]*runner verifies local file scan reindex watch sync and analysis backfill/,
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
  /!pathname\.startsWith\("\/app"\)[\s\S]*async function redirectMissingSessionToLogin\(\)[\s\S]*getStoredAuthSession\(\) \?\? \(await restoreStoredAuthSessionFromTauri\(\)\)[\s\S]*await stopTauriAuthenticatedSurfaces\(\)\.catch\(\(\) => undefined\)[\s\S]*router\.replace\("\/login"\)[\s\S]*window\.location\.replace\("\/login"\)/,
  "TauriPostLoginLauncher must route missing /app sessions to /login before the workspace auth gate can linger.",
);
assertContains(
  appShell,
  /error instanceof ApiClientError && error\.status === 401[\s\S]*setAuthOrDesktopRedirectState\(\)[\s\S]*redirectToLoginWhenTauri\(\)/,
  "AppShell must own Tauri startup 401 handling so the post-login launcher does not duplicate backend auth validation.",
);
assertNotContains(
  launcher,
  /clearStoredAuthSession\(\)/,
  "TauriPostLoginLauncher must not clear the mirrored desktop auth session directly.",
);
assertContains(
  apiClient,
  /type AuthRefreshResult = "invalid" \| "refreshed" \| "unavailable";/,
  "API client refresh result must model transient refresh outages separately from invalid sessions.",
);
assertContains(
  apiClient,
  /refreshed === "unavailable"[\s\S]*throw new Error\("Auth refresh is temporarily unavailable\."\)/,
  "API client must distinguish transient auth-refresh outages from invalid sessions so Tauri does not log out on network jitter.",
);
assertContains(
  apiClient,
  /function isRefreshTokenRejected[\s\S]*AUTH_REFRESH_TOKEN_EXPIRED[\s\S]*AUTH_REFRESH_TOKEN_REUSED[\s\S]*AUTH_INVALID_TOKEN[\s\S]*catch \{[\s\S]*return "unavailable";/,
  "API client must clear auth only for explicit refresh-token rejection, not for refresh fetch timeout or network errors.",
);
assertContains(
  launcher,
  /async function routeRestoredDesktopSession\(\)[\s\S]*const session = getStoredAuthSession\(\) \?\? \(await restoreStoredAuthSessionFromTauri\(\)\)[\s\S]*if \(!session\) \{[\s\S]*await stopTauriAuthenticatedSurfaces\(\);[\s\S]*return;[\s\S]*if \(!pathname\.startsWith\("\/app"\)\) \{[\s\S]*router\.replace\("\/app\/"\)/,
  "TauriPostLoginLauncher must only restore/route a desktop session while AppShell owns backend auth validation and room-context widget launch.",
);
assertNotContains(
  launcher,
  /authApi\.getMe\(\)/,
  "TauriPostLoginLauncher must not duplicate AppShell backend auth validation during Tauri startup.",
);
assertNotContains(
  launcher,
  /launchTauriAuthenticatedSurfaces/,
  "TauriPostLoginLauncher must not open widgets before the AppShell has resolved project-room context.",
);
assertContains(
  launcher,
  /window\.addEventListener\(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange\)/,
  "TauriPostLoginLauncher must react to auth session changes.",
);
assertContains(
  launcher,
  /const authDiagnosticsEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS === "true";[\s\S]*const realOAuthQaEnabled = process\.env\.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";[\s\S]*!\(authDiagnosticsEnabled \|\| realOAuthQaEnabled\)[\s\S]*window\.__BUBLI_TAURI_AUTH_QA__ = \{[\s\S]*assertRealGoogleAuthWidgetSnapshot: assertTauriRealGoogleAuthWidgetQa[\s\S]*getLocalSessionDiagnostics: getStoredAuthSessionDiagnostics[\s\S]*readAuthWidgetSnapshot: readTauriAuthWidgetQaSnapshot[\s\S]*readTauriMirrorDiagnostics: readTauriAuthSessionDiagnostics/,
  "TauriPostLoginLauncher must expose only explicitly enabled redacted auth diagnostics for manual QA and QA-instrumented release builds.",
);
assertContains(
  launcher,
  /delete window\.__BUBLI_TAURI_AUTH_QA__/,
  "TauriPostLoginLauncher must clean up the auth QA helper on unmount.",
);
assertNotContains(
  launcher,
  /__BUBLI_TAURI_AUTH_QA__[\s\S]{0,500}accessToken|__BUBLI_TAURI_AUTH_QA__[\s\S]{0,500}refreshToken|__BUBLI_TAURI_AUTH_QA__[\s\S]{0,500}sessionJson/,
  "Tauri auth QA helper must not expose raw tokens or mirrored session JSON through the window global.",
);
assertContains(
  authWidgetQa,
  /type ReadTauriAuthWidgetQaSnapshotOptions = \{[\s\S]*runStopCleanupProbe\?: boolean[\s\S]*export async function readTauriAuthWidgetQaSnapshot\([\s\S]*options: ReadTauriAuthWidgetQaSnapshotOptions = \{\}[\s\S]*Promise<TauriAuthWidgetQaSnapshot>/,
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
  /snapshot\.backend\.me\.ok[\s\S]*snapshot\.backend\.widgetContext\.ok[\s\S]*snapshot\.backend\.widgetSummary\.ok[\s\S]*snapshot\.activeProjectRoom\.hasSelectedRoom[\s\S]*realOAuthWidgetStartupRestoreReady\(snapshot\)[\s\S]*snapshot\.widgetRuntime\.allWindowRoomContextMatchesActive[\s\S]*snapshot\.widgetRuntime\.allWindowRoomContextMatchesServer[\s\S]*snapshot\.widgetRuntime\.barRestoreItems\.allMatchActiveRoom[\s\S]*snapshot\.syncRuntime\.allAutoSyncLoopsRunning/,
  "Actual Google OAuth QA assertion must verify real backend widget APIs, a selected project room, widget runtime state, and post-login auto-sync loops.",
);
assertContains(
  authWidgetQa,
  /readTauriAuthenticatedSurfacesLaunchTimeline[\s\S]*launchTimeline: TauriAuthenticatedSurfaceLaunchTimeline[\s\S]*snapshot\.launchTimeline\.completed[\s\S]*launchTimeline:authGateAfterBackendAuth[\s\S]*launchTimeline:firstWidgetOpenAfterBackendAuth[\s\S]*launchTimeline:mirrorStoredBeforeBar[\s\S]*launchTimeline:barBeforeBubbles[\s\S]*launchTimeline:syncLoopsAfterWidgets/,
  "Actual Google OAuth QA assertion must prove auth/session launch ordering before widgets and sync loops.",
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
const startupBubbleWindows = extractConstArray(surfaces, "loginStartupBubbleWindows");
assertContains(
  startupWindows,
  "loginStartupBarWindow",
  "Login startup windows must include the Bubli bar.",
);
assertContains(
  startupWindows,
  "loginStartupAgentOrbWindow",
  "Login startup windows must include the agent orb window.",
);
assertNotContains(
  startupWindows,
  "...loginStartupBubbleWindows",
  "Default login startup windows must not fan out every bubble window.",
);
assertContains(
  startupBubbleWindows,
  /bubbleType:\s*"todo"[\s\S]*windowId:\s*"todo"/,
  "Login startup bubble windows must keep the TODO restore definition.",
);
for (const required of ["agent", "alert", "chat", "memo", "schedule", "timer"]) {
  assertContains(
    startupBubbleWindows,
    new RegExp(`bubbleType:\\s*"${required}"[\\s\\S]*windowId:\\s*"${required}"`),
    `Login startup bubble windows must keep the ${required} restore definition.`,
  );
}
assertNotContains(
  startupBubbleWindows,
  /bubbleType:\s*"resource"[\s\S]*windowId:\s*"resource"/,
  "Login startup windows must not open the standalone resource/draft bubble because generated drafts live inside the agent widget.",
);

assertContains(
  surfaces,
  /readDesktopWidgetStartupPreference/,
  "resolveLoginStartupWindows must read the user's desktop widget startup preference from onboarding storage.",
);
assertContains(
  surfaces,
  /if \(startupConfig\.preloadWidgetSettingsDuringStartup\) \{[\s\S]*widgetApi\.getSettings\(\)[\s\S]*startupConfig\.settingsTimeoutMs[\s\S]*\}/,
  "Tauri login startup must gate widget settings prefetch behind the startup optimization profile so Windows can avoid an extra backend request while opening windows.",
);
assertContains(
  surfaces,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*function windowsStartupBound[\s\S]*startupConfig\.profile !== "windows"[\s\S]*startupConfig\.settingsTimeoutMs[\s\S]*withTimeout\(promise, startupConfig\.settingsTimeoutMs[\s\S]*async function resolveLaunchSelectedRoomId\(\)[\s\S]*const startupConfig = await readTauriStartupOptimizationConfig\(\)[\s\S]*windowsStartupBound\([\s\S]*widgetApi\.getContext\(\)[\s\S]*const cachedRooms = await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)[\s\S]*const cachedFirstRoom = startupConfig\.profile === "windows" \? cachedRooms\?\.\[0\] : null[\s\S]*widgetApi\.updateContext\(\{ selectedRoomId: cachedFirstRoom\.id \}\)[\s\S]*projectRoomApi\.list\(\)\.then\(\(page\) => writeWindowsProjectRoomsCache\(page\.items\)\)[\s\S]*windowsStartupBound\([\s\S]*projectRoomApi\.list\(\)[\s\S]*writeWindowsProjectRoomsCache\(roomPage\.items\)[\s\S]*windowsStartupBound\([\s\S]*widgetApi\.updateContext/,
  "Windows login startup must resolve the selected project room from route cache before bounded server fallback calls, then backfill the cache without changing non-Windows profiles.",
);
assertContains(
  surfaces,
  /preference\.mode === "board"[\s\S]*desktopWidgetBoardWindows/,
  "Board startup preference must open the curated blog-board widget set.",
);
assertContains(
  surfaces,
  /preference\.mode === "cascade"[\s\S]*desktopWidgetCascadeWindows/,
  "Cascade startup preference must open only a compact core widget set.",
);
assertContains(
  surfaces,
  /preference\.mode === "bar"[\s\S]*return loginStartupWindows;/,
  "The default bar startup preference must keep first launch to the Bubli bar/menu only.",
);
assertNotContains(
  surfaces,
  /function getVisibleLoginStartupModeFromSetting|const startupBubbles: WidgetWindowOpenInput\[\] = \[loginStartupMenuWindow\]/,
  "Tauri login startup must not preserve visible bubble fan-out logic after the bar-only first-launch policy.",
);
assertContains(
  surfaces,
  /seedWidgetBarItems\(\{ selectedRoomId \}\)/,
  "Tauri login startup must still seed every restore item into the bar.",
);
assertContains(
  surfaces,
  /startupPreference\.mode === "board"[\s\S]*arrangeWidgetWindows\(\{ layout: "board" \}\)/,
  "Board startup preference must arrange opened widgets with the board layout.",
);
assertContains(
  surfaces,
  /startupPreference\.mode === "cascade"[\s\S]*arrangeWidgetWindows\(\{ layout: "cascade" \}\)/,
  "Cascade startup preference must arrange opened widgets with the cascade layout.",
);
assertContains(
  surfaces,
  /export type TauriAuthenticatedSurfaceLaunchTimeline[\s\S]*authGateAfterBackendAuth\?: boolean[\s\S]*backendAuthValidationSource\?: "caller" \| "launcher"[\s\S]*firstWidgetOpenAfterBackendAuth\?: boolean[\s\S]*retrySuppressedAt\?: string[\s\S]*retrySuppressedUntil\?: string[\s\S]*export function readTauriAuthenticatedSurfacesLaunchTimeline\(\)/,
  "Tauri authenticated surface launcher must expose a redacted launch timeline for real OAuth QA ordering proof.",
);
assertContains(
  surfaces,
  /let lastAutoLaunchFailure: \{ failedAtMs: number; key: string \} \| null = null[\s\S]*const AUTO_LAUNCH_FAILURE_COOLDOWN_MS = 15_000[\s\S]*function autoLaunchFailureKey\(userId: string \| undefined, selectedRoomId: string \| null\)[\s\S]*selectedRoomId \?\? "personal"[\s\S]*function shouldApplyAutoLaunchCooldown\(options: LaunchTauriAuthenticatedSurfacesOptions\)[\s\S]*options\.retryPolicy === "cooldown"[\s\S]*function shouldSuppressAutoLaunchRetry\(key: string\)/,
  "Tauri widget auto-launch retry suppression must be keyed by user id and room id or personal mode without exposing tokens.",
);
assertContains(
  surfaces,
  /let launchInFlightRoomId: string \| null = null;[\s\S]*let queuedLaunchOptions: LaunchTauriAuthenticatedSurfacesOptions \| null = null;[\s\S]*let queuedLaunchPromise: Promise<void> \| null = null;/,
  "Tauri authenticated surface launcher must track in-flight and queued room launches.",
);
assertContains(
  surfaces,
  /launchTauriAuthenticatedSurfaces\(options: LaunchTauriAuthenticatedSurfacesOptions = \{\}\)[\s\S]*if \(!options\.sessionAlreadyValidated\) \{[\s\S]*await authApi\.getMe\(\);[\s\S]*\}[\s\S]*timeline\.backendAuthValidationSource = options\.sessionAlreadyValidated \? "caller" : "launcher"[\s\S]*timeline\.backendAuthValidatedAt = nowIso\(\);[\s\S]*const startupWindowsPromise = resolveLoginStartupWindows\(\)/,
  "launchTauriAuthenticatedSurfaces must verify the live backend auth session unless the caller already validated it before opening widgets.",
);
assertContains(
  surfaces,
  /const requestedRoomId = requestedLaunchRoomId\(options\);[\s\S]*if \(launchRequested && launchPromise\) \{[\s\S]*if \(!requestedRoomId \|\| launchInFlightRoomId === requestedRoomId\) \{[\s\S]*return launchPromise;[\s\S]*\}[\s\S]*queuedLaunchOptions = options;[\s\S]*const supersededLaunchPromise = launchPromise;[\s\S]*launchGeneration \+= 1;[\s\S]*queuedLaunchPromise = supersededLaunchPromise[\s\S]*return launchTauriAuthenticatedSurfaces\(nextOptions\);[\s\S]*return queuedLaunchPromise;/,
  "Tauri launcher must queue a latest-room relaunch instead of absorbing a project-room change into an in-flight launch.",
);
assertContains(
  surfaces,
  /await tauriCommands\.setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\);/,
  "launchTauriAuthenticatedSurfaces must open the native auth gate before widget windows.",
);
assertContains(
  surfaces,
  /startupWindowRequiresVisibleWindow[\s\S]*input\.bubbleType === "menu"[\s\S]*startupConfig\.requireMenuWindowDuringStartupReuse[\s\S]*startupWindowStateIsReady[\s\S]*if \(input\.mode === "MINIMIZED"\) return state\.mode === "MINIMIZED" && !state\.windowVisible;[\s\S]*return state\.windowVisible && state\.mode !== "MINIMIZED";[\s\S]*authenticatedStartupWindowsReady[\s\S]*const startupConfig = await readTauriStartupOptimizationConfig\(\);[\s\S]*startupWindows\.filter\(\(input\) => startupWindowRequiresVisibleWindow\(input, startupConfig\)\)[\s\S]*Promise\.all\([\s\S]*getWidgetWindowState\(widgetTargetFromInput\(input\)\)[\s\S]*startupWindowStateIsReady\(input, state\)[\s\S]*if \(!readyStates\?\.every\(Boolean\)\) return false;/,
  "launchTauriAuthenticatedSurfaces must reopen stale minimized DEFAULT startup widgets, require the Windows menu orb before reuse, and parallelize startup state probes.",
);
assertContains(
  surfaces,
  /getAuthenticatedSurfacesEnabled\(\)[\s\S]*const shouldReuseExistingWindows = launchedAuthenticatedSurfaces \|\| nativeAuthenticatedSurfacesEnabled;[\s\S]*if \(shouldReuseExistingWindows\) \{[\s\S]*authenticatedStartupWindowsReady\(startupWindows\)[\s\S]*if \(startupWindowsReady\) \{[\s\S]*timeline\.completed = true[\s\S]*return;[\s\S]*\}[\s\S]*launchedAuthenticatedSurfaces = false;[\s\S]*closeAllWidgetWindows\(\)/,
  "launchTauriAuthenticatedSurfaces must reuse ready visible windows and recover stale native launched state.",
);
assertContains(
  surfaces,
  /async function authenticatedStartupWindowsReady\(startupWindows: WidgetWindowOpenInput\[\]\)[\s\S]*if \(startupConfig\.profile !== "windows"\) return true;[\s\S]*const unexpectedVisibleBubble = await Promise\.all\([\s\S]*loginStartupBubbleWindows\.map[\s\S]*getWidgetWindowState\(widgetTargetFromInput\(input\)\)[\s\S]*state\.windowVisible && state\.mode !== "MINIMIZED"[\s\S]*unexpectedVisibleBubble\?\.every\(\(visible\) => !visible\) \?\? false/,
  "Windows authenticated surface reuse must reject stale visible bubble windows before reusing bar/menu startup windows.",
);
assertContains(
  surfaces,
  /type LaunchTauriAuthenticatedSurfacesOptions = \{[\s\S]*retryPolicy\?: "cooldown" \| "force";[\s\S]*sessionAlreadyValidated\?: boolean;[\s\S]*selectedRoomId\?: string \| null;[\s\S]*Object\.prototype\.hasOwnProperty\.call\(options, "selectedRoomId"\)[\s\S]*Promise\.resolve\(options\.selectedRoomId \?\? null\)[\s\S]*resolveLaunchSelectedRoomId\(\)/,
  "launchTauriAuthenticatedSurfaces must reuse caller-resolved project-room context, preserve explicit null personal mode, and keep cooldown opt-in before falling back to extra API lookups.",
);
assertContains(
  surfaces,
  /function widgetOpenInputForRoom\(input: WidgetWindowOpenInput, selectedRoomId: string \| null\): WidgetWindowOpenInput \{[\s\S]*clearSelectedRoomId: selectedRoomId === null,[\s\S]*selectedRoomId,[\s\S]*tauriCommands\.openWidgetWindow\(widgetOpenInputForRoom\(input, selectedRoomId\)\)[\s\S]*inputs\.map\(\(input\) => widgetOpenInputForRoom\(input, selectedRoomId\)\)/,
  "launchTauriAuthenticatedSurfaces must send clearSelectedRoomId when explicit personal mode opens native widget windows.",
);
assertContains(
  surfaces,
  /const \[startupWindows, selectedRoomId\] = await Promise\.all\(\[startupWindowsPromise, selectedRoomPromise\]\);[\s\S]*const launchFailureKey = autoLaunchFailureKey\(verifiedSession\?\.user\.id \?\? initialSession\.user\.id, selectedRoomId\)[\s\S]*const applyAutoLaunchCooldown = shouldApplyAutoLaunchCooldown\(options\)[\s\S]*if \(applyAutoLaunchCooldown && shouldSuppressAutoLaunchRetry\(launchFailureKey\)\)[\s\S]*retrySuppressedAt[\s\S]*await tauriCommands\.setAuthenticatedSurfacesEnabled\(\{ enabled: true \}\);/,
  "launchTauriAuthenticatedSurfaces must allow personal-mode widgets when no project-room context exists and suppress only opt-in auto retries.",
);
assertContains(
  surfaces,
  /const \[startupWindows, selectedRoomId\] = await Promise\.all\(\[startupWindowsPromise, selectedRoomPromise\]\);[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly if auth/session state changes after resolving the project-room context.",
);
assertContains(
  surfaces,
  /const \[startupWindows, selectedRoomId\] = await Promise\.all\(\[startupWindowsPromise, selectedRoomPromise\]\);[\s\S]*if \(barWindow\) \{[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly before opening the bar window.",
);
assertContains(
  surfaces,
  /openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must open the Bubli bar first with retry.",
);
assertContains(
  surfaces,
  /openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*openWidgetWindowsWithRetry\(secondaryStartupWindows, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly after opening the bar and before processing optional startup windows.",
);
assertContains(
  surfaces,
  /const \[barWindow, \.\.\.secondaryStartupWindows\] = startupWindows[\s\S]*const visibleBubbleWindows = secondaryStartupWindows\.filter\(\(input\) => input\.bubbleType !== "menu"\)[\s\S]*selectedRoomId \|\| visibleBubbleWindows\.length > 0[\s\S]*prewarmWidgetSummaryCache\(selectedRoomId\)[\s\S]*openWidgetWindowsWithRetry\(secondaryStartupWindows, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must keep the optional batch IPC path available for non-default startup windows.",
);
assertContains(
  surfaces,
  /openWidgetWindowsWithRetry\(secondaryStartupWindows, selectedRoomId, shouldContinueLaunch\)[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*if \(openedWindows\.length < startupWindows\.length\)/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly after optional startup window attempts and before marking the launch active.",
);
assertContains(
  surfaces,
  /for \(const input of openedWindows\)[\s\S]*recordWidgetUsageEvent[\s\S]*if \(generation !== launchGeneration\) \{[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*return;[\s\S]*startActivityAutoCapture\(\);/,
  "launchTauriAuthenticatedSurfaces must cancel cleanly after widget usage staging and before starting sync loops.",
);
assertContains(
  surfaces,
  /seedWidgetBarItems\(\{ selectedRoomId \}\)/,
  "launchTauriAuthenticatedSurfaces must seed minimized bar items after at least one widget opens.",
);
assertContains(
  surfaces,
  /openedWindows\.length < startupWindows\.length[\s\S]*if \(applyAutoLaunchCooldown\) \{[\s\S]*lastAutoLaunchFailure = \{ failedAtMs: Date\.now\(\), key: launchFailureKey \}[\s\S]*\}[\s\S]*closeAllWidgetWindows\(\)[\s\S]*setAuthenticatedSurfacesEnabled\(\{ enabled: false \}\)[\s\S]*Some Tauri widgets failed to open after login[\s\S]*launchedAuthenticatedSurfaces = true[\s\S]*lastAutoLaunchFailure = null[\s\S]*launchRequested = true;/,
  "A partially opened widget session must fail closed and record cooldown only for opt-in auto launches.",
);
assertContains(
  surfaces,
  /startActivityAutoCapture\(\);[\s\S]*startManagedFolderAutoSync\(\);[\s\S]*startWidgetUsageAutoSync\(\);/,
  "launchTauriAuthenticatedSurfaces must start activity, folder, and widget sync loops together.",
);
assertContains(
  widgetUsageAutoSync,
  /const widgetUsageAutoSyncEnabled =[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_WIDGET_USAGE_AUTO_SYNC !== "false"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"/,
  "Widget usage auto-sync must default on for installed Tauri sessions unless explicitly disabled, so real OAuth release QA proves the loop is running.",
);
assertContains(
  widgetUsageAutoSync,
  /export function startWidgetUsageAutoSync\(\) \{[\s\S]*if \(!isTauriRuntime\(\)\) return;[\s\S]*if \(!widgetUsageAutoSyncEnabled\) return;[\s\S]*registerWidgetUsageLifecycleFlush\(\);[\s\S]*syncIntervalId = window\.setInterval/,
  "Widget usage auto-sync must still be Tauri-only and must register a periodic sync loop when enabled.",
);
assertContains(
  surfaces,
  /queuedLaunchOptions = null;[\s\S]*queuedLaunchPromise = null;[\s\S]*await stopActivityAutoCapture\(\{ flush: true \}\);[\s\S]*await stopManagedFolderAutoSync\(\{ flush: true \}\);[\s\S]*await stopWidgetUsageAutoSync\(\{ flush: true \}\);/,
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
  "AppNav must keep the communication route defined for both web and the hybrid Tauri app.",
);
assertNotContains(
  appNav,
  /item\.href !== "\/app\/chat"/,
  "AppNav must show the communication tab in the hybrid Tauri app exactly like the web app (no Tauri-only filtering).",
);

assertContains(
  appShell,
  /const runtimeSmokeEnabled =[\s\S]*process\.env\.NODE_ENV === "development"[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true"/,
  "AppShell must only let development runtime smoke own widget launch.",
);
assertContains(
  appShell,
  /const shellContextReady = state\.kind === "ready"[\s\S]*if \(!shellContextReady \|\| !readyUserId \|\| !isTauriRuntime\(\) \|\| runtimeSmokeEnabled\) return;/,
  "AppShell must launch native surfaces after the authenticated shell and user are ready.",
);
assertContains(
  appShell,
  /void launchTauriAuthenticatedSurfaces\(\{[\s\S]*retryPolicy: "cooldown"[\s\S]*sessionAlreadyValidated: true[\s\S]*\}\)\.catch/,
  "AppShell must trigger authenticated native surfaces after shell readiness without coupling widget launches to room-tab changes or repeating getMe.",
);
assertContains(
  appShell,
  /AUTH_SESSION_CHANGE_EVENT,[\s\S]*?getStoredAuthSession,[\s\S]*?restoreStoredAuthSessionFromTauri[\s\S]*async function restoreInitialWorkspaceSession\(\)[\s\S]*const storedSession = getStoredAuthSession\(\);[\s\S]*if \(storedSession\) \{[\s\S]*return storedSession;[\s\S]*restoreStoredAuthSessionFromTauri\(\)/,
  "AppShell must use the local auth session fast path before waiting on the Tauri mirror.",
);
assertContains(
  appShell,
  /const userRequest = authApi\.getMe\(\);[\s\S]*user = await boundWindowsWorkspaceHydration\(userRequest, workspaceHydrationTimeoutMs, restoredSession\.user\)[\s\S]*isWindowsTauriRuntime\(\) && workspaceHydrationTimeoutMs > 0 && user === restoredSession\.user[\s\S]*userRequest\.then\([\s\S]*setState\(\(current\) => \(current\.kind === "ready" \? \{ \.\.\.current, user: latestUser \} : current\)\)[\s\S]*error instanceof ApiClientError && error\.status === 401[\s\S]*redirectToLoginWhenTauri\(\)[\s\S]*setState\(\(current\) =>[\s\S]*rooms: roomsRef\.current\.length > 0 \? roomsRef\.current : cachedShellRooms \?\? \[\][\s\S]*projectRoomApi\.list\(\),[\s\S]*widgetApi\.getContext\(\),/,
  "Windows AppShell may use the restored session user as a bounded startup fallback, but /api/me must continue as a backfill validator that updates the shell or redirects on 401 before slower room/widget context hydration completes.",
);
assertContains(
  appShell,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*const cachedShellRooms = await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)[\s\S]*activeCachedRoom[\s\S]*seedActiveProjectRoomId\(activeCachedRoom\.id, activeCachedRoom\.name\)[\s\S]*rooms: roomsRef\.current\.length > 0 \? roomsRef\.current : cachedShellRooms \?\? \[\][\s\S]*queueWorkspaceHydration\(\)/,
  "Windows AppShell shell state must reuse the project-room route cache so the topbar and switcher can render recent room context while room/widget hydration backfills.",
);
assertContains(
  appShell,
  /readWindowsWorkspaceHydrationTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*startupConfig\?\.profile !== "windows"[\s\S]*startupConfig\.settingsTimeoutMs[\s\S]*boundWindowsWorkspaceHydration[\s\S]*withTimeout\(task, timeoutMs, fallback\)[\s\S]*workspaceHydrationTimeoutMs = await readWindowsWorkspaceHydrationTimeoutMs\(\)[\s\S]*boundWindowsWorkspaceHydration\(projectRoomApi\.list\(\), workspaceHydrationTimeoutMs, null\)[\s\S]*boundWindowsWorkspaceHydration\(widgetApi\.getContext\(\), workspaceHydrationTimeoutMs, null\)[\s\S]*queueWorkspaceHydration\(\)/,
  "Windows AppShell hydration must bound slow room/widget context calls and continue with background hydration.",
);
assertNotContains(
  appShell,
  /if \(isTauriRuntime\(\)\) \{[\s\S]*\{ kind: "ready", notifications: \[\], rooms: roomsRef\.current, user: restoredSession\.user \}[\s\S]*authApi\.getMe\(\)/,
  "Hybrid Tauri app must not unconditionally paint the member shell from a restored OAuth session; only the Windows startup timeout fallback may do that with /api/me backfill validation.",
);
assertContains(
  appShell,
  /if \(state\.kind === "loading" \|\| state\.kind === "auth"\) \{[\s\S]*className="bubli-auth-gate bubli-auth-gate--standalone"[\s\S]*t\("common\.loading"\)[\s\S]*t\("layout\.gate\.redirecting"\)/,
  "Hybrid Tauri app must render a standalone auth gate instead of leaking the member shell while auth is loading or redirecting.",
);
assertContains(
  appShell,
  /if \(state\.kind === "auth"\) \{[\s\S]*if \(isDesktopRuntime\) \{[\s\S]*description: t\("layout\.project\.checking"\)[\s\S]*name: t\("layout\.project\.selectRoom"\)/,
  "Hybrid Tauri app must keep the topbar in a checking state instead of flashing login-required labels during auth recovery.",
);
assertContains(
  appShell,
  /const \[authRecoveryNonce, setAuthRecoveryNonce\] = useState\(0\)[\s\S]*const setAuthOrDesktopRedirectState = \(\) => \{[\s\S]*setState\(isTauriRuntime\(\) \? \{ kind: "loading" \} : \{ kind: "auth" \}\)[\s\S]*\}, \[authRecoveryNonce, router\]\);[\s\S]*if \(state\.kind === "auth"\) \{[\s\S]*if \(isDesktopRuntime\) \{[\s\S]*restoreStoredAuthSessionFromTauri\(\)[\s\S]*setState\(\{ kind: "loading" \}\)[\s\S]*setAuthRecoveryNonce\(\(current\) => current \+ 1\)[\s\S]*stopTauriAuthenticatedSurfaces\(\)[\s\S]*router\.replace\("\/login"\)/,
  "Hybrid Tauri app must retry the mirrored session and explicitly rerun shell loading before redirecting an auth reset to /login.",
);
assertContains(
  appShell,
  /const redirectToLoginWhenTauri = \(\) => \{[\s\S]*if \(isTauriRuntime\(\)\) \{[\s\S]*router\.replace\("\/login"\)[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*window\.location\.pathname\.startsWith\("\/app"\)[\s\S]*window\.location\.assign\("\/login"\)[\s\S]*const setAuthOrDesktopRedirectState = \(\) => \{[\s\S]*setState\(isTauriRuntime\(\) \? \{ kind: "loading" \} : \{ kind: "auth" \}\)[\s\S]*!restoredSession[\s\S]*setAuthOrDesktopRedirectState\(\)[\s\S]*redirectToLoginWhenTauri\(\)[\s\S]*error instanceof ApiClientError && error\.status === 401[\s\S]*setAuthOrDesktopRedirectState\(\)[\s\S]*redirectToLoginWhenTauri\(\)/,
  "Hybrid Tauri app must route missing-session and 401 startup states directly to /login instead of lingering on the /app auth gate.",
);
assertContains(
  appShell,
  /if \(isTauriRuntime\(\) && !getActiveProjectRoomId\(\) && roomPage\.items\[0\]\) \{[\s\S]*widgetApi\.updateContext\(\{ selectedRoomId: firstRoom\.id \}\)/,
  "AppShell first-room fallback must stay Tauri-only so the web shell does not silently change widget context.",
);
assertContains(
  calendarPage,
  /withCalendarHydrationTimeout[\s\S]*window\.setTimeout\(\(\) => resolve\(fallback\), timeoutMs\)[\s\S]*readWindowsCalendarHydrationTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*startupConfig\?\.profile !== "windows"[\s\S]*startupConfig\.settingsTimeoutMs[\s\S]*windowsHydrationTimeoutMs = await readWindowsCalendarHydrationTimeoutMs\(\)[\s\S]*withCalendarHydrationTimeout\([\s\S]*calendarApi\.getProjectRoomEvents\(selectedRoomId, \{ limit: 100 \}\)[\s\S]*windowsHydrationTimeoutMs[\s\S]*withCalendarHydrationTimeout\(calendarApi\.getGoogleConnection\(\), windowsHydrationTimeoutMs, null\)[\s\S]*calendarApi[\s\S]*\.getGoogleConnection\(\)[\s\S]*setGoogleConnection/,
  "Windows Calendar page must bound secondary room-event and Google-connection hydration so slow server calls do not block the local schedule view.",
);
assertContains(
  settingsPage,
  /getStoredAuthSession[\s\S]*isWindowsTauriRuntime[\s\S]*const cachedUser = isWindowsTauriRuntime\(\) \? getStoredAuthSession\(\)\?\.user \?\? null : null[\s\S]*const userRequest = authApi\.getMe\(\)[\s\S]*boundSettingsHydration<AuthUser>\(userRequest, cachedUser\)[\s\S]*userRequest\.then\([\s\S]*setNameDraft\(latestUser\.name\)[\s\S]*user: latestUser[\s\S]*error instanceof ApiClientError && error\.status === 401[\s\S]*setState\(\{ kind: "auth" \}\)/,
  "Windows Settings page must use the mirrored session user as a bounded fallback, then backfill /api/me.",
);
assertContains(
  settingsPage,
  /withSettingsHydrationTimeout[\s\S]*window\.setTimeout\(\(\) => resolve\(fallback\), timeoutMs\)[\s\S]*readWindowsSettingsHydrationTimeoutMs[\s\S]*readTauriStartupOptimizationConfig\(\)[\s\S]*startupConfig\?\.profile !== "windows"[\s\S]*startupConfig\.settingsTimeoutMs[\s\S]*settingsHydrationTimeoutMs = await readWindowsSettingsHydrationTimeoutMs\(\)[\s\S]*boundSettingsHydration\(widgetApi\.getBubbles\(\), null\)[\s\S]*boundSettingsHydration\(listPersonalManagedFolders\(\), null\)[\s\S]*boundSettingsHydration\(calendarApi\.getGoogleConnection\(\), null\)[\s\S]*boundSettingsHydration\(projectRoomApi\.list\(\), null\)[\s\S]*Promise\.allSettled\(\[[\s\S]*widgetApi\.getBubbles\(\)[\s\S]*listPersonalManagedFolders\(\)[\s\S]*calendarApi\.getGoogleConnection\(\)[\s\S]*projectRoomApi\.list\(\)[\s\S]*setState\(\(current\) =>/,
  "Windows Settings page must use the mirrored session user as a bounded fallback, then backfill /api/me and secondary settings values after the page becomes ready.",
);
assertContains(
  appShell,
  /launchTauriAuthenticatedSurfaces\(\{[\s\S]*retryPolicy: "cooldown"[\s\S]*sessionAlreadyValidated: true[\s\S]*\}\)\.catch[\s\S]*\}, \[readyUserId, shellContextReady\]\);/,
  "AppShell must keep Tauri widget launch independent from room-tab changes to avoid repeated auto-launch flicker.",
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
  /router\.replace\(`\/app\/chat\?mode=room&roomId=\$\{encodeURIComponent\(roomId\)\}`\)/,
  "Project-room chat route must open the communication tab directly, matching the web app (no widget handoff).",
);
assertNotContains(
  appChat,
  /openTauriChatWidget\(\{[\s\S]*eventType: "handoff:chat-route"/,
  "/app/chat must stay on the communication tab in the hybrid Tauri app instead of handing off to the widget, matching the web app.",
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
assertContains(
  authPanel,
  /const liveAuth = useLiveAuthState\(\);[\s\S]*const hasMounted = useSyncExternalStore\(subscribeClientSnapshot, getClientSnapshot, getServerSnapshot\);[\s\S]*const isCheckingExistingSession = liveAuth\.status === "checking";[\s\S]*const submitLabel =[\s\S]*hasMounted && isTauriRuntime\(\)[\s\S]*t\("auth\.panel\.googleLogin"\)[\s\S]*isCheckingExistingSession[\s\S]*t\("common\.loading"\)[\s\S]*aria-busy=\{isStartingLogin \|\| isCheckingExistingSession\}[\s\S]*disabled=\{isStartingLogin \|\| isCheckingExistingSession\}[\s\S]*\{submitLabel\}/,
  "Tauri login must keep the visible Google login CTA stable while using disabled/aria-busy for session restore and OAuth progress.",
);
assertContains(
  authPanel,
  /getStoredAuthSession,[\s\S]*restoreStoredAuthSessionFromTauri,[\s\S]*async function openStoredTauriSession\(\)[\s\S]*getStoredAuthSession\(\) \?\? \(await restoreStoredAuthSessionFromTauri\(\)\)[\s\S]*router\.replace\(TAURI_MEMBER_APP_ROUTE\)/,
  "Tauri login must immediately route an existing mirrored session back to the packaged app instead of waiting for a login-page getMe check.",
);
assertContains(
  authLiveHook,
  /ApiClientError[\s\S]*isWindowsTauriRuntime[\s\S]*if \(isWindowsTauriRuntime\(\)\) \{[\s\S]*commit\(\{ status: "authenticated", user: session\.user \}\)[\s\S]*authApi\.getMe\(\)\.then\([\s\S]*commit\(\{ status: "authenticated", user: me \}\)[\s\S]*error instanceof ApiClientError && error\.status === 401[\s\S]*commit\(\{ status: "unauthenticated", user: null \}\)/,
  "Windows live auth must expose the mirrored session user immediately while /api/me validates and backfills or clears the session on 401.",
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
  authApi,
  /async callbackGoogle\(input: GoogleCallbackRequest\)[\s\S]*if \(input\.clientType === "TAURI"\) \{[\s\S]*await setStoredAuthSessionAndWaitForTauriMirror\(\{ \.\.\.token, clientType: input\.clientType \}\)[\s\S]*\} else \{[\s\S]*setStoredAuthSession\(\{ \.\.\.token, clientType: input\.clientType \}\)/,
  "Shared Google OAuth callback must wait for the Tauri auth mirror before redirecting when the client type is TAURI.",
);
assertContains(
  authApi,
  /async refresh\(\)[\s\S]*if \(isTauriRuntime\(\)\) \{[\s\S]*await setStoredAuthSessionAndWaitForTauriMirror\(\{ \.\.\.token, clientType \}\)[\s\S]*\} else \{[\s\S]*setStoredAuthSession\(\{ \.\.\.token, clientType \}\)/,
  "Shared refresh must wait for the Tauri auth mirror so rotated refresh tokens survive app restarts.",
);
assertContains(
  apiClient,
  /if \(isTauriRuntime\(\)\) \{[\s\S]*await setStoredAuthSessionAndWaitForTauriMirror\(\{ \.\.\.payload\.data, clientType \}\)[\s\S]*\} else \{[\s\S]*setStoredAuthSession\(\{ \.\.\.payload\.data, clientType \}\)[\s\S]*\}[\s\S]*return "refreshed";[\s\S]*if \(isRefreshTokenRejected\(response\.status, payload\)\) \{[\s\S]*clearStoredAuthSession\(\);[\s\S]*return "invalid";[\s\S]*return "unavailable";[\s\S]*\} catch \{[\s\S]*return "unavailable";/,
  "API client refresh must mirror successful Tauri refreshes and must not erase the desktop mirror on transient refresh fetch failures.",
);
assertContains(
  authSession,
  /const DEV_REFRESH_TOKEN_PREFIX = "dev-refresh-token:";[\s\S]*function shouldRejectStoredAuthSession\(session: StoredAuthSession\)[\s\S]*isDevAccessTokenSession\(session\) && !isDevAccessTokenSessionAllowed\(\)/,
  "Stored synthetic dev-token sessions must be rejected unless the explicit development-only Tauri dev-login flag is set.",
);
assertContains(
  authSession,
  /function clearLocalAuthSessionOnly\(\)[\s\S]*window\.localStorage\.removeItem\(AUTH_SESSION_STORAGE_KEY\)[\s\S]*function clearRejectedStoredAuthSession\(\)[\s\S]*if \(isTauriRuntime\(\)\) \{[\s\S]*clearLocalAuthSessionOnly\(\);[\s\S]*return;[\s\S]*\}[\s\S]*clearStoredAuthSession\(\);[\s\S]*if \(!parsed\) \{[\s\S]*clearRejectedStoredAuthSession\(\);[\s\S]*if \(shouldRejectStoredAuthSession\(parsed\)\) \{[\s\S]*clearRejectedStoredAuthSession\(\);/,
  "Tauri auth restore must not erase the mirrored desktop session before it can recover from invalid localStorage.",
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
  /let tauriAuthSessionReadPromise: Promise<TauriAuthSessionReadResult \| null> \| null = null[\s\S]*let tauriAuthSessionMutationEpoch = 0[\s\S]*function readTauriAuthSessionOnce\(\)[\s\S]*tauriCommands\.readTauriAuthSession\(\)\.finally\(\(\) => \{[\s\S]*tauriAuthSessionReadPromise = null[\s\S]*async function readTauriAuthSessionForRestore\(\)[\s\S]*const readEpoch = tauriAuthSessionMutationEpoch[\s\S]*return readEpoch === tauriAuthSessionMutationEpoch \? restored : null[\s\S]*export async function readTauriAuthSessionDiagnostics\(\): Promise<AuthSessionDiagnostics>[\s\S]*readTauriAuthSessionForRestore\(\)[\s\S]*createAuthSessionDiagnostics\("tauriMirror"/,
  "Manual Tauri OAuth QA must be able to inspect a redacted Tauri SQLite auth mirror snapshot.",
);
assertContains(
  authSession,
  /function storeAuthSessionToTauriMirror\(session: StoredAuthSession\)[\s\S]*invalidateTauriAuthSessionRead\(\)[\s\S]*storeTauriAuthSession[\s\S]*function clearTauriAuthSessionMirror\(\)[\s\S]*invalidateTauriAuthSessionRead\(\)[\s\S]*clearTauriAuthSession[\s\S]*function invalidateTauriAuthSessionRead\(\)[\s\S]*tauriAuthSessionMutationEpoch \+= 1[\s\S]*tauriAuthSessionReadPromise = null/,
  "Tauri auth mirror writes and clears must invalidate any in-flight mirror read before later startup restores.",
);
assertContains(
  authSession,
  /const parsed = parseStoredAuthSession\(raw\);[\s\S]*shouldRejectStoredAuthSession\(parsed\)[\s\S]*clearStoredAuthSession\(\);/,
  "Local stored auth session reads must clear stale dev-token sessions when the dev-login flag is not enabled.",
);
assertContains(
  authSession,
  /const restored = await readTauriAuthSessionForRestore\(\);[\s\S]*const parsed = parseStoredAuthSession\(restored\.sessionJson\);[\s\S]*shouldRejectStoredAuthSession\(parsed\)[\s\S]*clearTauriAuthSessionMirror\(\);/,
  "Tauri mirrored auth session restore must clear stale dev-token sessions when the dev-login flag is not enabled.",
);
assertContains(
  authSession,
  /probeStoredAuthSessionRestoreFromTauriMirrorForQa[\s\S]*invalidateTauriAuthSessionRead\(\)[\s\S]*window\.localStorage\.removeItem\(AUTH_SESSION_STORAGE_KEY\)[\s\S]*restoreStoredAuthSessionFromTauri\(\)[\s\S]*restoredRealOAuthSession[\s\S]*invalidateTauriAuthSessionRead\(\)[\s\S]*window\.localStorage\.setItem\(AUTH_SESSION_STORAGE_KEY, originalRawSession\)/,
  "Manual Tauri OAuth QA must simulate renderer-session loss inside auth-session and restore from the Tauri SQLite auth mirror without exposing raw tokens.",
);
assertContains(
  widgetAuthHeaders,
  /!isTauriRuntime\(\)[\s\S]*process\.env\.NEXT_PUBLIC_BUBLI_PREVIEW_DATA === "true"/,
  "Widget dev bearer headers must stay web-preview only and must not mask missing Tauri auth sessions.",
);
assertContains(
  widgetAuthHeaders,
  /isWindowsTauriRuntime[\s\S]*if \(isWindowsTauriRuntime\(\) && !headers && !next\.has\("Authorization"\)\) \{[\s\S]*return undefined;/,
  "Windows Tauri widget requests must omit empty dev-auth headers so common GET request de-duping stays enabled.",
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
  /const isWindowsStartupProfile = isTauri && startupOptimization\.profile === "windows"[\s\S]*const validateWidgetAuthSession = useCallback\(async \(\) => \{[\s\S]*const session = await restoreWidgetStoredAuthSessionWithGrace\(\)[\s\S]*if \(isWindowsStartupProfile\) \{[\s\S]*void authApi\.getMe\(\)\.catch[\s\S]*clearStoredAuthSession\(\)[\s\S]*AUTH_SESSION_CHANGE_EVENT[\s\S]*return true;[\s\S]*await authApi\.getMe\(\);/,
  "Windows desktop widget startup must render from the restored Tauri auth mirror immediately while backend getMe validation continues in the background.",
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
  widgetPage,
  /const initialDisplayPageSize =[\s\S]*startupOptimization\.initialDisplayPageSize[\s\S]*const initialNotificationScanPages =[\s\S]*isTauri && !displayLoadedOnceRef\.current && startupOptimization\.initialNotificationScanPages > 0[\s\S]*widgetDisplayApi\.listSchedules\(selectedRoomId, initialDisplayPageSize\)[\s\S]*widgetDisplayApi\.listResources\(selectedRoomId, initialDisplayPageSize\)[\s\S]*widgetDisplayApi\.listMemos\(selectedRoomId, initialDisplayPageSize\)[\s\S]*listWidgetVisibleUnreadNotifications\(WIDGET_NOTIFICATION_DISPLAY_LIMIT, initialNotificationScanPages\)[\s\S]*startupOptimization\.initialDisplayPageSize[\s\S]*startupOptimization\.initialNotificationScanPages/,
  "Desktop widget must use the Windows startup profile to bound first-load schedule/resource/memo requests and request only unread notification scans without affecting later refreshes.",
);
assertContains(
  widgetPage,
  /async function listWidgetVisibleUnreadNotifications[\s\S]*widgetDisplayApi\.listNotifications\(WIDGET_NOTIFICATION_PAGE_SIZE, page, "UNREAD"\)/,
  "Desktop widget notification scans must request only unread notifications from the backend before applying display filters.",
);
assertContains(
  widgetPage,
  /isWidgetRingingBack[\s\S]*widgetDisplayApi[\s\S]*\.listNotifications\(10, 0, "UNREAD"\)[\s\S]*VOICE_CALL_DECLINED/,
  "Desktop widget voice-call decline polling must request unread notifications instead of repeatedly scanning broad notification history.",
);
assertContains(
  widgetPage,
  /startupOptimization\.profile === "windows"[\s\S]*\? buildEmptyDisplayBubbles\(t, requestedRoomId\)[\s\S]*: withWidgetDisplayLoadState\(buildEmptyDisplayBubbles\(t, requestedRoomId\), "loading"\)[\s\S]*const deferInitialWindowsItemStateSync = isWindowsStartupProfile && !hadLoadedDisplay[\s\S]*deferInitialWindowsItemStateSync[\s\S]*\? \[\][\s\S]*listItemStates\(nextDisplayItemIds\)[\s\S]*displayLoadedOnceRef\.current = true[\s\S]*deferInitialWindowsItemStateSync && nextDisplayItemIds\.length > 0[\s\S]*listItemStates\(nextDisplayItemIds\)/,
  "Desktop widget Windows profile must show the first frame without the blocking loading copy and defer item-state sync until after first display.",
);
assertContains(
  widgetPage,
  /withWidgetDisplayDeadline[\s\S]*window\.setTimeout\(\(\) => resolve\(fallback\), timeoutMs\)[\s\S]*const displayRequestTimeoutMs = isWindowsStartupProfile \? startupOptimization\.displayRequestTimeoutMs : 0[\s\S]*readWidgetDisplaySummary[\s\S]*displayRequestTimeoutMs[\s\S]*displayRequest\(widgetDisplayApi\.getDashboardWork\(\)\)[\s\S]*displayRequest\(widgetDisplayApi\.listChatRooms\(20\)\)[\s\S]*displayRequest\(agentApi\.listGeneratedDocuments\(\)\)[\s\S]*displayRequest\(widgetDisplayApi\.listChatMessages\(activeRoom\.id, 40\)\)/,
  "Desktop widget Windows profile must deadline slow display API requests so a delayed server response does not block widget rendering.",
);
assertContains(
  widgetPage,
  "const displayRefreshThrottleTimerRef = useRef<number | null>(null);",
  "Desktop widget Windows profile must track a pending display refresh throttle timer.",
);
assertContains(
  widgetPage,
  /const requestDisplayRefresh = useCallback\(\(\) => \{[\s\S]*startupOptimization\.displayRefreshThrottleMs[\s\S]*if \(displayRefreshThrottleTimerRef\.current !== null\) return;[\s\S]*displayRefreshThrottleTimerRef\.current = window\.setTimeout[\s\S]*bumpRevision\(\);/,
  "Desktop widget Windows profile must coalesce bursty display refresh requests instead of starting duplicate server refreshes.",
);
assertContains(
  widgetPage,
  /startupOptimization\.profile !== "windows"[\s\S]*buildEmptyDisplayBubbles\(t, selectedWidgetRoomId\)[\s\S]*setDisplayBubbles\(\(current\) => \{[\s\S]*current\[activeBubble\][\s\S]*notificationLabel: "widget\.data\.loading"[\s\S]*panelBody: "widget\.data\.loadingBody"/,
  "Desktop widget Windows profile must update the active bubble presentation immediately while slower server data catches up.",
);
assertContains(
  widgetPage,
  /allowServerFallback\?: boolean[\s\S]*if \(options\.allowServerFallback === false\) return null[\s\S]*const isWindowsStartupProfile = isTauri && startupOptimization\.profile === "windows"[\s\S]*const deferInitialWindowsBarCollectionLoad =[\s\S]*isWindowsStartupProfile && loadFullDisplay && !displayLoadedOnceRef\.current[\s\S]*const deferInitialWindowsBarServerLoad =[\s\S]*isWindowsStartupProfile && isBubbleBar && !loadFullDisplay && !displayLoadedOnceRef\.current[\s\S]*allowServerFallback: !deferInitialWindowsBarServerLoad && !deferInitialWindowsBarCollectionLoad[\s\S]*refreshServerOnCacheHit: isBubbleBar && !deferInitialWindowsBarServerLoad && !deferInitialWindowsBarCollectionLoad[\s\S]*\(loadFullDisplay && !deferInitialWindowsBarCollectionLoad\)[\s\S]*const loadRoom =[\s\S]*\(loadFullDisplay && !deferInitialWindowsBarCollectionLoad\)[\s\S]*const loadProjectRooms =[\s\S]*\(loadFullDisplay && !deferInitialWindowsBarCollectionLoad\)[\s\S]*deferredBarCollectionRefreshTimerRef\.current = window\.setTimeout[\s\S]*requestDisplayRefresh\(\)[\s\S]*startupOptimization\.deferredBarCollectionRefreshDelayMs/,
  "Desktop widget must let the Windows startup profile render the initial bar from cache/summary first and defer heavy bar collection, room detail, and project-room list loads until after the first usable paint.",
);
assertContains(
  widgetPage,
  /readWindowsProjectRoomsCache[\s\S]*writeWindowsProjectRoomsCache[\s\S]*const projectRoomsValue = projectRoomsResult\.status === "fulfilled" \? projectRoomsResult\.value : null[\s\S]*writeWindowsProjectRoomsCache\(projectRoomsValue\.items\)[\s\S]*setWidgetRoomOptions[\s\S]*loadProjectRooms && isWindowsStartupProfile[\s\S]*const cachedRooms = await readWindowsProjectRoomsCache\(\)\.catch\(\(\) => null\)[\s\S]*cachedRooms[\s\S]*setWidgetRoomOptions/,
  "Desktop widget Windows profile must reuse the project-room route cache for room options when the widget project-room list is delayed.",
);
assertContains(
  widgetPage,
  /const deferBarAgentCollections =[\s\S]*startupOptimization\.deferBarAgentCollectionsOnInitialDisplay[\s\S]*!displayLoadedOnceRef\.current[\s\S]*const loadSuggestions = shouldLoadBubbleData\("agent"\) && !deferBarAgentCollections[\s\S]*const loadGeneratedDocuments = shouldLoadBubbleData\("agent"\) && !deferBarAgentCollections[\s\S]*startupOptimization\.deferBarAgentCollectionsOnInitialDisplay/,
  "Desktop widget must let the Windows startup profile skip duplicate bar agent collection requests on the initial full bar display.",
);
assertContains(
  widgetPage,
  /refreshMenuOrbAgentReplyBadge[\s\S]*window\.setInterval\(\(\) => \{[\s\S]*startupOptimization\.menuOrbBadgeRefreshIntervalMs[\s\S]*startupOptimization\.menuOrbBadgeRefreshIntervalMs/,
  "Desktop widget menu orb must use the startup profile for fallback agent badge polling instead of a hard-coded fast interval.",
);
assertContains(
  widgetPage,
  /readCachedWidgetSummaryRoomId[\s\S]*readWidgetDisplaySummary\(null, \{ allowServerFallback: false \}\)[\s\S]*refreshMenuOrbAgentReplyBadge[\s\S]*isWindowsStartupProfile[\s\S]*readCachedWidgetSummaryRoomId\(\)[\s\S]*withWidgetDisplayDeadline\([\s\S]*widgetApi\.getContext\(\)[\s\S]*displayRequestTimeoutMs[\s\S]*openAgentFromMenuOrb[\s\S]*isWindowsStartupProfile[\s\S]*readCachedWidgetSummaryRoomId\(\)[\s\S]*withWidgetDisplayDeadline\([\s\S]*widgetApi\.getContext\(\)[\s\S]*displayRequestTimeoutMs/,
  "Desktop widget Windows menu orb must resolve agent room context from local summary first and deadline slow widget context calls before opening the agent bubble.",
);
assertContains(
  widgetPage,
  /refreshWidgetContext[\s\S]*window\.setInterval\(\(\) => \{[\s\S]*startupOptimization\.widgetContextRefreshIntervalMs[\s\S]*startupOptimization\.widgetContextRefreshIntervalMs/,
  "Desktop widget windows must use the startup profile for fallback room-context polling instead of a hard-coded fast interval.",
);
assertContains(
  widgetPage,
  /listenWidgetBarItemsChanged\(\(\) => \{[\s\S]*void loadBarItems\(\);[\s\S]*requestDisplayRefresh\(\);[\s\S]*const intervalId = window\.setInterval\(\(\) => \{[\s\S]*void loadBarItems\(\);[\s\S]*\}, isTauri \? 15000 : 4000\)/,
  "Desktop widget bar fallback polling must refresh only bar items while native bar-item events own full display refreshes.",
);
assertNotContains(
  widgetPage,
  /const intervalId = window\.setInterval\(\(\) => \{[\s\S]{0,120}void loadBarItems\(\);[\s\S]{0,120}requestDisplayRefresh\(\);[\s\S]{0,120}\}, isTauri \? 15000 : 4000\)/,
  "Desktop widget bar fallback polling must not trigger full display refreshes every 15 seconds.",
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
