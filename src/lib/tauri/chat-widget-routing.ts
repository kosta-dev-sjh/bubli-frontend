"use client";

import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { getActiveProjectRoomId, setActiveProjectRoomId } from "@/lib/workspace-active-room";

export type TauriChatWidgetOpenInput = {
  eventType?: string;
  roomId?: string | null;
  roomLabel?: string | null;
};

export async function openTauriChatWidget(input: TauriChatWidgetOpenInput = {}) {
  if (!isTauriRuntime()) return false;

  const selectedRoomId = input.roomId?.trim() || getActiveProjectRoomId();
  if (selectedRoomId) {
    setActiveProjectRoomId(selectedRoomId, input.roomLabel ?? null);
  }

  try {
    await tauriCommands.openWidgetWindow({
      bubbleType: "chat",
      mode: "DEFAULT",
      selectedRoomId: selectedRoomId ?? null,
      windowId: "chat",
    });
  } catch {
    return false;
  }

  void tauriCommands
    .recordWidgetUsageEvent({
      bubbleType: "chat",
      eventType: input.eventType ?? "handoff:chat",
      occurredAt: new Date().toISOString(),
    })
    .catch(() => undefined);
  return true;
}
