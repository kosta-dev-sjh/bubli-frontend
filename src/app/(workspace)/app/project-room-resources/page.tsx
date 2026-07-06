"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { GlassPanel } from "@/components/ui/glass-panel";
import { ProjectRoomResourcesContent } from "@/app/(workspace)/app/project-rooms/[roomId]/resources/page";
import { useI18n } from "@/lib/i18n";

export default function TauriProjectRoomResourcesPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId")?.trim();

  if (!roomId) {
    return (
      <section className="workspace-route" aria-labelledby="resources-title">
        <GlassPanel className="workspace-route__panel">
          <strong id="resources-title">{t("room.work.loadFailed")}</strong>
          <Link className="bubli-button" href="/app/project-rooms">
            {t("room.work.backToRoom")}
          </Link>
        </GlassPanel>
      </section>
    );
  }

  return <ProjectRoomResourcesContent roomId={roomId} />;
}
