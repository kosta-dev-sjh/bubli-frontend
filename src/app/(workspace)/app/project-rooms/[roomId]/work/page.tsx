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
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "작업판을 불러오지 못했습니다",
      });
    }
  }, [roomId]);

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
          <h1 id="work-title">{state.kind === "ready" ? state.room.name : "작업판"}</h1>
        </div>
      </header>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-route__panel">
          <Clock3 aria-hidden size={20} strokeWidth={2} />
          <strong>불러오는 중</strong>
        </GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>{state.message}</strong>
          <div className="workspace-route__actions">
            <Button onClick={() => void load()} variant="primary">
              작업판 다시 불러오기
            </Button>
            <Link className="bubli-button" href={`/app/project-rooms/${roomId}`}>
              프로젝트룸
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" && content ? (
        <ProjectRoomWorkBoard board={content.board} members={content.members} roomId={roomId} />
      ) : null}
    </section>
  );
}
