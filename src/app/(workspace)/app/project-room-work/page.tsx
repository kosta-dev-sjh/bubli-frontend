"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { GlassPanel } from "@/components/ui/glass-panel";
import { ProjectRoomWorkContent } from "@/app/(workspace)/app/project-rooms/[roomId]/work/page";
import { useI18n } from "@/lib/i18n";

export default function TauriProjectRoomWorkPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId")?.trim();

  if (!roomId) {
    return (
      <section className="workspace-route workspace-route--work" aria-labelledby="work-title">
        <GlassPanel className="workspace-route__panel">
          <strong id="work-title">{t("room.work.loadFailed")}</strong>
          <Link className="bubli-button" href="/app/project-rooms">
            {t("room.work.backToRoom")}
          </Link>
        </GlassPanel>
      </section>
    );
  }

  return <ProjectRoomWorkContent roomId={roomId} />;
}
