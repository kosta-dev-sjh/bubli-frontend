"use client";

import { authApi } from "@/features/auth/api/authApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import {
  getStoredAuthSessionDiagnostics,
  readTauriAuthSessionDiagnostics,
  type AuthSessionDiagnostics,
} from "@/lib/auth/auth-session";
import { ApiClientError } from "@/lib/api/errors";
import {
  tauriCommands,
  type WidgetBubbleType,
  type WidgetWindowBubbleType,
  type WidgetWindowState,
} from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { WIDGET_BUBBLE_TYPES } from "@/lib/widget/widget-types";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

type QaProbe = {
  code?: string;
  ok: boolean;
  status?: number;
};

export type TauriWidgetWindowQaState = Pick<WidgetWindowState, "mode" | "selectedRoomId" | "windowVisible"> & {
  bubbleType: WidgetWindowBubbleType;
  selectedRoomMatchesActiveRoom: boolean;
  selectedRoomMatchesServerContext: boolean;
};

export type TauriAuthWidgetQaSnapshot = {
  activeProjectRoom: {
    memoryRoomId: string | null;
    serverSelectedRoomId: string | null;
    tauriRoomId: string | null;
    tauriSavedAt?: string;
    tauriMatchesMemory: boolean;
    tauriMatchesServerContext: boolean;
  };
  backend: {
    me: QaProbe;
    widgetContext: QaProbe;
    widgetSummary: QaProbe & {
      bubbleCount?: number;
      enabledBubbleTypes?: string[];
      selectedRoomId?: string | null;
    };
  };
  collectedAt: string;
  expectedBubbleTypes: readonly WidgetBubbleType[];
  localSession: AuthSessionDiagnostics;
  tauriMirrorSession: AuthSessionDiagnostics;
  widgetRuntime: {
    allExpectedWindowsVisible: boolean;
    allWindowRoomContextMatchesActive: boolean;
    barItems: {
      count: number;
      ok: boolean;
      selectedRoomIds: Array<string | null>;
      windowIds: string[];
    };
    barWindow: TauriWidgetWindowQaState | null;
    missingVisibleBubbles: WidgetBubbleType[];
    windows: Record<WidgetBubbleType, TauriWidgetWindowQaState | null>;
  };
};

function toProbe(error: unknown): QaProbe {
  if (error instanceof ApiClientError) {
    return { code: error.code, ok: false, status: error.status };
  }

  return { ok: false };
}

async function probeBackend<T>(read: () => Promise<T>): Promise<{ data?: T; probe: QaProbe }> {
  try {
    return { data: await read(), probe: { ok: true } };
  } catch (error) {
    return { probe: toProbe(error) };
  }
}

function roomMatches(actual: string | null | undefined, expected: string | null) {
  if (!expected) {
    return !actual;
  }

  return actual === expected;
}

function toWindowQaState(
  state: WidgetWindowState,
  activeRoomId: string | null,
  serverSelectedRoomId: string | null,
): TauriWidgetWindowQaState {
  return {
    bubbleType: state.activeBubble,
    mode: state.mode,
    selectedRoomId: state.selectedRoomId ?? null,
    selectedRoomMatchesActiveRoom: roomMatches(state.selectedRoomId, activeRoomId),
    selectedRoomMatchesServerContext: roomMatches(state.selectedRoomId, serverSelectedRoomId),
    windowVisible: state.windowVisible,
  };
}

async function readWindowState(
  bubbleType: WidgetWindowBubbleType,
  activeRoomId: string | null,
  serverSelectedRoomId: string | null,
): Promise<TauriWidgetWindowQaState | null> {
  try {
    const state = await tauriCommands.getWidgetWindowState({ bubbleType, windowId: bubbleType });
    return toWindowQaState(state, activeRoomId, serverSelectedRoomId);
  } catch {
    return null;
  }
}

export async function readTauriAuthWidgetQaSnapshot(): Promise<TauriAuthWidgetQaSnapshot> {
  const localSession = getStoredAuthSessionDiagnostics();
  const tauriMirrorSession = await readTauriAuthSessionDiagnostics();

  const memoryRoomId = getActiveProjectRoomId();
  const tauriRoom = isTauriRuntime() ? await tauriCommands.readActiveProjectRoom().catch(() => null) : null;
  const backendMe = await probeBackend(() => authApi.getMe());
  const backendContext = await probeBackend(() => widgetApi.getContext());
  const serverSelectedRoomId = backendContext.data?.selectedRoomId ?? null;
  const selectedRoomId = memoryRoomId ?? tauriRoom?.roomId ?? serverSelectedRoomId;
  const backendSummary = await probeBackend(() => widgetApi.getSummary(selectedRoomId));

  const barItems = isTauriRuntime() ? await tauriCommands.getWidgetBarItems().catch(() => [] as WidgetWindowState[]) : [];
  const barWindow = isTauriRuntime()
    ? await readWindowState("bar", selectedRoomId ?? null, serverSelectedRoomId)
    : null;
  const windowEntries = await Promise.all(
    WIDGET_BUBBLE_TYPES.map(async (bubbleType) => [
      bubbleType,
      isTauriRuntime() ? await readWindowState(bubbleType, selectedRoomId ?? null, serverSelectedRoomId) : null,
    ] as const),
  );
  const windows = Object.fromEntries(windowEntries) as Record<WidgetBubbleType, TauriWidgetWindowQaState | null>;
  const missingVisibleBubbles = WIDGET_BUBBLE_TYPES.filter((bubbleType) => !windows[bubbleType]?.windowVisible);

  return {
    activeProjectRoom: {
      memoryRoomId,
      serverSelectedRoomId,
      tauriRoomId: tauriRoom?.roomId ?? null,
      tauriSavedAt: tauriRoom?.savedAt,
      tauriMatchesMemory: roomMatches(tauriRoom?.roomId, memoryRoomId),
      tauriMatchesServerContext: roomMatches(tauriRoom?.roomId, serverSelectedRoomId),
    },
    backend: {
      me: backendMe.probe,
      widgetContext: backendContext.probe,
      widgetSummary: {
        ...backendSummary.probe,
        bubbleCount: backendSummary.data?.bubbles.length,
        enabledBubbleTypes: backendSummary.data?.bubbles
          .filter((bubble) => bubble.enabled)
          .map((bubble) => bubble.bubbleType),
        selectedRoomId: backendSummary.data?.context.selectedRoomId ?? null,
      },
    },
    collectedAt: new Date().toISOString(),
    expectedBubbleTypes: WIDGET_BUBBLE_TYPES,
    localSession,
    tauriMirrorSession,
    widgetRuntime: {
      allExpectedWindowsVisible: missingVisibleBubbles.length === 0,
      allWindowRoomContextMatchesActive: WIDGET_BUBBLE_TYPES.every(
        (bubbleType) => windows[bubbleType]?.selectedRoomMatchesActiveRoom,
      ),
      barItems: {
        count: barItems.length,
        ok: barItems.length >= WIDGET_BUBBLE_TYPES.length,
        selectedRoomIds: [...new Set(barItems.map((item) => item.selectedRoomId ?? null))],
        windowIds: barItems.map((item) => item.windowId ?? item.activeBubble),
      },
      barWindow,
      missingVisibleBubbles,
      windows,
    },
  };
}
