"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { projectRoomRoute } from "@/lib/project-room-routes";
import { openTauriChatWidget } from "@/lib/tauri/chat-widget-routing";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export default function ProjectRoomChatPage() {
  const params = useParams<{ roomId?: string | string[] }>();
  const router = useRouter();
  const launchedRef = useRef(false);
  const roomId = useMemo(() => {
    const value = params.roomId;
    return (Array.isArray(value) ? value[0] : value)?.trim() || null;
  }, [params.roomId]);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    if (!roomId) {
      router.replace("/app/chat");
      return;
    }

    if (!isTauriRuntime()) {
      router.replace(`/app/chat?mode=room&roomId=${encodeURIComponent(roomId)}`);
      return;
    }

    void openTauriChatWidget({ eventType: "handoff:room-chat-route", roomId })
      .then(() => router.replace(projectRoomRoute(roomId, "work")))
      .catch(() => router.replace(projectRoomRoute(roomId, "work")));
  }, [roomId, router]);

  return null;
}
