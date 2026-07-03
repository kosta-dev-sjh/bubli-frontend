"use client";

import { AlertCircle, Clock3, Settings2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ProjectRoomSettingsPanel } from "@/features/project-room/components/project-room-settings-panel";
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
      currentUserId: string | null;
      members: ProjectRoomMemberResponse[];
      room: ProjectRoomResponse;
    }
  | { kind: "auth" }
  | { kind: "error"; message: string };

export default function ProjectRoomWorkPage() {
  const { t } = useI18n();
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;
  const [state, setState] = useState<WorkPageState>({ kind: "loading" });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const [currentUser, room, board, membersPage] = await Promise.all([
        authApi.getMe(),
        projectRoomApi.get(roomId),
        wbsApi.getBoard(roomId),
        projectRoomApi.getMembers(roomId),
      ]);
      const members = membersPage.items.map((member) => {
        const isCurrentUser =
          member.userId === currentUser.id ||
          (Boolean(member.bubliId) && member.bubliId?.toLowerCase() === currentUser.bubliId.toLowerCase());

        return isCurrentUser
          ? {
              ...member,
              avatarUrl: member.avatarUrl || currentUser.avatarUrl || null,
              bubliId: member.bubliId || currentUser.bubliId || null,
              name: member.name || currentUser.name,
            }
          : member;
      });
      setActiveProjectRoomId(room.id, room.name);
      setState({ board, currentUserId: currentUser.id, kind: "ready", members, room });
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
          currentUserId: workspacePreviewMembers[0]?.userId ?? null,
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
        {state.kind === "ready" ? (
          <Button
            aria-expanded={isSettingsOpen}
            icon={<Settings2 size={15} strokeWidth={1.9} />}
            onClick={() => setIsSettingsOpen((open) => !open)}
            size="sm"
          >
            {t("room.settings.open")}
          </Button>
        ) : null}
      </header>

      {state.kind === "ready" && isSettingsOpen ? (
        <ProjectRoomSettingsPanel
          currentUserId={state.currentUserId}
          members={state.members}
          onClose={() => setIsSettingsOpen(false)}
          onMembersChange={(members) =>
            setState((current) => (current.kind === "ready" ? { ...current, members } : current))
          }
          onRoomChange={(room) => {
            setActiveProjectRoomId(room.id, room.name);
            setState((current) => (current.kind === "ready" ? { ...current, room } : current));
          }}
          onRoomClosed={() => router.replace("/app/project-rooms")}
          room={state.room}
        />
      ) : null}

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
