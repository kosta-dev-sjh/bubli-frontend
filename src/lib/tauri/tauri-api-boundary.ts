// BUBLI-82: Tauri IPC <-> server API responsibility map (reference constants only).
//
// Tauri does not replace the server API. It is the member web app in a WebView
// plus a local-feature shell. Local-only concerns stay in Tauri IPC; anything
// shared between web and app goes through the server API. Neither the frontend
// nor Tauri calls the agent server directly.
//
// This file imports command names from commands.ts for reference only; it does
// not modify the IPC contract.

import { TAURI_COMMANDS } from "@/lib/tauri/commands";

/** Concerns that live only on the device. */
export const LOCAL_ONLY_RESPONSIBILITIES = [
  "Desktop auth session mirror and restore trigger",
  "SQLite cache (chat cache, widget usage detail, activity focus/buffer, sync outbox)",
  "Personal managed-folder detection and local file index",
  "Activity context capture (app name, window title, dwell time) with consent",
  "Widget window state (mode, position, always-on-top, click-through)",
  "Tray and dock orb",
  "Timer recovery state and crash recovery",
] as const;

/** Concerns that must go through the server API (shared by web and app). */
export const SERVER_API_RESPONSIBILITIES = [
  "Project rooms and members",
  "Shared resource upload (server + S3) and permissions",
  "WBS and TODO",
  "Schedules",
  "Communication (chat, notifications, voice tokens)",
  "Agent requests (always via the API server, never the agent server directly)",
] as const;

export type IpcBoundaryRow = {
  ipc: string;
  responsibility: string;
  reflectsToServer: boolean;
  serverApi: string | null;
};

/** Per-IPC responsibility and whether/where it reflects to the server. */
export const ipcServerBoundary: readonly IpcBoundaryRow[] = [
  // Auth session mirror: local restore only. Server auth stays in authApi/apiRequest.
  {
    ipc: TAURI_COMMANDS.storeTauriAuthSession,
    responsibility: "Mirror the authenticated web session into local SQLite for app restart recovery",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.readTauriAuthSession,
    responsibility: "Restore the local mirrored auth session before app shell API calls",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.clearTauriAuthSession,
    responsibility: "Remove the local mirrored auth session on logout or expired refresh token",
    reflectsToServer: false,
    serverApi: null,
  },
  // Widget window state: local only.
  {
    ipc: TAURI_COMMANDS.openWidgetWindow,
    responsibility: "Open/focus the desktop widget window",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.setWidgetWindowMode,
    responsibility: "Default / translucent / ghost / minimized mode",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.setWidgetWindowPosition,
    responsibility: "Remember widget position",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.setWidgetAlwaysOnTop,
    responsibility: "Always-on-top toggle",
    reflectsToServer: false,
    serverApi: null,
  },
  // BUBLI-41 widget usage: local detail -> local rollup -> staged for server summary.
  {
    ipc: TAURI_COMMANDS.recordWidgetUsageEvent,
    responsibility: "Record widget usage detail event (kept on device)",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.rollupWidgetUsage,
    responsibility: "Compress detail events into per-date rollups",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.syncWidgetUsageSummary,
    responsibility: "Stage rollups for server reflection",
    reflectsToServer: true,
    serverApi: "/api/widget/usage-summaries",
  },
  // BUBLI-44 activity context: local capture, server reflect of consented data.
  {
    ipc: TAURI_COMMANDS.readActivityContext,
    responsibility: "Read current app/window/dwell (consent-gated)",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.recordActivityContext,
    responsibility: "Store consent-gated activity capture in local SQLite before server reflection",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.markActivityContextSynced,
    responsibility: "Mark a local activity capture as reflected or failed after API sync",
    reflectsToServer: true,
    serverApi: "/api/activity/current-app",
  },
  {
    ipc: TAURI_COMMANDS.stageActivityContextsForSync,
    responsibility: "Stage failed or local-only activity captures for API retry",
    reflectsToServer: true,
    serverApi: "/api/activity/current-app",
  },
  // BUBLI-43 personal managed folder: local index, only approved items reach server.
  {
    ipc: TAURI_COMMANDS.selectManagedFolder,
    responsibility: "Register a personal managed folder",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.scanManagedFolder,
    responsibility: "Scan folder, build local index and change events",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.watchManagedFolder,
    responsibility: "Watch folder for changes, update the local index, and emit refresh events",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.searchLocalFiles,
    responsibility: "Search the local file index",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.openLocalFile,
    responsibility: "Open only a locally indexed personal file by id with the OS default app",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.readLocalFilePreview,
    responsibility: "Read a bounded preview for a locally indexed personal file",
    reflectsToServer: false,
    serverApi: null,
  },
  {
    ipc: TAURI_COMMANDS.flushSyncOutbox,
    responsibility: "Report/flush server-reflect backlog",
    reflectsToServer: true,
    serverApi: "/api/local-file-events/sync",
  },
  // Chat cache: server is the source of truth.
  {
    ipc: TAURI_COMMANDS.syncRoomMessages,
    responsibility: "Mirror server chat into the local room cache",
    reflectsToServer: false,
    serverApi: "/api/chat/rooms/{id}/messages",
  },
  // Timer recovery: compares against server time_logs.
  {
    ipc: TAURI_COMMANDS.recoverTimerState,
    responsibility: "Compare local timer state with server on restart",
    reflectsToServer: true,
    serverApi: "/api/time-logs/{id}/heartbeat",
  },
] as const;
