"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

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

    // 데스크톱 앱도 이제 웹과 동일하게 메인 창에서 곧장 소통 화면을 연다(위젯 핸드오프 없음).
    router.replace(`/app/chat?mode=room&roomId=${encodeURIComponent(roomId)}`);
  }, [roomId, router]);

  return null;
}
