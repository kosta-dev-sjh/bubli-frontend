import { widgetApi } from "@/features/widget/api/widgetApi";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export const ACTIVE_PROJECT_ROOM_CHANGE_EVENT = "bubli:active-project-room-change";

let activeProjectRoomId: string | null = null;
let activeProjectRoomLabel: string | null = null;

export type ActiveProjectRoomSnapshot = {
  roomId: string;
  roomLabel?: string | null;
  savedAt?: string;
};

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
  void tauriCommands.storeActiveProjectRoom({ roomId, roomLabel: roomLabel ?? null }).catch(() => undefined);
  void tauriCommands.setWidgetRoomContext({ selectedRoomId: roomId }).catch(() => undefined);
}

function publishActiveProjectRoom(roomId: string, roomLabel?: string | null) {
  mirrorActiveProjectRoomToTauri(roomId, roomLabel);
  if (typeof window === "undefined") return;

  void widgetApi.updateContext({ selectedRoomId: roomId }).catch(() => undefined);
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
  void tauriCommands.clearActiveProjectRoom().catch(() => undefined);
  void tauriCommands.setWidgetRoomContext({ selectedRoomId: null }).catch(() => undefined);
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
    if (activeProjectRoomId === null && activeProjectRoomLabel === null) return;

    activeProjectRoomId = null;
    activeProjectRoomLabel = null;
    if (isTauriRuntime()) {
      void tauriCommands.clearActiveProjectRoom().catch(() => undefined);
    }
    publishActiveProjectRoomChange(null);
    return;
  }

  const nextRoomLabel = roomLabel?.trim() || (activeProjectRoomId === cleanRoomId ? activeProjectRoomLabel : null);
  if (activeProjectRoomId === cleanRoomId && activeProjectRoomLabel === nextRoomLabel) return;

  activeProjectRoomId = cleanRoomId;
  activeProjectRoomLabel = nextRoomLabel;
  if (isTauriRuntime()) {
    void tauriCommands.storeActiveProjectRoom({ roomId: cleanRoomId, roomLabel: nextRoomLabel }).catch(() => undefined);
  }
  publishActiveProjectRoomChange(cleanRoomId, nextRoomLabel);
}

export function clearActiveProjectRoomId() {
  activeProjectRoomId = null;
  activeProjectRoomLabel = null;
  clearActiveProjectRoomTauriMirror();
  if (typeof window === "undefined") return;
  void widgetApi.updateContext({ selectedRoomId: null }).catch(() => undefined);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, { detail: { roomId: null } }),
  );
}
