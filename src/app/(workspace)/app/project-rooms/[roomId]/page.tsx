"use client";

import {
  AlertCircle,
  CalendarDays,
  FileText,
  ListChecks,
  MessageCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { getActiveProjectRoomLabel, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewMembers,
  workspacePreviewRoomById,
} from "@/lib/workspace-preview-data";
import type { ProjectRoomMemberResponse, ProjectRoomResponse } from "@/types/api/projectRoom";

type RoomHomeState =
  | { kind: "loading" }
  | {
      members: ProjectRoomMemberResponse[];
      room: ProjectRoomResponse;
      kind: "ready";
    }
  | { kind: "auth" }
  | { kind: "error"; message: string };

type SettledValue<T> = PromiseSettledResult<T>;

function settledOr<T>(result: SettledValue<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function paymentLabel(room: ProjectRoomResponse) {
  if (!room.contractAmount && room.paymentStatus === "NOT_RECORDED") return null;
  if (room.paymentStatus === "PAID") return "입금 완료";
  if (room.paymentStatus === "OVERDUE") return "확인 필요";
  return "기록됨";
}

function roomLifecycleLabel(room: ProjectRoomResponse) {
  return room.status === "CLOSED" ? "종료됨" : "진행 중";
}

function roomLifecycleDetail(room: ProjectRoomResponse) {
  if (room.status !== "CLOSED") return "작업 가능";
  return room.closedAt ? `종료 ${formatDate(room.closedAt)}` : "읽기 전용";
}

function formatMoney(amount?: number | null) {
  if (!amount) return null;
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function ProjectRoomHomePage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const [state, setState] = useState<RoomHomeState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const [room, members] = await Promise.allSettled([
        projectRoomApi.get(roomId),
        projectRoomApi.getMembers(roomId),
      ]);

      const roomData = settledOr(room, null);
      if (!roomData) {
        const roomError = room.status === "rejected" ? room.reason : null;
        if (roomError instanceof ApiClientError && roomError.status === 401) {
          setState({ kind: "auth" });
          return;
        }
        throw roomError instanceof Error ? roomError : new Error("프로젝트룸을 불러오지 못했습니다.");
      }

      setActiveProjectRoomId(roomData.id, roomData.name);
      setState({
        kind: "ready",
        members: settledOr(members, { hasNext: false, items: [], page: 0, size: 0, totalElements: 0, totalPages: 0 }).items,
        room: roomData,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      if (shouldUseWorkspacePreviewData()) {
        const room = workspacePreviewRoomById(roomId, getActiveProjectRoomLabel());
        setActiveProjectRoomId(room.id, room.name);
        setState({
          kind: "ready",
          members: workspacePreviewMembers,
          room,
        });
        return;
      }

      setState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : "프로젝트룸을 불러오지 못했습니다.",
      });
    }
  }, [roomId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <section className="workspace-route workspace-route--room-home" aria-labelledby="room-home-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="room-home-title">{state.kind === "ready" ? state.room.name : "프로젝트룸"}</h1>
          {state.kind === "ready" ? <p className="workspace-route__eyebrow">자료 · 작업 · 소통 · 일정</p> : null}
        </div>
        {state.kind === "ready" ? (
          <nav className="room-home__segmented-nav" aria-label="프로젝트룸 메뉴">
            <Link href={`/app/project-rooms/${roomId}/work`}>
              <ListChecks aria-hidden size={18} strokeWidth={1.9} />
              <span>WBS/칸반</span>
            </Link>
            <Link href={`/app/project-rooms/${roomId}/resources`}>
              <FileText aria-hidden size={18} strokeWidth={1.9} />
              <span>자료</span>
            </Link>
            <Link href={`/app/desktop/widgets?autoOpen=chat&roomId=${encodeURIComponent(roomId)}`}>
              <MessageCircle aria-hidden size={18} strokeWidth={1.9} />
              <span>소통</span>
            </Link>
            <Link href={`/app/calendar?roomId=${roomId}`}>
              <CalendarDays aria-hidden size={18} strokeWidth={1.9} />
              <span>일정</span>
            </Link>
          </nav>
        ) : null}
      </header>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-route__panel">
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
          <Button onClick={() => void load()} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            다시 연결
          </Button>
          <Link className="bubli-button" href="/app/project-rooms">
            목록
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <div className="workspace-route__summary" aria-label="프로젝트룸 상태">
            <span className={`workspace-route__status-chip ${state.room.status === "CLOSED" ? "is-closed" : "is-active"}`}>
              <b>상태</b>
              <strong>{roomLifecycleLabel(state.room)}</strong>
              <small>{roomLifecycleDetail(state.room)}</small>
            </span>
            <span className="workspace-route__members-chip">
              <UsersRound aria-hidden size={15} strokeWidth={2} />
              <strong>멤버 {state.members.length}</strong>
              {state.members.length > 0 ? <small>{state.members.slice(0, 2).map((member) => member.name).join(", ")}</small> : null}
            </span>
            {formatMoney(state.room.contractAmount) ? <span>{formatMoney(state.room.contractAmount)}</span> : null}
            {formatDate(state.room.paymentDueDate) ? <span>입금 {formatDate(state.room.paymentDueDate)}</span> : null}
            {paymentLabel(state.room) && !formatMoney(state.room.contractAmount) ? <span>{paymentLabel(state.room)}</span> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
