"use client";

import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  FileText,
  ListChecks,
  MessageCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { agentApi } from "@/features/agent/api/agentApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { ApiClientError } from "@/lib/api/errors";
import { getActiveProjectRoomLabel, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewMembers,
  workspacePreviewRoomById,
  workspacePreviewRoomResources,
  workspacePreviewRoomSuggestions,
  workspacePreviewSchedules,
  workspacePreviewWbsBoard,
} from "@/lib/workspace-preview-data";
import type { AgentSuggestionResponse } from "@/types/api/agent";
import type { ProjectRoomMemberResponse, ProjectRoomResponse } from "@/types/api/projectRoom";
import type { ResourceResponse } from "@/types/api/resource";
import type { ScheduleResponse, WbsBoardResponse } from "@/types/api/work";

type RoomHomeState =
  | { kind: "loading" }
  | {
      board: WbsBoardResponse;
      members: ProjectRoomMemberResponse[];
      resources: ResourceResponse[];
      room: ProjectRoomResponse;
      schedules: ScheduleResponse[];
      suggestions: AgentSuggestionResponse[];
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

function formatDue(value?: string | null) {
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
      const [room, members, board, suggestions, resources, schedules] = await Promise.allSettled([
        projectRoomApi.get(roomId),
        projectRoomApi.getMembers(roomId),
        wbsApi.getBoard(roomId),
        agentApi.listRoomSuggestions(roomId, { status: "DRAFT" }),
        resourcesApi.listRoomResources(roomId),
        calendarApi.getEvents({ roomId, size: 5 }),
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
        board: settledOr(board, { roomId, tasks: [], wbsItems: [] }),
        kind: "ready",
        members: settledOr(members, { hasNext: false, items: [], page: 0, size: 0, totalElements: 0, totalPages: 0 }).items,
        resources: settledOr(resources, { hasNext: false, items: [], page: 0, size: 0, totalElements: 0, totalPages: 0 }).items,
        room: roomData,
        schedules: settledOr(schedules, { hasNext: false, items: [], page: 0, size: 0, totalElements: 0, totalPages: 0 }).items,
        suggestions: settledOr(suggestions, []),
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
          board: workspacePreviewWbsBoard(room.id),
          kind: "ready",
          members: workspacePreviewMembers,
          resources: workspacePreviewRoomResources.filter((resource) => resource.roomId === room.id),
          room,
          schedules: workspacePreviewSchedules(room.id),
          suggestions: workspacePreviewRoomSuggestions(room.id),
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

  const roomContent = useMemo(() => {
    if (state.kind !== "ready") return null;

    const activeTasks = state.board.tasks.filter((task) => task.status !== "DONE");
    const blockedTasks = activeTasks.filter((task) => task.status === "BLOCKED");
    const reviewTasks = activeTasks.filter((task) => task.status === "REVIEW");
    const reviewCount = reviewTasks.length + blockedTasks.length + state.suggestions.length;
    const nextSchedule = state.schedules[0] ?? null;

    return {
      activeTasks,
      nextSchedule,
      reviewCount,
      wbsItems: state.board.wbsItems,
    };
  }, [state]);

  return (
    <section className="workspace-route workspace-route--room-home" aria-labelledby="room-home-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="room-home-title">{state.kind === "ready" ? state.room.name : "프로젝트룸"}</h1>
          {state.kind === "ready" ? <p className="workspace-route__eyebrow">자료 · 작업 · 소통 · 일정</p> : null}
        </div>
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

      {state.kind === "ready" && roomContent ? (
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

          <div className="room-home__route-grid" aria-label="프로젝트룸 메뉴">
            <Link className="room-home__route-card" href={`/app/project-rooms/${roomId}/work`}>
              <ListChecks aria-hidden size={19} strokeWidth={1.9} />
              <span>
                <strong>WBS/칸반</strong>
                <small>작업 {roomContent.activeTasks.length}개</small>
              </span>
              <ChevronRight aria-hidden size={17} strokeWidth={1.9} />
            </Link>
            <Link className="room-home__route-card" href={`/app/project-rooms/${roomId}/resources`}>
              <FileText aria-hidden size={19} strokeWidth={1.9} />
              <span>
                <strong>자료</strong>
                <small>{state.resources.length}개</small>
              </span>
              <ChevronRight aria-hidden size={17} strokeWidth={1.9} />
            </Link>
            <Link className="room-home__route-card" href={`/app/chat?mode=room&roomId=${encodeURIComponent(roomId)}`}>
              <MessageCircle aria-hidden size={19} strokeWidth={1.9} />
              <span>
                <strong>소통</strong>
                <small>룸 대화</small>
              </span>
              <ChevronRight aria-hidden size={17} strokeWidth={1.9} />
            </Link>
            <Link className="room-home__route-card" href={`/app/calendar?roomId=${roomId}`}>
              <CalendarDays aria-hidden size={19} strokeWidth={1.9} />
              <span>
                <strong>일정</strong>
                <small>{roomContent.nextSchedule ? formatDue(roomContent.nextSchedule.startsAt) : "없음"}</small>
              </span>
              <ChevronRight aria-hidden size={17} strokeWidth={1.9} />
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
