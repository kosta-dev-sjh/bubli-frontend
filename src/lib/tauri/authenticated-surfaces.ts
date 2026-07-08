"use client";

import { startActivityAutoCapture, stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { startManagedFolderAutoSync, stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { authApi } from "@/features/auth/api/authApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { readDesktopWidgetStartupPreference } from "@/features/onboarding/lib/onboarding-storage";
import { getStoredAuthSession, setStoredAuthSessionAndWaitForTauriMirror } from "@/lib/auth/auth-session";
import { tauriCommands, type WidgetWindowOpenInput } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { readTauriStartupOptimizationConfig } from "@/lib/tauri/startup-optimization";
import { readWidgetSummary } from "@/lib/widget";
import { startWidgetUsageAutoSync, stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";
import {
  clearActiveProjectRoomId,
  getActiveProjectRoomId,
  restoreActiveProjectRoomFromTauri,
  seedActiveProjectRoomId,
} from "@/lib/workspace-active-room";

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
  summaryPrewarmCompletedAt?: string;
  summaryPrewarmFailedAt?: string;
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
const loginStartupAgentOrbWindow: WidgetWindowOpenInput = { bubbleType: "menu", mode: "DEFAULT", windowId: "menu" };
const loginStartupBubbleWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
  { bubbleType: "agent", mode: "DEFAULT", windowId: "agent" },
  { bubbleType: "chat", mode: "DEFAULT", windowId: "chat" },
  { bubbleType: "timer", mode: "DEFAULT", windowId: "timer" },
  { bubbleType: "memo", mode: "DEFAULT", windowId: "memo" },
  { bubbleType: "schedule", mode: "DEFAULT", windowId: "schedule" },
  { bubbleType: "alert", mode: "DEFAULT", windowId: "alert" },
];
const loginStartupWindows: WidgetWindowOpenInput[] = [
  loginStartupBarWindow,
  loginStartupAgentOrbWindow,
  ...loginStartupBubbleWindows,
];
const desktopWidgetBoardWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
  { bubbleType: "agent", mode: "DEFAULT", windowId: "agent" },
  { bubbleType: "schedule", mode: "DEFAULT", windowId: "schedule" },
  { bubbleType: "timer", mode: "DEFAULT", windowId: "timer" },
];
const desktopWidgetCascadeWindows: WidgetWindowOpenInput[] = [
  { bubbleType: "todo", mode: "DEFAULT", windowId: "todo" },
  { bubbleType: "agent", mode: "DEFAULT", windowId: "agent" },
  { bubbleType: "timer", mode: "DEFAULT", windowId: "timer" },
];

type WidgetOpenResult =
  | { input: WidgetWindowOpenInput; status: "fulfilled" }
  | { input: WidgetWindowOpenInput; reason: unknown; status: "rejected" };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message = "Tauri async operation timed out") {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), timeoutMs)),
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

async function prewarmWidgetSummaryCache(selectedRoomId: string | null): Promise<boolean> {
  const startupConfig = await readTauriStartupOptimizationConfig();
  if (startupConfig.summaryPrewarmTimeoutMs <= 0) return false;

  const result = await withTimeout(
    readWidgetSummary({ preferLocalCache: false, selectedRoomId }),
    startupConfig.summaryPrewarmTimeoutMs,
    "Tauri widget summary prewarm timed out",
  ).catch(() => null);

  return result?.status === "ready";
}

function startupWindowRequiresVisibleWindow(input: WidgetWindowOpenInput) {
  return input.mode !== "MINIMIZED" && input.bubbleType !== "menu";
}

function startupWindowStateIsReady(
  input: WidgetWindowOpenInput,
  state: Awaited<ReturnType<typeof tauriCommands.getWidgetWindowState>>,
) {
  if (input.bubbleType === "bar") return state.windowVisible;
  if (input.mode === "MINIMIZED") return state.mode === "MINIMIZED" && !state.windowVisible;
  return state.windowVisible && state.mode !== "MINIMIZED";
}

async function authenticatedStartupWindowsReady(startupWindows: WidgetWindowOpenInput[]) {
  for (const input of startupWindows) {
    if (!startupWindowRequiresVisibleWindow(input)) continue;

    try {
      const state = await tauriCommands.getWidgetWindowState(widgetTargetFromInput(input));
      if (!startupWindowStateIsReady(input, state)) return false;
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
  const startupConfig = await readTauriStartupOptimizationConfig();

  for (let attempt = 0; attempt <= startupConfig.retryAttempts; attempt += 1) {
    if (!shouldContinue()) {
      return { input, reason: new Error("Tauri widget launch cancelled"), status: "rejected" };
    }

    try {
      await withTimeout(
        tauriCommands.openWidgetWindow({ ...input, selectedRoomId }),
        startupConfig.openCommandTimeoutMs,
        "Tauri widget open timed out",
      );
      return { input, status: "fulfilled" };
    } catch (reason) {
      lastReason = reason;
      if (attempt < startupConfig.retryAttempts && shouldContinue()) {
        await delay(startupConfig.retryDelayMs);
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
  const startupConfig = await readTauriStartupOptimizationConfig();

  for (let attempt = 0; attempt <= startupConfig.retryAttempts; attempt += 1) {
    if (!shouldContinue()) {
      return inputs.map((input) => ({
        input,
        reason: new Error("Tauri widget launch cancelled"),
        status: "rejected" as const,
      }));
    }

    try {
      if (startupConfig.bubbleOpenStaggerMs > 0) {
        for (const input of inputs) {
          if (!shouldContinue()) throw new Error("Tauri widget launch cancelled");
          await withTimeout(
            tauriCommands.openWidgetWindow({ ...input, selectedRoomId }),
            startupConfig.openCommandTimeoutMs,
            "Tauri widget open timed out",
          );
          await delay(startupConfig.bubbleOpenStaggerMs);
        }
      } else {
        const windows = inputs.map((input) => ({ ...input, selectedRoomId }));
        await withTimeout(tauriCommands.openWidgetWindows({ windows }), startupConfig.openCommandTimeoutMs, "Tauri widget open timed out");
      }
      return inputs.map((input) => ({ input, status: "fulfilled" as const }));
    } catch (reason) {
      lastReason = reason;
      if (attempt < startupConfig.retryAttempts && shouldContinue()) {
        await delay(startupConfig.retryDelayMs);
      }
    }
  }

  return inputs.map((input) => ({ input, reason: lastReason, status: "rejected" as const }));
}

export async function resolveLoginStartupWindows(): Promise<WidgetWindowOpenInput[]> {
  const startupConfig = await readTauriStartupOptimizationConfig();
  // 설정 응답 자체는 시작 창 구성에 쓰지 않는다 — 백엔드 웜업 겸 타임아웃 가드만 유지한다.
  void withTimeout(
    widgetApi.getSettings(),
    startupConfig.settingsTimeoutMs,
    "Tauri widget startup settings timed out",
  ).catch(() => null);
  const preference = readDesktopWidgetStartupPreference();
  if (preference.mode === "board") {
    return [loginStartupBarWindow, loginStartupAgentOrbWindow, ...desktopWidgetBoardWindows];
  }
  if (preference.mode === "cascade") {
    return [loginStartupBarWindow, loginStartupAgentOrbWindow, ...desktopWidgetCascadeWindows];
  }
  return loginStartupWindows;
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

    const startupWindowsPromise = resolveLoginStartupWindows().then((windows) => {
      timeline.startupWindowsResolvedAt = nowIso();
      return windows;
    });
    const selectedRoomPromise = (
      Object.prototype.hasOwnProperty.call(options, "selectedRoomId")
        ? Promise.resolve(options.selectedRoomId ?? null)
        : resolveLaunchSelectedRoomId()
    ).then((roomId) => {
      timeline.selectedRoomResolvedAt = nowIso();
      return roomId;
    });
    const [startupWindows, selectedRoomId] = await Promise.all([startupWindowsPromise, selectedRoomPromise]);
    launchInFlightRoomId = selectedRoomId?.trim() || launchInFlightRoomId;
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

    const nativeAuthenticatedSurfacesEnabled = await tauriCommands.getAuthenticatedSurfacesEnabled().catch(() => false);
    const shouldReuseExistingWindows = launchedAuthenticatedSurfaces || nativeAuthenticatedSurfacesEnabled;
    if (shouldReuseExistingWindows) {
      const startupWindowsReady = await authenticatedStartupWindowsReady(startupWindows);
      if (startupWindowsReady) {
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
        launchedAuthenticatedSurfaces = true;
        timeline.completed = true;
        timeline.reusedExistingWindowsAt = nowIso();
        timeline.barWindowOpenedAt = timeline.reusedExistingWindowsAt;
        timeline.bubbleWindowsOpenedAt = timeline.reusedExistingWindowsAt;
        timeline.firstWidgetOpenAfterBackendAuth = Boolean(
          timeline.backendAuthValidatedAt &&
            new Date(timeline.reusedExistingWindowsAt).getTime() >= new Date(timeline.backendAuthValidatedAt).getTime(),
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
    let summaryPrewarmPromise: Promise<boolean> | null = null;

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

    if (selectedRoomId || bubbleWindows.length > 0) {
      summaryPrewarmPromise = prewarmWidgetSummaryCache(selectedRoomId);
    }

    if (generation !== launchGeneration) {
      await tauriCommands.closeAllWidgetWindows().catch(() => undefined);
      await tauriCommands.setAuthenticatedSurfacesEnabled({ enabled: false }).catch(() => undefined);
      return;
    }

    if (summaryPrewarmPromise) {
      void summaryPrewarmPromise.then((warmed) => {
        if (warmed) {
          timeline.summaryPrewarmCompletedAt = nowIso();
        } else {
          timeline.summaryPrewarmFailedAt = nowIso();
        }
      });
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

    const startupPreference = readDesktopWidgetStartupPreference();
    if (startupPreference.mode === "board" && bubbleWindows.length > 0) {
      void tauriCommands.arrangeWidgetWindows({ layout: "board" }).catch(() => undefined);
    }
    if (startupPreference.mode === "cascade" && bubbleWindows.length > 0) {
      void tauriCommands.arrangeWidgetWindows({ layout: "cascade" }).catch(() => undefined);
    }

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
