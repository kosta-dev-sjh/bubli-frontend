"use client";

import { isTauriRuntime } from "@/lib/tauri/is-tauri";

type ProjectRoomRouteTarget = "chat" | "resources" | "work";

export function projectRoomRoute(roomId: string, target: ProjectRoomRouteTarget = "work") {
  const encodedRoomId = encodeURIComponent(roomId);

  if (isTauriRuntime()) {
    if (target === "chat") return `/app/chat?mode=room&roomId=${encodedRoomId}`;
    if (target === "resources") return `/app/project-room-resources?roomId=${encodedRoomId}`;
    return `/app/project-room-work?roomId=${encodedRoomId}`;
  }

  if (target === "chat") return `/app/project-rooms/${encodedRoomId}/chat`;
  if (target === "resources") return `/app/project-rooms/${encodedRoomId}/resources`;
  return `/app/project-rooms/${encodedRoomId}/work`;
}
