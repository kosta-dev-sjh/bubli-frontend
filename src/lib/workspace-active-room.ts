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
  mirrorActiveProjectRoomToTauri(cleanRoomId, nextRoomLabel);
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
  mirrorActiveProjectRoomToTauri(cleanRoomId, activeProjectRoomLabel);
  if (typeof window === "undefined") return;
  void widgetApi.updateContext({ selectedRoomId: cleanRoomId }).catch(() => undefined);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, {
      detail: { roomId: cleanRoomId, roomLabel: activeProjectRoomLabel },
    }),
  );
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
