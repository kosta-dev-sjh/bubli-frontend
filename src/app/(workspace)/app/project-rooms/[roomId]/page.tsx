"use client";

import { ListChecks } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";

export default function ProjectRoomHomePage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  useEffect(() => {
    router.replace(`/app/project-rooms/${roomId}/work`);
  }, [roomId, router]);

  return (
    <section className="workspace-route workspace-route--room-home">
      <GlassPanel className="workspace-route__empty" data-tone="muted">
        <ListChecks aria-hidden="true" size={22} strokeWidth={2.1} />
        <h1>WBS/칸반으로 이동 중</h1>
      </GlassPanel>
    </section>
  );
}
