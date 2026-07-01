"use client";

import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  FileText,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
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
import type { ScheduleResponse, TaskResponse, WbsBoardResponse, WbsItemResponse } from "@/types/api/work";

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

function statusLabel(status?: string | null) {
  if (status === "DONE") return "완료";
  if (status === "IN_PROGRESS") return "진행";
  if (status === "REVIEW") return "검토";
  if (status === "BLOCKED") return "막힘";
  return "대기";
}

function taskTone(status?: string | null) {
  if (status === "DONE") return "success";
  if (status === "REVIEW") return "agent";
  if (status === "BLOCKED") return "warning";
  return "neutral";
}

function suggestionTypeLabel(type: AgentSuggestionResponse["suggestionType"]) {
  if (type === "WBS") return "작업 구조";
  if (type === "TODO" || type === "TASK") return "할 일";
  if (type === "SCHEDULE") return "일정";
  if (type === "QUESTION") return "확인 질문";
  if (type === "REQUIREMENT") return "요구사항";
  if (type === "CONTRACT_FIELD" || type === "CONTRACT_REVIEW") return "범위 확인";
  if (type === "REVIEW_ITEM") return "확인 항목";
  if (type === "DOCUMENT_DRAFT") return "문서 초안";
  if (type === "DAILY_SUMMARY") return "하루정리";
  return "후보";
}

function suggestionText(suggestion: AgentSuggestionResponse) {
  const preferred = ["title", "name", "label", "summary", "question", "description", "content"]
    .map((key) => suggestion.payloadJson[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return preferred ?? suggestionTypeLabel(suggestion.suggestionType);
}

function boardItemDue(item: TaskResponse | WbsItemResponse) {
  return "orderNo" in item ? null : item.dueAt;
}

function BoardMiniRow({ item, meta }: { item: TaskResponse | WbsItemResponse; meta?: string | null }) {
  const due = formatDue(boardItemDue(item));

  return (
    <article className="room-home__mini-row">
      <span className="workspace-route__dot" aria-hidden="true" />
      <span className="workspace-route__main">
        <strong>{item.title}</strong>
        {meta || due ? <span>{[meta, due].filter(Boolean).join(" · ")}</span> : null}
      </span>
      <StatusBadge tone={taskTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
    </article>
  );
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
    const urgentTasks = [...blockedTasks, ...reviewTasks, ...activeTasks.filter((task) => task.status === "IN_PROGRESS")].slice(0, 3);
    const checkItems = [
      ...state.suggestions.slice(0, 3).map((suggestion) => ({
        id: suggestion.suggestionId,
        label: suggestionText(suggestion),
        meta: suggestionTypeLabel(suggestion.suggestionType),
        tone: "agent" as const,
      })),
      ...blockedTasks.slice(0, 2).map((task) => ({
        id: task.id,
        label: task.title,
        meta: "막힌 작업",
        tone: "warning" as const,
      })),
    ].slice(0, 4);
    const reviewCount = reviewTasks.length + blockedTasks.length + state.suggestions.length;
    const nextSchedule = state.schedules[0] ?? null;
    const recentResources = state.resources.slice(0, 3);
    const readySuggestions = state.suggestions.slice(0, 3);
    const wbsTitleById = Object.fromEntries(state.board.wbsItems.map((item) => [item.id, item.title]));

    return {
      activeTasks,
      checkItems,
      nextSchedule,
      readySuggestions,
      recentResources,
      reviewCount,
      urgentTasks,
      wbsTitleById,
      wbsItems: state.board.wbsItems,
    };
  }, [state]);

  return (
    <section className="workspace-route workspace-route--room-home" aria-labelledby="room-home-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="room-home-title">{state.kind === "ready" ? state.room.name : "프로젝트룸"}</h1>
          {state.kind === "ready" ? <p className="workspace-route__eyebrow">이 룸에서 자료, 작업, 소통, 일정을 이어서 봅니다</p> : null}
        </div>
        {state.kind === "ready" ? (
          <div className="workspace-route__actions">
            <Link className="bubli-button" href={`/app/project-rooms/${roomId}/work`}>
              WBS/칸반
            </Link>
            <Link className="bubli-button" href={`/app/project-rooms/${roomId}/resources`}>
              자료
            </Link>
            <Link className="bubli-button" href={`/app/desktop/widgets?autoOpen=chat&roomId=${encodeURIComponent(roomId)}`}>
              소통
            </Link>
          </div>
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

      {state.kind === "ready" && roomContent ? (
        <>
          <div className="workspace-route__summary" aria-label="프로젝트룸 상태">
            <span>{state.room.status === "CLOSED" ? "종료" : "진행 중"}</span>
            <span>멤버 {state.members.length}</span>
            {state.room.clientName ? <span>{state.room.clientName}</span> : null}
            {formatMoney(state.room.contractAmount) ? <span>{formatMoney(state.room.contractAmount)}</span> : null}
            {formatDate(state.room.paymentDueDate) ? <span>입금 {formatDate(state.room.paymentDueDate)}</span> : null}
            {paymentLabel(state.room) && !formatMoney(state.room.contractAmount) ? <span>{paymentLabel(state.room)}</span> : null}
          </div>

          <GlassPanel className="workspace-route__section">
            <div className="workspace-route__section-head">
              <div>
                <strong>현재 작업 맥락</strong>
                <span>이 프로젝트룸에서 승인한 내용만 작업판, 일정, 대시보드와 버블 표시로 이어집니다</span>
              </div>
              <Sparkles aria-hidden size={18} strokeWidth={1.9} />
            </div>
            <div className="workspace-route__split">
              <div className="workspace-route__list">
                <article className="workspace-route__row">
                  <FileText aria-hidden size={18} strokeWidth={1.9} />
                  <span className="workspace-route__main">
                    <strong>프로젝트룸 자료</strong>
                    <span>
                      {roomContent.recentResources.length > 0
                        ? roomContent.recentResources.map((resource) => resource.title).join(" · ")
                        : "업무 범위 문서, 요구사항, 회의록을 먼저 올립니다"}
                    </span>
                  </span>
                  <span className="workspace-route__status">{state.resources.length}개</span>
                </article>
                <article className="workspace-route__row">
                  <Sparkles aria-hidden size={18} strokeWidth={1.9} />
                  <span className="workspace-route__main">
                    <strong>에이전트 후보</strong>
                    <span>
                      {roomContent.readySuggestions.length > 0
                        ? roomContent.readySuggestions.map((suggestion) => suggestionTypeLabel(suggestion.suggestionType)).join(" · ")
                        : "확인 질문, WBS, TODO 후보가 여기에 모입니다"}
                    </span>
                  </span>
                  <span className="workspace-route__status">{state.suggestions.length}개</span>
                </article>
              </div>

              <div className="workspace-route__list">
                <Link className="room-home__quick-link" href={`/app/project-rooms/${roomId}/work`}>
                  <ListChecks aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>WBS와 칸반 작업판</strong>
                    <span>승인한 요구사항과 TODO를 이 룸 기준으로 정리</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/calendar?roomId=${roomId}`}>
                  <CalendarDays aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>일정</strong>
                    <span>{roomContent.nextSchedule ? `${roomContent.nextSchedule.title} · ${formatDue(roomContent.nextSchedule.startsAt)}` : "납품일과 회의 일정을 연결"}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
              </div>
            </div>
          </GlassPanel>

          <div className="room-home__metrics" aria-label="프로젝트룸 작업 요약">
            <GlassPanel className="room-home__metric">
              <ListChecks aria-hidden size={18} strokeWidth={1.9} />
              <span>WBS</span>
              <strong>{roomContent.wbsItems.length}</strong>
            </GlassPanel>
            <GlassPanel className="room-home__metric">
              <span>진행 작업</span>
              <strong>{roomContent.activeTasks.length}</strong>
            </GlassPanel>
            <GlassPanel className="room-home__metric">
              <Sparkles aria-hidden size={18} strokeWidth={1.9} />
              <span>확인</span>
              <strong>{roomContent.reviewCount}</strong>
            </GlassPanel>
            <GlassPanel className="room-home__metric">
              <FileText aria-hidden size={18} strokeWidth={1.9} />
              <span>자료</span>
              <strong>{state.resources.length}</strong>
            </GlassPanel>
          </div>

          <div className="room-home__resource-grid">
            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>다음에 볼 것</strong>
                  <span>확인 후보와 진행 중 작업</span>
                </div>
              </div>
              <div className="workspace-route__list">
                {roomContent.checkItems.length > 0 ? (
                  roomContent.checkItems.map((item) => (
                    <article className="room-home__mini-row" key={item.id}>
                      <span className="workspace-route__dot" aria-hidden="true" />
                      <span className="workspace-route__main">
                        <strong>{item.label}</strong>
                        <span>{item.meta}</span>
                      </span>
                      <StatusBadge tone={item.tone}>확인</StatusBadge>
                    </article>
                  ))
                ) : roomContent.urgentTasks.length > 0 ? (
                  roomContent.urgentTasks.map((task) => (
                    <BoardMiniRow item={task} key={task.id} meta={task.wbsItemId ? roomContent.wbsTitleById[task.wbsItemId] : null} />
                  ))
                ) : (
                  <p className="workspace-route__empty">현재 데이터가 없습니다</p>
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>다음 행동</strong>
                  <span>상세 화면으로 이동</span>
                </div>
              </div>
              <div className="room-home__quick-stack">
                <Link className="room-home__quick-link" href={`/app/project-rooms/${roomId}/work`}>
                  <ListChecks aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>WBS/칸반</strong>
                    <span>WBS {roomContent.wbsItems.length}개, 진행 작업 {roomContent.activeTasks.length}개</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/project-rooms/${roomId}/resources`}>
                  <FileText aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>자료</strong>
                    <span>프로젝트룸 자료 {state.resources.length}개</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/desktop/widgets?autoOpen=chat&roomId=${encodeURIComponent(roomId)}`}>
                  <MessageCircle aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>소통</strong>
                    <span>자료와 작업 맥락을 유지한 룸 대화</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/calendar?roomId=${roomId}`}>
                  <CalendarDays aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{roomContent.nextSchedule?.title ?? "일정"}</strong>
                    <span>{roomContent.nextSchedule ? formatDue(roomContent.nextSchedule.startsAt) : "현재 데이터가 없습니다"}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
              </div>
            </GlassPanel>
          </div>

          {state.members.length > 0 ? (
            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <UsersRound aria-hidden size={18} strokeWidth={2} />
                <strong>멤버</strong>
              </div>
              <div className="workspace-route__summary" aria-label="멤버 요약">
                {state.members.slice(0, 4).map((member) => (
                  <article className="workspace-route__row" key={member.userId}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{member.name}</strong>
                      <span>{member.bubliId ?? "참여 중"}</span>
                    </span>
                    <span className="workspace-route__status">{member.role === "PROJECT_LEADER" ? "리더" : "멤버"}</span>
                  </article>
                ))}
                {state.members.length > 4 ? <span>외 {state.members.length - 4}명</span> : null}
              </div>
            </GlassPanel>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
