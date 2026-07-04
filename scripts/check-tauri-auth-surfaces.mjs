import { readFileSync } from "node:fs";

const files = {
  appNav: "src/components/layout/app-nav.tsx",
  appShell: "src/components/layout/app-shell.tsx",
  authenticatedSurfaces: "src/lib/tauri/authenticated-surfaces.ts",
  desktopWidgetPage: "src/app/desktop-widget/page.tsx",
  layout: "src/app/layout.tsx",
  postLoginLauncher: "src/lib/tauri/tauri-post-login-launcher.tsx",
  workspaceActiveRoom: "src/lib/workspace-active-room.ts",
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
const appNav = read(files.appNav);
const appShell = read(files.appShell);
const widgetPage = read(files.desktopWidgetPage);
const workspaceActiveRoom = read(files.workspaceActiveRoom);

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
for (const disallowed of ["agent", "alert", "chat", "memo", "resource", "schedule", "timer"]) {
  if (new RegExp(`bubbleType:\\s*"${disallowed}"`).test(startupWindows)) {
    throw new Error(
      `Login startup must not spawn every widget at once; unexpected ${disallowed} window in loginStartupWindows.`,
    );
  }
}

assertContains(
  surfaces,
  /return \[loginStartupBarWindow, primaryBubbleWindow\];/,
  "resolveLoginStartupWindows must pair the bar with one enabled primary bubble.",
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
  /openWidgetWindowWithRetry\(barWindow, selectedRoomId, shouldContinueLaunch\)/,
  "launchTauriAuthenticatedSurfaces must open the Bubli bar first with retry.",
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
  widgetPage,
  /if \(!isTauri \|\| !authReady \|\| hasAuthSession\) return;[\s\S]*closeWidgetWindow/,
  "Desktop widget windows must close themselves when the restored Tauri auth session is missing.",
);
assertContains(
  widgetPage,
  /if \(!isTauri \|\| !mounted \|\| !widgetSessionReady \|\| appReadySentRef\.current\) return;[\s\S]*tauriCommands\.appReady/,
  "Desktop widget windows must send appReady only after mount and a valid widget session.",
);
assertContains(
  widgetPage,
  /listenWidgetRoomContextChanged\(\(payload\) => \{[\s\S]*syncActiveProjectRoomFromWidgetContext\(roomId\)/,
  "Desktop widget windows must sync room-context changes back through the shared active-room service.",
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
