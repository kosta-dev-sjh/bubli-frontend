"use client";

import { AlertCircle, Clock3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ProjectRoomWorkBoard } from "@/features/project-room/components/project-room-work-board";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import { getActiveProjectRoomLabel, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewMembers,
  workspacePreviewRoomById,
  workspacePreviewWbsBoard,
} from "@/lib/workspace-preview-data";
import type { ProjectRoomMemberResponse, ProjectRoomResponse } from "@/types/api/projectRoom";
import type { WbsBoardResponse } from "@/types/api/work";

type WorkPageState =
  | { kind: "loading" }
  | {
      kind: "ready";
      board: WbsBoardResponse;
      members: ProjectRoomMemberResponse[];
      room: ProjectRoomResponse;
    }
  | { kind: "auth" }
  | { kind: "error"; message: string };

export default function ProjectRoomWorkPage() {
  const { t } = useI18n();
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const [state, setState] = useState<WorkPageState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const [room, board, membersPage] = await Promise.all([
        projectRoomApi.get(roomId),
        wbsApi.getBoard(roomId),
        projectRoomApi.getMembers(roomId),
      ]);
      setActiveProjectRoomId(room.id, room.name);
      setState({ board, kind: "ready", members: membersPage.items, room });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      if (shouldUseWorkspacePreviewData()) {
        const room = workspacePreviewRoomById(roomId, getActiveProjectRoomLabel());
        setActiveProjectRoomId(room.id, room.name);
        setState({
          board: workspacePreviewWbsBoard(room.id),
          kind: "ready",
          members: workspacePreviewMembers.map((member) => ({ ...member, roomId: room.id })),
          room,
        });
        return;
      }

      setState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("room.work.loadFailed"),
      });
    }
  }, [roomId, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const content = useMemo(() => {
    if (state.kind !== "ready") {
      return null;
    }

    return {
      board: state.board,
      members: state.members,
    };
  }, [state]);

  return (
    <section className="workspace-route workspace-route--work" aria-labelledby="work-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="work-title">{state.kind === "ready" ? state.room.name : t("room.work.fallbackName")}</h1>
        </div>
      </header>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-route__panel">
          <Clock3 aria-hidden size={20} strokeWidth={2} />
          <strong>{t("room.work.loading")}</strong>
        </GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>{t("room.work.authTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("room.work.login")}
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>{state.message}</strong>
          <div className="workspace-route__actions">
            <Button onClick={() => void load()} variant="primary">
              {t("room.work.reload")}
            </Button>
            <Link className="bubli-button" href={`/app/project-rooms/${roomId}`}>
              {t("room.work.backToRoom")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" && content ? (
        <ProjectRoomWorkBoard board={content.board} members={content.members} onBoardReload={load} roomId={roomId} />
      ) : null}
    </section>
  );
}
