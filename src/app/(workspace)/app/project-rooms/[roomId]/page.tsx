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
import { useI18n, type MessageKey } from "@/lib/i18n";
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

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function settledOr<T>(result: SettledValue<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function paymentLabelKey(room: ProjectRoomResponse): MessageKey | null {
  if (!room.contractAmount && room.paymentStatus === "NOT_RECORDED") return null;
  if (room.paymentStatus === "PAID") return "room.detail.payment.paid";
  if (room.paymentStatus === "OVERDUE") return "room.detail.payment.overdue";
  return "room.detail.payment.recorded";
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

function statusLabelKey(status?: string | null): MessageKey {
  if (status === "DONE") return "room.status.done";
  if (status === "IN_PROGRESS") return "room.status.inProgress";
  if (status === "REVIEW") return "room.status.review";
  if (status === "BLOCKED") return "room.status.blocked";
  return "room.status.waiting";
}

function taskTone(status?: string | null) {
  if (status === "DONE") return "success";
  if (status === "REVIEW") return "agent";
  if (status === "BLOCKED") return "warning";
  return "neutral";
}

function suggestionTypeLabelKey(type: AgentSuggestionResponse["suggestionType"]): MessageKey {
  if (type === "WBS") return "room.detail.suggestion.wbs";
  if (type === "TODO" || type === "TASK") return "room.detail.suggestion.todo";
  if (type === "SCHEDULE") return "room.detail.suggestion.schedule";
  if (type === "QUESTION") return "room.detail.suggestion.question";
  if (type === "REQUIREMENT") return "room.detail.suggestion.requirement";
  if (type === "CONTRACT_FIELD" || type === "CONTRACT_REVIEW") return "room.detail.suggestion.scope";
  if (type === "REVIEW_ITEM") return "room.detail.suggestion.reviewItem";
  if (type === "DOCUMENT_DRAFT") return "room.detail.suggestion.documentDraft";
  if (type === "DAILY_SUMMARY") return "room.detail.suggestion.dailySummary";
  return "room.detail.suggestion.fallback";
}

function suggestionText(suggestion: AgentSuggestionResponse, t: Translate) {
  const preferred = ["title", "name", "label", "summary", "question", "description", "content"]
    .map((key) => suggestion.payloadJson[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return preferred ?? t(suggestionTypeLabelKey(suggestion.suggestionType));
}

function boardItemDue(item: TaskResponse | WbsItemResponse) {
  return "orderNo" in item ? null : item.dueAt;
}

function BoardMiniRow({ item, meta, t }: { item: TaskResponse | WbsItemResponse; meta?: string | null; t: Translate }) {
  const due = formatDue(boardItemDue(item));

  return (
    <article className="room-home__mini-row">
      <span className="workspace-route__dot" aria-hidden="true" />
      <span className="workspace-route__main">
        <strong>{item.title}</strong>
        {meta || due ? <span>{[meta, due].filter(Boolean).join(" · ")}</span> : null}
      </span>
      <StatusBadge tone={taskTone(item.status)}>{t(statusLabelKey(item.status))}</StatusBadge>
    </article>
  );
}

export default function ProjectRoomHomePage() {
  const { t } = useI18n();
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
        throw roomError instanceof Error ? roomError : new Error(t("room.detail.loadFailed"));
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
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("room.detail.loadFailed"),
      });
    }
  }, [roomId, t]);

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
        label: suggestionText(suggestion, t),
        meta: t(suggestionTypeLabelKey(suggestion.suggestionType)),
        tone: "agent" as const,
      })),
      ...blockedTasks.slice(0, 2).map((task) => ({
        id: task.id,
        label: task.title,
        meta: t("room.detail.blockedTask"),
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
  }, [state, t]);

  return (
    <section className="workspace-route workspace-route--room-home" aria-labelledby="room-home-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="room-home-title">{state.kind === "ready" ? state.room.name : t("room.fallbackName")}</h1>
          {state.kind === "ready" ? <p className="workspace-route__eyebrow">{t("room.detail.eyebrow")}</p> : null}
        </div>
        {state.kind === "ready" ? (
          <div className="workspace-route__actions">
            <Link className="bubli-button" href={`/app/project-rooms/${roomId}/work`}>
              {t("room.detail.tabWork")}
            </Link>
            <Link className="bubli-button" href={`/app/project-rooms/${roomId}/resources`}>
              {t("room.detail.tabResources")}
            </Link>
            <Link className="bubli-button" href={`/app/desktop/widgets?autoOpen=chat&roomId=${encodeURIComponent(roomId)}`}>
              {t("room.detail.tabChat")}
            </Link>
          </div>
        ) : null}
      </header>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{t("room.loading")}</strong>
        </GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>{t("room.authTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("common.login")}
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-route__panel">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <strong>{state.message}</strong>
          <Button onClick={() => void load()} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            {t("room.reconnect")}
          </Button>
          <Link className="bubli-button" href="/app/project-rooms">
            {t("room.list")}
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" && roomContent ? (
        <>
          <div className="workspace-route__summary" aria-label={t("room.detail.summaryLabel")}>
            <span>{state.room.status === "CLOSED" ? t("room.detail.statusClosed") : t("room.detail.statusActive")}</span>
            <span>{t("room.detail.memberCount", { count: state.members.length })}</span>
            {state.room.clientName ? <span>{state.room.clientName}</span> : null}
            {formatMoney(state.room.contractAmount) ? <span>{formatMoney(state.room.contractAmount)}</span> : null}
            {formatDate(state.room.paymentDueDate) ? <span>{t("room.detail.paymentPrefix", { date: formatDate(state.room.paymentDueDate) ?? "" })}</span> : null}
            {paymentLabelKey(state.room) && !formatMoney(state.room.contractAmount) ? <span>{t(paymentLabelKey(state.room) as MessageKey)}</span> : null}
          </div>

          <GlassPanel className="workspace-route__section">
            <div className="workspace-route__section-head">
              <div>
                <strong>{t("room.detail.contextTitle")}</strong>
                <span>{t("room.detail.contextSub")}</span>
              </div>
              <Sparkles aria-hidden size={18} strokeWidth={1.9} />
            </div>
            <div className="workspace-route__split">
              <div className="workspace-route__list">
                <article className="workspace-route__row">
                  <FileText aria-hidden size={18} strokeWidth={1.9} />
                  <span className="workspace-route__main">
                    <strong>{t("room.detail.resourcesTitle")}</strong>
                    <span>
                      {roomContent.recentResources.length > 0
                        ? roomContent.recentResources.map((resource) => resource.title).join(" · ")
                        : t("room.detail.resourcesEmpty")}
                    </span>
                  </span>
                  <span className="workspace-route__status">{t("room.detail.countUnit", { count: state.resources.length })}</span>
                </article>
                <article className="workspace-route__row">
                  <Sparkles aria-hidden size={18} strokeWidth={1.9} />
                  <span className="workspace-route__main">
                    <strong>{t("room.detail.suggestionsTitle")}</strong>
                    <span>
                      {roomContent.readySuggestions.length > 0
                        ? roomContent.readySuggestions.map((suggestion) => t(suggestionTypeLabelKey(suggestion.suggestionType))).join(" · ")
                        : t("room.detail.suggestionsEmpty")}
                    </span>
                  </span>
                  <span className="workspace-route__status">{t("room.detail.countUnit", { count: state.suggestions.length })}</span>
                </article>
              </div>

              <div className="workspace-route__list">
                <Link className="room-home__quick-link" href={`/app/project-rooms/${roomId}/work`}>
                  <ListChecks aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{t("room.detail.workLinkTitle")}</strong>
                    <span>{t("room.detail.workLinkSub")}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/calendar?roomId=${roomId}`}>
                  <CalendarDays aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{t("room.detail.scheduleTitle")}</strong>
                    <span>{roomContent.nextSchedule ? `${roomContent.nextSchedule.title} · ${formatDue(roomContent.nextSchedule.startsAt)}` : t("room.detail.scheduleEmpty")}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
              </div>
            </div>
          </GlassPanel>

          <div className="room-home__metrics" aria-label={t("room.detail.metricsLabel")}>
            <GlassPanel className="room-home__metric">
              <ListChecks aria-hidden size={18} strokeWidth={1.9} />
              <span>{t("room.detail.metricWbs")}</span>
              <strong>{roomContent.wbsItems.length}</strong>
            </GlassPanel>
            <GlassPanel className="room-home__metric">
              <span>{t("room.detail.metricActive")}</span>
              <strong>{roomContent.activeTasks.length}</strong>
            </GlassPanel>
            <GlassPanel className="room-home__metric">
              <Sparkles aria-hidden size={18} strokeWidth={1.9} />
              <span>{t("room.detail.metricCheck")}</span>
              <strong>{roomContent.reviewCount}</strong>
            </GlassPanel>
            <GlassPanel className="room-home__metric">
              <FileText aria-hidden size={18} strokeWidth={1.9} />
              <span>{t("room.detail.metricResources")}</span>
              <strong>{state.resources.length}</strong>
            </GlassPanel>
          </div>

          <div className="room-home__resource-grid">
            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>{t("room.detail.nextTitle")}</strong>
                  <span>{t("room.detail.nextSub")}</span>
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
                      <StatusBadge tone={item.tone}>{t("room.detail.check")}</StatusBadge>
                    </article>
                  ))
                ) : roomContent.urgentTasks.length > 0 ? (
                  roomContent.urgentTasks.map((task) => (
                    <BoardMiniRow item={task} key={task.id} meta={task.wbsItemId ? roomContent.wbsTitleById[task.wbsItemId] : null} t={t} />
                  ))
                ) : (
                  <p className="workspace-route__empty">{t("room.noData")}</p>
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>{t("room.detail.nextActionTitle")}</strong>
                  <span>{t("room.detail.nextActionSub")}</span>
                </div>
              </div>
              <div className="room-home__quick-stack">
                <Link className="room-home__quick-link" href={`/app/project-rooms/${roomId}/work`}>
                  <ListChecks aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{t("room.detail.quickWorkTitle")}</strong>
                    <span>{t("room.detail.quickWorkSub", { active: roomContent.activeTasks.length, wbs: roomContent.wbsItems.length })}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/project-rooms/${roomId}/resources`}>
                  <FileText aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{t("room.detail.quickResourceTitle")}</strong>
                    <span>{t("room.detail.quickResourceSub", { count: state.resources.length })}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/desktop/widgets?autoOpen=chat&roomId=${encodeURIComponent(roomId)}`}>
                  <MessageCircle aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{t("room.detail.quickChatTitle")}</strong>
                    <span>{t("room.detail.quickChatSub")}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.9} />
                </Link>
                <Link className="room-home__quick-link" href={`/app/calendar?roomId=${roomId}`}>
                  <CalendarDays aria-hidden size={18} strokeWidth={1.9} />
                  <span>
                    <strong>{roomContent.nextSchedule?.title ?? t("room.detail.scheduleTitle")}</strong>
                    <span>{roomContent.nextSchedule ? formatDue(roomContent.nextSchedule.startsAt) : t("room.noData")}</span>
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
                <strong>{t("room.detail.membersTitle")}</strong>
              </div>
              <div className="workspace-route__summary" aria-label={t("room.detail.membersLabel")}>
                {state.members.slice(0, 4).map((member) => (
                  <article className="workspace-route__row" key={member.userId}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{member.name}</strong>
                      <span>{member.bubliId ?? t("room.detail.memberJoined")}</span>
                    </span>
                    <span className="workspace-route__status">{member.role === "PROJECT_LEADER" ? t("room.detail.roleLeader") : t("room.detail.roleMember")}</span>
                  </article>
                ))}
                {state.members.length > 4 ? <span>{t("room.detail.moreMembers", { count: state.members.length - 4 })}</span> : null}
              </div>
            </GlassPanel>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
