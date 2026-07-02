"use client";

import { ListChecks } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { useI18n } from "@/lib/i18n";

export default function ProjectRoomHomePage() {
  const { t } = useI18n();
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
        <h1>{t("room.home.redirecting")}</h1>
      </GlassPanel>
    </section>
  );
}
