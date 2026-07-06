"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { authApi } from "@/features/auth/api/authApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { getStoredAuthSession, setStoredAuthSessionAndWaitForTauriMirror } from "@/lib/auth/auth-session";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import {
  clearActiveProjectRoomId,
  getActiveProjectRoomId,
  restoreActiveProjectRoomFromTauri,
  seedActiveProjectRoomId,
} from "@/lib/workspace-active-room";
import type { WidgetBubbleSettingResponse, WidgetBubbleType as ApiWidgetBubbleType } from "@/types/api/widget";

let launchRequested = false;
let launchPromise: Promise<void> | null = null;
let launchGeneration = 0;
let launchInFlightRoomId: string | null = null;
let queuedLaunchOptions: LaunchTauriAuthenticatedSurfacesOptions | null = null;
let queuedLaunchPromise: Promise<void> | null = null;
let launchedAuthenticatedSurfaces = false;
let lastAutoLaunchFailure: { failedAtMs: number; key: string } | null = null;

const AUTO_LAUNCH_FAILURE_COOLDOWN_MS = 15_000;

export type TauriAuthenticatedSurfaceLaunchTimeline = {
  authGateAfterBackendAuth?: boolean;
  authGateEnabledAt?: string;
  barWindowOpenedAt?: string;
  backendAuthValidationSource?: "caller" | "launcher";
  backendAuthValidatedAt?: string;
  bubbleWindowsOpenedAt?: string;
  completed: boolean;
  firstWidgetOpenAfterBackendAuth?: boolean;
  launchCompletedAt?: string;
  launchStartedAt?: string;
  lastError?: string;
  retrySuppressedAt?: string;
  retrySuppressedUntil?: string;
  reusedExistingWindowsAt?: string;
  selectedRoomResolvedAt?: string;
  sessionMirrorStoredAt?: string;
  startupWindowsResolvedAt?: string;
  stoppedAt?: string;
  syncLoopsStartedAt?: string;
};

type LaunchTauriAuthenticatedSurfacesOptions = {
  retryPolicy?: "cooldown" | "force";
  sessionAlreadyValidated?: boolean;
  selectedRoomId?: string | null;
};

let lastLaunchTimeline: TauriAuthenticatedSurfaceLaunchTimeline = { completed: false };

function nowIso() {
  return new Date().toISOString();
}

function autoLaunchFailureKey(userId: string | undefined, selectedRoomId: string | null) {
  return `${userId ?? "anonymous"}:${selectedRoomId ?? "personal"}`;
}

function shouldApplyAutoLaunchCooldown(options: LaunchTauriAuthenticatedSurfacesOptions) {
  return options.retryPolicy === "cooldown";
}

function shouldSuppressAutoLaunchRetry(key: string) {
  if (!lastAutoLaunchFailure || lastAutoLaunchFailure.key !== key) {
    return false;
  }

  return Date.now() - lastAutoLaunchFailure.failedAtMs < AUTO_LAUNCH_FAILURE_COOLDOWN_MS;
}

function retrySuppressedUntilIso(failedAtMs: number) {
  return new Date(failedAtMs + AUTO_LAUNCH_FAILURE_COOLDOWN_MS).toISOString();
}

function requestedLaunchRoomId(options: LaunchTauriAuthenticatedSurfacesOptions) {
  return options.selectedRoomId?.trim() || null;
}

export function readTauriAuthenticatedSurfacesLaunchTimeline(): TauriAuthenticatedSurfaceLaunchTimeline {
  return { ...lastLaunchTimeline };
}

const loginStartupBarWindow: WidgetWindowOpenInput = { bubbleType: "bar", mode: "DEFAULT", windowId: "bar" };
// 원형 오브 메뉴 창도 로그인 시 함께 띄운다 — 인라인 바 메뉴와 공존한다(팀 재논의로 PR 429의 제거를 되돌림).
const loginStartupMenuWindow: WidgetWindowOpenInput = { bubbleType: "menu", mode: "DEFAULT", windowId: "menu" };
const loginStartupWindows: WidgetWindowOpenInput[] = [
  loginStartupBarWindow,
  loginStartupMenuWindow,
  { bubbleType: "agent", mode: "DEFAULT", windowId: "agent" },
  { bubbleType: "alert", mode: "DEFAULT", windowId: "alert" },
  { bubbleType: "chat", mode: "DEFAULT", windowId: "chat" },
  { bubbleType: "memo", mode: "DEFAULT", windowId: "memo" },
  { bubbleType: "schedule", mode: "DEFAULT", windowId: "schedule" },
  { bubbleType: "timer", mode: "DEFAULT", windowId: "timer" },
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
];
const backendBubbleToLocal: Record<ApiWidgetBubbleType, Exclude<WidgetBubbleType, "bar" | "menu">> = {
  AGENT: "agent",
  ALERT: "alert",
  CHAT: "chat",
  MEMO: "memo",
  RESOURCE: "resource",
  SCHEDULE: "schedule",
  TIMER: "timer",
  TODO: "todo",
};

const widgetOpenCommandTimeoutMs = 8_000;
const widgetOpenRetryAttempts = 2;
const widgetOpenRetryDelayMs = 650;

type WidgetOpenResult =
  | { input: WidgetWindowOpenInput; status: "fulfilled" }
  | { input: WidgetWindowOpenInput; reason: unknown; status: "rejected" };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Tauri widget open timed out")), timeoutMs)),
  ]);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function widgetTargetFromInput(input: WidgetWindowOpenInput) {
  return {
    bubbleType: input.bubbleType,
    windowId: input.windowId ?? input.bubbleType,
  };
}

function startupWindowRequiresVisibleWindow(input: WidgetWindowOpenInput) {
  return input.mode !== "MINIMIZED";
}

async function authenticatedStartupWindowsReady(startupWindows: WidgetWindowOpenInput[]) {
  for (const input of startupWindows) {
    if (!startupWindowRequiresVisibleWindow(input)) continue;

    try {
      const state = await tauriCommands.getWidgetWindowState(widgetTargetFromInput(input));
      if (!state.windowVisible) return false;
    } catch {
      return false;
    }
  }

  return true;
}

async function openWidgetWindowWithRetry(
  input: WidgetWindowOpenInput,
  selectedRoomId: string | null,
  shouldContinue: () => boolean,
): Promise<WidgetOpenResult> {
  let lastReason: unknown = null;

  for (let attempt = 0; attempt <= widgetOpenRetryAttempts; attempt += 1) {
    if (!shouldContinue()) {
      return { input, reason: new Error("Tauri widget launch cancelled"), status: "rejected" };
    }

    try {
      await withTimeout(tauriCommands.openWidgetWindow({ ...input, selectedRoomId }), widgetOpenCommandTimeoutMs);
      return { input, status: "fulfilled" };
    } catch (reason) {
      lastReason = reason;
      if (attempt < widgetOpenRetryAttempts && shouldContinue()) {
        await delay(widgetOpenRetryDelayMs);
      }
    }
  }

  return { input, reason: lastReason, status: "rejected" };
}

async function openWidgetWindowsWithRetry(
  inputs: WidgetWindowOpenInput[],
  selectedRoomId: string | null,
  shouldContinue: () => boolean,
): Promise<WidgetOpenResult[]> {
  if (inputs.length === 0) return [];
  let lastReason: unknown = null;
  const windows = inputs.map((input) => ({ ...input, selectedRoomId }));

  for (let attempt = 0; attempt <= widgetOpenRetryAttempts; attempt += 1) {
    if (!shouldContinue()) {
      return inputs.map((input) => ({
        input,
        reason: new Error("Tauri widget launch cancelled"),
        status: "rejected" as const,
      }));
    }

    try {
      await withTimeout(tauriCommands.openWidgetWindows({ windows }), widgetOpenCommandTimeoutMs);
      return inputs.map((input) => ({ input, status: "fulfilled" as const }));
    } catch (reason) {
      lastReason = reason;
      if (attempt < widgetOpenRetryAttempts && shouldContinue()) {
        await delay(widgetOpenRetryDelayMs);
      }
    }
  }

  return inputs.map((input) => ({ input, reason: lastReason, status: "rejected" as const }));
}

function getVisibleLoginStartupModeFromSetting(setting: WidgetBubbleSettingResponse): WidgetWindowMode {
  // Login startup opens enabled widgets visibly; minimized mode is restored through widget bar/settings flows.
  if (setting.ghostMode) return "GHOST";
  if (setting.opacity !== null && setting.opacity !== undefined && setting.opacity < 0.95) {
    return "TRANSLUCENT";
  }
  return "DEFAULT";
}

function getLoginStartupBubbles(settings: WidgetBubbleSettingResponse[]): WidgetWindowOpenInput[] {
  const enabledByBubble = new Map<Exclude<WidgetBubbleType, "bar" | "menu">, WidgetBubbleSettingResponse>();
  const sortedStartupBubbles: Array<
    WidgetWindowOpenInput & {
      bubbleType: Exclude<WidgetBubbleType, "bar" | "menu">;
    }
  > = [];

  for (const startupWindow of loginStartupWindows) {
    if (startupWindow.bubbleType === undefined || startupWindow.bubbleType === "bar" || startupWindow.bubbleType === "menu") {
      continue;
    }

    const bubbleWithType = startupWindow as WidgetWindowOpenInput & {
      bubbleType: Exclude<WidgetBubbleType, "bar" | "menu">;
    };
    sortedStartupBubbles.push(bubbleWithType);
  }

  for (const setting of settings) {
    if (!setting.enabled) continue;
    const localType = backendBubbleToLocal[setting.bubbleType];
    if (!localType) continue;
    enabledByBubble.set(localType, setting);
  }

  if (enabledByBubble.size === 0) return [];

  const startupBubbles: WidgetWindowOpenInput[] = [loginStartupMenuWindow];
  for (const bubble of sortedStartupBubbles) {
    const setting = enabledByBubble.get(bubble.bubbleType);
    if (!setting) continue;
    startupBubbles.push({
      bubbleType: bubble.bubbleType,
      mode: getVisibleLoginStartupModeFromSetting(setting),
      windowId: bubble.windowId,
    });
  }

  return startupBubbles;
}

export async function resolveLoginStartupWindows(): Promise<WidgetWindowOpenInput[]> {
  const settings = await widgetApi.getSettings().catch(() => null);
  if (!settings) {
    return loginStartupWindows;
  }

  const startupBubbles = getLoginStartupBubbles(settings.bubbles);
  if (startupBubbles.length === 0) return loginStartupWindows;

  return [loginStartupBarWindow, ...startupBubbles];
}

async function resolveLaunchSelectedRoomId() {
  const context = await widgetApi.getContext().catch(() => null);
  if (context?.selectedRoomId) {
    seedActiveProjectRoomId(context.selectedRoomId);
    await tauriCommands
      .storeActiveProjectRoom({ roomId: context.selectedRoomId, roomLabel: null })
      .catch(() => undefined);
    return context.selectedRoomId;
  }

  const activeRoomId = getActiveProjectRoomId();
  if (activeRoomId) return activeRoomId;

  const restored = await restoreActiveProjectRoomFromTauri().catch(() => null);
  if (restored?.roomId) {
    await widgetApi.updateContext({ selectedRoomId: restored.roomId }).catch(() => undefined);
    return restored.roomId;
  }

  const roomPage = await projectRoomApi.list().catch(() => null);
  const firstRoom = roomPage?.items[0];
  if (firstRoom?.id) {
    seedActiveProjectRoomId(firstRoom.id, firstRoom.name);
    await tauriCommands
      .storeActiveProjectRoom({ roomId: firstRoom.id, roomLabel: firstRoom.name })
      .catch(() => undefined);
    await widgetApi.updateContext({ selectedRoomId: firstRoom.id }).catch(() => undefined);
    return firstRoom.id;
  }

  return null;
}

export function launchTauriAuthenticatedSurfaces(options: LaunchTauriAuthenticatedSurfacesOptions = {}): Promise<void> {
  if (!isTauriRuntime()) return Promise.resolve();
  const requestedRoomId = requestedLaunchRoomId(options);
  if (launchRequested && launchPromise) {
    if (!requestedRoomId || launchInFlightRoomId === requestedRoomId) {
      return launchPromise;
    }
    queuedLaunchOptions = options;
    if (queuedLaunchPromise) return queuedLaunchPromise;

    const supersededLaunchPromise = launchPromise;
    launchGeneration += 1;
    queuedLaunchPromise = supersededLaunchPromise
      .catch(() => undefined)
      .then((): Promise<void> => {
        const nextOptions = queuedLaunchOptions ?? options;
        queuedLaunchOptions = null;
        queuedLaunchPromise = null;
        if (launchPromise === supersededLaunchPromise) {
          launchRequested = false;
          launchPromise = null;
          launchInFlightRoomId = null;
        }
        return launchTauriAuthenticatedSurfaces(nextOptions);
      });
    return queuedLaunchPromise;
  }

  launchRequested = true;
  const generation = ++launchGeneration;
  launchInFlightRoomId = requestedRoomId;
  launchPromise = (async () => {
    const launchStartedAt = nowIso();
    const timeline: TauriAuthenticatedSurfaceLaunchTimeline = {
      completed: false,
      launchStartedAt,
    };
    lastLaunchTimeline = timeline;

    const initialSession = getStoredAuthSession();
    if (!initialSession) {
      throw new Error("Tauri authenticated surfaces require a stored auth session");
    }

    if (!options.sessionAlreadyValidated) {
      await authApi.getMe();
    }
    timeline.backendAuthValidationSource = options.sessionAlreadyValidated ? "caller" : "launcher";
    timeline.backendAuthValidatedAt = nowIso();

    const verifiedSession = getStoredAuthSession() ?? initialSession;
    if (verifiedSession) {
      await setStoredAuthSessionAndWaitForTauriMirror(verifiedSession);
    }
    timeline.sessionMirrorStoredAt = nowIso();

    const startupWindows = await resolveLoginStartupWindows();
    timeline.startupWindowsResolvedAt = nowIso();
    const selectedRoomId = Object.prototype.hasOwnProperty.call(options, "selectedRoomId")
      ? options.selectedRoomId ?? null
      : await resolveLaunchSelectedRoomId();
    launchInFlightRoomId = selectedRoomId?.trim() || launchInFlightRoomId;
    timeline.selectedRoomResolvedAt = nowIso();
    const launchFailureKey = autoLaunchFailureKey(verifiedSession?.user.id ?? initialSession.user.id, selectedRoomId);
    const applyAutoLaunchCooldown = shouldApplyAutoLaunchCooldown(options);
    if (applyAutoLaunchCooldown && shouldSuppressAutoLaunchRetry(launchFailureKey)) {
      launchRequested = false;
      timeline.retrySuppressedAt = nowIso();
      timeline.retrySuppressedUntil = retrySuppressedUntilIso(lastAutoLaunchFailure?.failedAtMs ?? Date.now());
      timeline.lastError = "Suppressed repeated Tauri widget auto-launch after a recent partial failure";
      return;
    }
    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    if (launchedAuthenticatedSurfaces) {
      const ready = await authenticatedStartupWindowsReady(startupWindows);
      if (ready) {
        await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true }).catch(() => undefined);
        timeline.authGateEnabledAt = nowIso();
        timeline.authGateAfterBackendAuth = Boolean(
          timeline.backendAuthValidatedAt &&
            new Date(timeline.authGateEnabledAt).getTime() >= new Date(timeline.backendAuthValidatedAt).getTime(),
        );
        if (generation !== launchGeneration) {
          await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
          await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
          return;
        }
        startActivityAutoCapture();
        startManagedFolderAutoSync();
        startWidgetUsageAutoSync();
        timeline.completed = true;
        timeline.reusedExistingWindowsAt = nowIso();
        timeline.barWindowOpenedAt = timeline.reusedExistingWindowsAt;
        timeline.bubbleWindowsOpenedAt = timeline.reusedExistingWindowsAt;
        timeline.firstWidgetOpenAfterBackendAuth = Boolean(
          timeline.backendAuthValidatedAt &&
            new Date(timeline.reusedExistingWindowsAt).getTime() >=
              new Date(timeline.backendAuthValidatedAt).getTime(),
        );
        timeline.syncLoopsStartedAt = timeline.reusedExistingWindowsAt;
        timeline.launchCompletedAt = timeline.reusedExistingWindowsAt;
        return;
      }

      launchedAuthenticatedSurfaces = false;
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
    }

    await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: true });
    timeline.authGateEnabledAt = nowIso();
    timeline.authGateAfterBackendAuth = Boolean(
      timeline.backendAuthValidatedAt &&
        new Date(timeline.authGateEnabledAt).getTime() >= new Date(timeline.backendAuthValidatedAt).getTime(),
    );

    const [barWindow, ...bubbleWindows] = startupWindows;
    const openedWindows: WidgetWindowOpenInput[] = [];
    const rejectedReasons: unknown[] = [];
    const shouldContinueLaunch = () => generation === launchGeneration;

    if (barWindow) {
      if (generation !== launchGeneration) {
        await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
        await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
        return;
      }

      const barResult = await openWidgetWindowWithRetry(barWindow, selectedRoomId, shouldContinueLaunch);
      if (barResult.status === "fulfilled") {
        openedWindows.push(barWindow);
        timeline.barWindowOpenedAt = nowIso();
        timeline.firstWidgetOpenAfterBackendAuth = Boolean(
          timeline.backendAuthValidatedAt &&
            new Date(timeline.barWindowOpenedAt).getTime() >= new Date(timeline.backendAuthValidatedAt).getTime(),
        );
      } else {
        rejectedReasons.push(barResult.reason);
      }
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    const bubbleResults = await openWidgetWindowsWithRetry(bubbleWindows, selectedRoomId, shouldContinueLaunch);
    timeline.bubbleWindowsOpenedAt = nowIso();
    for (const result of bubbleResults) {
      if (result.status === "fulfilled") {
        openedWindows.push(result.input);
        timeline.firstWidgetOpenAfterBackendAuth ??= Boolean(
          timeline.backendAuthValidatedAt &&
            new Date(timeline.bubbleWindowsOpenedAt).getTime() >= new Date(timeline.backendAuthValidatedAt).getTime(),
        );
      } else {
        rejectedReasons.push(result.reason);
      }
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    if (openedWindows.length < startupWindows.length) {
      if (applyAutoLaunchCooldown) {
        lastAutoLaunchFailure = { failedAtMs: Date.now(), key: launchFailureKey };
      }
      launchRequested = false;
      launchedAuthenticatedSurfaces = false;
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      throw rejectedReasons[0] ?? new Error("Some Tauri widgets failed to open after login");
    }

    void tauriCommands
      .seedWidgetBarItems({ selectedRoomId })
      .catch(() => undefined);

    for (const input of openedWindows) {
      const bubbleType = input.bubbleType;
      if (!bubbleType || bubbleType === "bar" || bubbleType === "menu") continue;
      void tauriCommands
        .recordWidgetUsageEvent({
          bubbleType,
          eventType: "open:auto-login",
          occurredAt: new Date().toISOString(),
        })
        .catch(() => undefined);
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    startActivityAutoCapture();
    startManagedFolderAutoSync();
    startWidgetUsageAutoSync();
    timeline.syncLoopsStartedAt = nowIso();
    // All requested windows opened; this login cycle is active.
    // Partial launches are cleaned up above so bar-only startup cannot hide a
    // failed bubble batch.
    launchedAuthenticatedSurfaces = true;
    lastAutoLaunchFailure = null;
    launchRequested = true;
    timeline.completed = true;
    timeline.launchCompletedAt = nowIso();
  })()
    .catch(async (error) => {
      launchRequested = false;
      lastLaunchTimeline = {
        ...lastLaunchTimeline,
        completed: false,
        lastError: error instanceof Error ? error.message : String(error),
      };
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      throw error;
    })
    .finally(() => {
      if (generation === launchGeneration) {
        launchPromise = null;
        launchInFlightRoomId = null;
      }
    });

  return launchPromise;
}

export async function stopTauriAuthenticatedSurfaces() {
  launchGeneration += 1;
  launchRequested = false;
  launchPromise = null;
  launchInFlightRoomId = null;
  queuedLaunchOptions = null;
  queuedLaunchPromise = null;
  launchedAuthenticatedSurfaces = false;
  lastAutoLaunchFailure = null;
  lastLaunchTimeline = {
    ...lastLaunchTimeline,
    completed: false,
    stoppedAt: nowIso(),
  };
  await stopActivityAutoCapture({ flush: true });
  await stopManagedFolderAutoSync({ flush: true });
  await stopWidgetUsageAutoSync({ flush: true });

  if (!isTauriRuntime()) return;

  clearActiveProjectRoomId();
  await tauriCommands.clearActiveProjectRoom().catch(() => undefined);
  await tauriCommands.setWidgetRoomContext({ selectedRoomId: null }).catch(() => undefined);
  await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
  await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
}
