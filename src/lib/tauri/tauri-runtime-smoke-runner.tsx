"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession } from "@/lib/auth/auth-session";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

type SmokeCheck = {
  detail?: unknown;
  name: string;
};

type SmokeReport = {
  checks: SmokeCheck[];
  durationMs: number;
  error?: string;
  finishedAt: string;
  platform: string;
  status: "passed" | "failed" | "skipped";
};

const smokeEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const smokeReportUrl = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_REPORT_URL;
const smokeFolderPath = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_FOLDER;
const smokeRoomId =
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_ROOM_ID ??
  "22222222-2222-4222-8222-222222222222";
const smokeShouldQuit = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_QUIT === "true";

function isoAfter(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isWindowsRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("windows");
}

function seedDevAuthSession() {
  if (process.env.NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN !== "true") return;

  const accessToken = process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN;
  if (!accessToken) return;

  clearStoredAuthSession();
  setStoredAuthSession({
    accessToken,
    clientType: "TAURI",
    expiresAt: isoAfter(55 * 60),
    expiresIn: 55 * 60,
    refreshToken: `dev-refresh-token:${Date.now()}`,
    refreshTokenExpiresAt: isoAfter(2 * 60 * 60),
    tokenType: "Bearer",
    user: {
      bubliId: "codex-widget",
      id: "11111111-1111-4111-8111-111111111111",
      locale: "ko-KR",
      name: "Codex Widget User",
      timezone: "Asia/Seoul",
    },
  });
}

async function postReport(report: SmokeReport) {
  if (!smokeReportUrl) return;

  await fetch(smokeReportUrl, {
    body: JSON.stringify(report),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
}

async function runSmoke() {
  const startedAt = Date.now();
  const checks: SmokeCheck[] = [];
  const addCheck = (name: string, detail?: unknown) => checks.push({ detail, name });
  const assert = (condition: unknown, name: string, detail?: unknown) => {
    if (!condition) {
      throw new Error(`${name}${detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
    }
    addCheck(name, detail);
  };

  try {
    if (!isTauriRuntime()) {
      await postReport({
        checks,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        platform: "browser",
        status: "skipped",
      });
      return;
    }

    if (!isWindowsRuntime()) {
      await postReport({
        checks,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date().toISOString(),
        platform: navigator.userAgent,
        status: "skipped",
      });
      return;
    }

    await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
    seedDevAuthSession();
    assert(getStoredAuthSession(), "tauri auth session is available");

    await tauriCommands.storeActiveProjectRoom({
      roomId: smokeRoomId,
      roomLabel: "Codex Runtime Smoke",
    });
    await tauriCommands.setWidgetRoomContext({ selectedRoomId: smokeRoomId });
    const restoredRoom = await tauriCommands.readActiveProjectRoom();
    assert(restoredRoom?.roomId === smokeRoomId, "active project room persisted to SQLite", restoredRoom);

    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    const windows = await tauriCommands.openWidgetWindows({
      windows: [
        { bubbleType: "bar", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "bar" },
        { bubbleType: "todo", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "todo" },
        { bubbleType: "chat", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "chat" },
        { bubbleType: "timer", mode: "DEFAULT", selectedRoomId: smokeRoomId, windowId: "timer" },
      ],
    });
    assert(windows.length >= 4, "native widget windows opened", windows.map((window) => window.windowId));

    await tauriCommands.setWidgetRoomContext({ selectedRoomId: smokeRoomId });
    const todoWindow = await tauriCommands.getWidgetWindowState({ windowId: "todo" });
    assert(todoWindow.windowVisible, "todo widget window visible", todoWindow);
    assert(todoWindow.selectedRoomId === smokeRoomId, "widget room context propagated", todoWindow);

    const sqlite = await tauriCommands.checkLocalSqliteIntegrity();
    assert(sqlite.ok, "local SQLite quick_check passed", sqlite);

    await tauriCommands.setActivityContextConsent({ enabled: true });
    const foreground = await tauriCommands.readActivityContext();
    assert(foreground.appName.trim().length > 0, "native foreground activity captured", foreground);
    const now = new Date();
    const activity = await tauriCommands.recordActivityContext({
      appName: foreground.appName,
      capturedAt: now.toISOString(),
      durationSeconds: 60,
      endedAt: now.toISOString(),
      roomId: smokeRoomId,
      startedAt: new Date(now.getTime() - 60_000).toISOString(),
      windowTitle: foreground.windowTitle ?? "Windows runtime smoke",
    });
    const stagedActivity = await tauriCommands.stageActivityContextsForSync({ limit: 5 });
    assert(
      stagedActivity.activities.some((item) => item.localActivityId === activity.localActivityId),
      "activity capture staged from SQLite",
      stagedActivity,
    );

    await tauriCommands.recordWidgetUsageEvent({
      bubbleType: "todo",
      eventType: "runtime-smoke:click",
      itemId: "codex-runtime-smoke",
      itemType: "TASK",
      occurredAt: new Date().toISOString(),
    });
    const rollups = await tauriCommands.rollupWidgetUsage();
    assert(rollups.some((rollup) => rollup.bubbleType === "todo"), "widget usage rollup created", rollups);

    if (smokeFolderPath) {
      const folder = await tauriCommands.selectManagedFolder({ path: smokeFolderPath });
      await tauriCommands.setFolderSync({ enabled: true, localFolderId: folder.localFolderId });
      const scan = await tauriCommands.scanManagedFolder({ localFolderId: folder.localFolderId });
      assert(scan.changedCount >= 1, "managed folder scan indexed temp file", scan);

      const search = await tauriCommands.searchLocalFiles({ limit: 5, query: "runtime smoke" });
      assert(search.items.length >= 1, "local file search returned indexed temp file", search);

      const preview = await tauriCommands.readLocalFilePreview({
        localFileId: search.items[0].localFileId,
        maxChars: 500,
      });
      assert(preview.status === "READY", "local file preview is readable", preview);

      const stagedFiles = await tauriCommands.stageLocalFileEventsForSync({
        limit: 10,
        localFolderId: folder.localFolderId,
      });
      assert(stagedFiles.events.length >= 1, "local file events staged for backend sync", stagedFiles);
    }

    const closedCount = await tauriCommands.closeAllWidgetWindows();
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false });
    addCheck("widget windows cleaned up", { closedCount });

    await postReport({
      checks,
      durationMs: Date.now() - startedAt,
      finishedAt: new Date().toISOString(),
      platform: navigator.userAgent,
      status: "passed",
    });
  } catch (error) {
    await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
    await postReport({
      checks,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date().toISOString(),
      platform: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      status: "failed",
    });
  } finally {
    if (smokeShouldQuit) {
      await tauriCommands.quitApp().catch(() => undefined);
    }
  }
}

export function TauriRuntimeSmokeRunner() {
  const pathname = usePathname();
  const isDesktopWidgetSurface = pathname === "/desktop-widget" || pathname.startsWith("/desktop-widget/");

  useEffect(() => {
    if (!smokeEnabled || isDesktopWidgetSurface) return;

    const timer = window.setTimeout(() => {
      void runSmoke();
    }, 1_500);

    return () => window.clearTimeout(timer);
  }, [isDesktopWidgetSurface]);

  return null;
}
