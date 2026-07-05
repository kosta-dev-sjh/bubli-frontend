import { widgetApi } from "@/features/widget/api/widgetApi";
import { getStoredAuthSession, restoreStoredAuthSessionFromTauri } from "@/lib/auth/auth-session";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export const ACTIVE_PROJECT_ROOM_CHANGE_EVENT = "bubli:active-project-room-change";
export const ACTIVE_PROJECT_ROOM_SYNC_ERROR_EVENT = "bubli:active-project-room-sync-error";

let activeProjectRoomId: string | null = null;
let activeProjectRoomLabel: string | null = null;

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";

export type ActiveProjectRoomSnapshot = {
  roomId: string;
  roomLabel?: string | null;
  savedAt?: string;
};

type ActiveProjectRoomSyncTarget = "local-cache" | "widget-context" | "server-widget-context";

function reportActiveProjectRoomSyncFailure(target: ActiveProjectRoomSyncTarget, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[Bubli] Active project room sync failed: ${target}`, error);

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_SYNC_ERROR_EVENT, {
      detail: { message, target },
    }),
  );
}

export function seedActiveProjectRoomId(roomId: string, roomLabel?: string | null) {
  const cleanRoomId = roomId.trim();
  if (!cleanRoomId) return;

  const nextRoomLabel = roomLabel?.trim() || (activeProjectRoomId === cleanRoomId ? activeProjectRoomLabel : null);
  activeProjectRoomId = cleanRoomId;
  activeProjectRoomLabel = nextRoomLabel;
  publishActiveProjectRoom(cleanRoomId, nextRoomLabel);
}

export function getActiveProjectRoomId() {
  return activeProjectRoomId;
}

export function getActiveProjectRoomLabel() {
  return activeProjectRoomLabel;
}

export async function restoreActiveProjectRoomFromTauri(): Promise<ActiveProjectRoomSnapshot | null> {
  if (activeProjectRoomId) {
    return { roomId: activeProjectRoomId, roomLabel: activeProjectRoomLabel };
  }
  if (!isTauriRuntime()) return null;

  try {
    const restored = await tauriCommands.readActiveProjectRoom();
    if (!restored?.roomId) return null;

    activeProjectRoomId = restored.roomId;
    activeProjectRoomLabel = restored.roomLabel?.trim() || null;
    publishActiveProjectRoom(restored.roomId, activeProjectRoomLabel);
    return {
      roomId: restored.roomId,
      roomLabel: activeProjectRoomLabel,
      savedAt: restored.savedAt,
    };
  } catch {
    return null;
  }
}

function mirrorActiveProjectRoomToTauri(roomId: string, roomLabel?: string | null) {
  if (!isTauriRuntime()) return;
  void tauriCommands
    .storeActiveProjectRoom({ roomId, roomLabel: roomLabel ?? null })
    .catch((error) => reportActiveProjectRoomSyncFailure("local-cache", error));
  void tauriCommands
    .setWidgetRoomContext({ selectedRoomId: roomId })
    .catch((error) => reportActiveProjectRoomSyncFailure("widget-context", error));
}

function mirrorActiveProjectRoomToServer(roomId: string | null) {
  if (runtimeSmokeEnabled) return;
  if (typeof window === "undefined") return;

  void (async () => {
    const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
    if (!session) return;

    await widgetApi.updateContext({ selectedRoomId: roomId });
  })().catch((error) => reportActiveProjectRoomSyncFailure("server-widget-context", error));
}

function publishActiveProjectRoom(roomId: string, roomLabel?: string | null) {
  mirrorActiveProjectRoomToTauri(roomId, roomLabel);
  if (typeof window === "undefined") return;

  mirrorActiveProjectRoomToServer(roomId);
  publishActiveProjectRoomChange(roomId, roomLabel);
}

function publishActiveProjectRoomChange(roomId: string | null, roomLabel?: string | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, {
      detail: { roomId, roomLabel: roomLabel ?? null },
    }),
  );
}

function clearActiveProjectRoomTauriMirror() {
  if (!isTauriRuntime()) return;
  void tauriCommands
    .clearActiveProjectRoom()
    .catch((error) => reportActiveProjectRoomSyncFailure("local-cache", error));
  void tauriCommands
    .setWidgetRoomContext({ selectedRoomId: null })
    .catch((error) => reportActiveProjectRoomSyncFailure("widget-context", error));
}

export function setActiveProjectRoomId(roomId: string, roomLabel?: string | null) {
  const cleanRoomId = roomId.trim();
  if (!cleanRoomId) return;

  const nextRoomLabel = roomLabel?.trim() || (activeProjectRoomId === cleanRoomId ? activeProjectRoomLabel : null);
  activeProjectRoomId = cleanRoomId;
  activeProjectRoomLabel = nextRoomLabel;
  publishActiveProjectRoom(cleanRoomId, activeProjectRoomLabel);
}

export function syncActiveProjectRoomFromWidgetContext(roomId: string | null | undefined, roomLabel?: string | null) {
  const cleanRoomId = roomId?.trim() ?? "";
  if (!cleanRoomId) {
    if (activeProjectRoomId === null && activeProjectRoomLabel === null) {
      mirrorActiveProjectRoomToServer(null);
      return;
    }

    activeProjectRoomId = null;
    activeProjectRoomLabel = null;
    if (isTauriRuntime()) {
      void tauriCommands
        .clearActiveProjectRoom()
        .catch((error) => reportActiveProjectRoomSyncFailure("local-cache", error));
    }
    mirrorActiveProjectRoomToServer(null);
    publishActiveProjectRoomChange(null);
    return;
  }

  const nextRoomLabel = roomLabel?.trim() || (activeProjectRoomId === cleanRoomId ? activeProjectRoomLabel : null);
  if (activeProjectRoomId === cleanRoomId && activeProjectRoomLabel === nextRoomLabel) {
    mirrorActiveProjectRoomToServer(cleanRoomId);
    return;
  }

  activeProjectRoomId = cleanRoomId;
  activeProjectRoomLabel = nextRoomLabel;
  if (isTauriRuntime()) {
    void tauriCommands
      .storeActiveProjectRoom({ roomId: cleanRoomId, roomLabel: nextRoomLabel })
      .catch((error) => reportActiveProjectRoomSyncFailure("local-cache", error));
  }
  mirrorActiveProjectRoomToServer(cleanRoomId);
  publishActiveProjectRoomChange(cleanRoomId, nextRoomLabel);
}

export function clearActiveProjectRoomId() {
  activeProjectRoomId = null;
  activeProjectRoomLabel = null;
  clearActiveProjectRoomTauriMirror();
  if (typeof window === "undefined") return;
  mirrorActiveProjectRoomToServer(null);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, { detail: { roomId: null } }),
  );
}
