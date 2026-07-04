"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { openTauriChatWidget } from "@/lib/tauri/chat-widget-routing";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export default function DesktopCommunicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    const roomId = searchParams.get("roomId")?.trim() || null;
    const webParams = new URLSearchParams({ mode: "room" });
    if (roomId) {
      webParams.set("roomId", roomId);
    }

    if (!isTauriRuntime()) {
      router.replace(`/app/chat?${webParams.toString()}`);
      return;
    }

    const fallbackRoute = roomId ? `/app/project-rooms/${encodeURIComponent(roomId)}/work` : "/app";
    void openTauriChatWidget({ eventType: "handoff:legacy-communication", roomId })
      .then(() => router.replace(fallbackRoute))
      .catch(() => router.replace(fallbackRoute));
  }, [router, searchParams]);

  return null;
}
