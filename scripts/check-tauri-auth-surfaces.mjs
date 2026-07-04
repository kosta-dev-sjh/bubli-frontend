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
  projectRoomChatRoute: "src/app/(workspace)/app/project-rooms/[roomId]/chat/page.tsx",
  layout: "src/app/layout.tsx",
  postLoginLauncher: "src/lib/tauri/tauri-post-login-launcher.tsx",
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
const projectRoomChatRoute = read(files.projectRoomChatRoute);

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
  launcher,
  /pathname === "\/desktop-widget" \|\| pathname\.startsWith\("\/desktop-widget\/"\)/,
  "TauriPostLoginLauncher must skip desktop-widget windows to avoid widget self-launch loops.",
);
assertContains(
  launcher,
  /if \(!isTauriRuntime\(\) \|\| isDesktopWidgetSurface\)/,
  "TauriPostLoginLauncher must run only in the Tauri app shell, not normal web pages.",
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
  /state\.kind !== "ready" \|\| !isTauriRuntime\(\)/,
  "AppShell must launch native surfaces only after authenticated shell data is ready.",
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

console.log("Tauri authenticated surface contract check passed.");
