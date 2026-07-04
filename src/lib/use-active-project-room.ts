"use client";

import { useEffect, useState } from "react";

import {
  ACTIVE_PROJECT_ROOM_CHANGE_EVENT,
  getActiveProjectRoomId,
  getActiveProjectRoomLabel,
} from "@/lib/workspace-active-room";

export function useActiveProjectRoom() {
  const [activeRoom, setActiveRoom] = useState(() => ({
    roomId: getActiveProjectRoomId(),
    roomLabel: getActiveProjectRoomLabel(),
  }));

  useEffect(() => {
    function handleActiveRoomChange(event: Event) {
      const detail = event instanceof CustomEvent
        ? (event.detail as { roomId?: string | null; roomLabel?: string | null } | null)
        : null;

      setActiveRoom({
        roomId: detail?.roomId ?? getActiveProjectRoomId(),
        roomLabel: detail?.roomLabel ?? getActiveProjectRoomLabel(),
      });
    }

    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleActiveRoomChange);

    return () => {
      window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleActiveRoomChange);
    };
  }, []);

  return activeRoom;
}
