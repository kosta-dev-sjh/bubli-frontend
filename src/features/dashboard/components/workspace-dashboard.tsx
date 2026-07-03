"use client";

import { AlertCircle, CheckCircle2, Clock3, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { activityApi } from "@/features/activity/api/activityApi";
import { dashboardApi } from "@/features/dashboard/api/dashboardApi";
import { MemoDashboardCard } from "@/features/memo/components";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { todoApi } from "@/features/todo/api/todoApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import {
  ACTIVE_PROJECT_ROOM_CHANGE_EVENT,
  getActiveProjectRoomId,
  getActiveProjectRoomLabel,
} from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewDashboard,
  workspacePreviewPersonalResources,
  workspacePreviewRoomResources,
  workspacePreviewRooms,
} from "@/lib/workspace-preview-data";
import type { ActivityLogResponse } from "@/types/api/activity";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";
import type { ResourceResponse } from "@/types/api/resource";
import type { DashboardWorkResponse, ScheduleResponse, TaskResponse } from "@/types/api/work";

type DashboardState =
  | { kind: "loading" }
  | { kind: "ready"; data: DashboardWorkResponse }
  | { kind: "empty"; data: DashboardWorkResponse }
  | { kind: "auth" }
  | { kind: "error"; message: string };

const emptyDashboard: DashboardWorkResponse = {
  todaySchedules: [],
  todayTasks: [],
  upcomingDeadlines: [],
};

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;
type ActivityFocusSummary = {
  logCount: number;
  topAppName: string | null;
  topWindowTitle: string | null;
  totalSeconds: number;
};

const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
};

function formatDue(t: TranslateFn, value?: string | null) {
  if (!value) {
    return t("dashboard.common.dueUndecided");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("dashboard.common.dueUndecided");
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatDuration(t: TranslateFn, seconds?: number | null) {
  if (!seconds || seconds < 0) {
    return t("dashboard.common.recording");
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.max(1, Math.floor((seconds % 3600) / 60));

  if (hours > 0) {
    return t("dashboard.common.hourMinute", { hours, minutes });
  }

  return t("dashboard.common.minute", { minutes });
}

function greetingKey(hour: number): MessageKey {
  if (hour >= 5 && hour < 12) return "dashboard.home.greetingMorning";
  if (hour >= 12 && hour < 18) return "dashboard.home.greetingAfternoon";
  return "dashboard.home.greetingEvening";
}

function hasDashboardItems(data: DashboardWorkResponse) {
  return (
    data.todayTasks.length + data.upcomingDeadlines.length + data.todaySchedules.length + (data.unreadNotificationCount ?? 0) > 0
  );
}

function StatusLine({ children, meta }: { children: string; meta?: string }) {
  return (
    <li className="workspace-dashboard__line">
      <span>{children}</span>
      {meta ? <b>{meta}</b> : null}
    </li>
  );
}

function TaskLine({
  deleting = false,
  onDelete,
  task,
}: {
  deleting?: boolean;
  onDelete?: (task: TaskResponse) => void;
  task: TaskResponse;
}) {
  const { t } = useI18n();

  return (
    <li className="workspace-dashboard__line">
      <span>{task.title}</span>
      <span className="workspace-dashboard__line-actions">
        <b>{formatDue(t, task.dueAt)}</b>
        {onDelete ? (
          <button
            aria-label={t("dashboard.task.deleteAria", { title: task.title })}
            className="workspace-dashboard__task-delete"
            disabled={deleting}
            onClick={() => onDelete(task)}
            type="button"
          >
            <Trash2 aria-hidden size={13} strokeWidth={2.1} />
            <span>{deleting ? t("dashboard.task.deleting") : t("dashboard.task.delete")}</span>
          </button>
        ) : null}
      </span>
    </li>
  );
}

function getActivitySeconds(activity: ActivityLogResponse) {
  if (typeof activity.durationSeconds === "number" && activity.durationSeconds >= 0) {
    return activity.durationSeconds;
  }

  const started = new Date(activity.startedAt).getTime();
  const ended = activity.endedAt ? new Date(activity.endedAt).getTime() : NaN;
  if (Number.isNaN(started) || Number.isNaN(ended) || ended <= started) return 0;

  return Math.floor((ended - started) / 1000);
}

// 데스크톱 앱이 자동으로 수집한 활동 기록만 요약한다(수동 기록 없음).
function summarizeActivityFocus(t: TranslateFn, logs: ActivityLogResponse[] | null, activeRoomId: string | null): ActivityFocusSummary | null {
  if (!logs) return null;

  const scopedLogs = activeRoomId ? logs.filter((activity) => activity.roomId === activeRoomId) : logs;
  const byApp = new Map<string, { seconds: number; title: string | null }>();
  let totalSeconds = 0;

  for (const activity of scopedLogs) {
    const seconds = getActivitySeconds(activity);
    totalSeconds += seconds;

    const appName = activity.appName?.trim() || t("dashboard.activity.appFallback");
    const current = byApp.get(appName) ?? { seconds: 0, title: null };
    current.seconds += seconds;
    current.title = activity.windowTitle?.trim() || current.title;
    byApp.set(appName, current);
  }

  const [topAppName, topApp] =
    [...byApp.entries()].sort((left, right) => right[1].seconds - left[1].seconds)[0] ?? [null, null];

  return {
    logCount: scopedLogs.length,
    topAppName,
    topWindowTitle: topApp?.title ?? null,
    totalSeconds,
  };
}

function ProjectRoomScopeSelector({
  activeRoomId,
  onSelect,
  rooms,
}: {
  activeRoomId: string | null;
  onSelect: (room: { label: string | null; roomId: string | null }) => void;
  rooms: ProjectRoomResponse[];
}) {
  const { t } = useI18n();

  if (rooms.length === 0) return null;

  return (
    <div className="workspace-dashboard__scope-strip" aria-label={t("dashboard.scope.aria")}>
      <button data-active={!activeRoomId ? "true" : undefined} onClick={() => onSelect({ label: null, roomId: null })} type="button">
        {t("dashboard.scope.all")}
      </button>
      {rooms.slice(0, 5).map((room) => (
        <button
          data-active={activeRoomId === room.id ? "true" : undefined}
          key={room.id}
          onClick={() => onSelect({ label: room.name, roomId: room.id })}
          type="button"
        >
          {room.name}
        </button>
      ))}
    </div>
  );
}

function SelectedProjectRoomSummary({
  room,
  schedules,
  tasks,
}: {
  room: ProjectRoomResponse | null;
  schedules: ScheduleResponse[];
  tasks: TaskResponse[];
}) {
  const { t } = useI18n();

  if (!room) return null;

  const reviewCount = tasks.filter((task) => task.status === "REVIEW" || task.status === "BLOCKED").length;
  const inProgressCount = tasks.filter((task) => task.status === "IN_PROGRESS").length;

  return (
    <GlassPanel className="workspace-dashboard__room-summary">
      <div>
        <span>{t("dashboard.roomSummary.selected")}</span>
        <strong>{room.name}</strong>
      </div>
      <dl>
        <div>
          <dt>{t("dashboard.roomSummary.todos")}</dt>
          <dd>{tasks.length}</dd>
        </div>
        <div>
          <dt>{t("dashboard.roomSummary.inProgress")}</dt>
          <dd>{inProgressCount}</dd>
        </div>
        <div>
          <dt>{t("dashboard.roomSummary.schedule")}</dt>
          <dd>{schedules.length}</dd>
        </div>
        <div>
          <dt>{t("dashboard.roomSummary.review")}</dt>
          <dd>{reviewCount}</dd>
        </div>
      </dl>
      <Link className="bubli-button bubli-button--quiet" href={`/app/project-rooms/${room.id}`}>
        {t("dashboard.common.viewRoom")}
      </Link>
    </GlassPanel>
  );
}

function DashboardLineList({ children }: { children: React.ReactNode }) {
  return <ul className="workspace-dashboard__list workspace-dashboard__list--compact">{children}</ul>;
}

function TodoWidget({
  canCreate,
  creating,
  deletingTaskId,
  notice,
  onCreate,
  onDelete,
  roomLabel,
  tasks,
}: {
  canCreate: boolean;
  creating: boolean;
  deletingTaskId: string | null;
  notice: string | null;
  onCreate: (title: string) => Promise<boolean>;
  onDelete: (task: TaskResponse) => void;
  roomLabel: string | null;
  tasks: TaskResponse[];
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");

  const submitTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await onCreate(title);
    if (saved) {
      setTitle("");
    }
  };

  return (
    <div className="workspace-dashboard__todo-widget">
      <form className="workspace-dashboard__todo-form" onSubmit={submitTodo}>
        <label>
          <span>{roomLabel ? t("dashboard.todo.roomLabel", { room: roomLabel }) : t("dashboard.todo.personalLabel")}</span>
          <input
            disabled={!canCreate || creating}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("dashboard.todo.placeholder")}
            value={title}
          />
        </label>
        <button disabled={!canCreate || creating} type="submit">
          <Plus aria-hidden size={14} strokeWidth={2.1} />
          <span>{creating ? t("dashboard.todo.adding") : t("dashboard.todo.add")}</span>
        </button>
      </form>
      {notice ? <p className="workspace-dashboard__todo-notice">{notice}</p> : null}
      {tasks.length > 0 ? (
        <DashboardLineList>
          {tasks.map((task) => (
            <TaskLine deleting={deletingTaskId === task.id} key={task.id} onDelete={onDelete} task={task} />
          ))}
        </DashboardLineList>
      ) : (
        <EmptyWidget />
      )}
    </div>
  );
}

function ResourceLine({ resource }: { resource: ResourceResponse }) {
  const { t } = useI18n();
  return <StatusLine meta={resource.visibility === "ROOM_SHARED" ? t("dashboard.resource.room") : t("dashboard.resource.personal")}>{resource.title}</StatusLine>;
}

function RoomLine({ room }: { room: ProjectRoomResponse }) {
  return (
    <li className="workspace-dashboard__line">
      <Link href={`/app/project-rooms/${room.id}`}>{room.name}</Link>
      {room.clientName ? <b>{room.clientName}</b> : null}
    </li>
  );
}

function EmptyWidget() {
  const { t } = useI18n();
  return <div className="workspace-dashboard__empty-widget">{t("dashboard.common.noData")}</div>;
}

function HomeCard({
  children,
  moreHref,
  title,
}: {
  children: React.ReactNode;
  moreHref?: string;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <GlassPanel className="workspace-dashboard__home-card">
      <div className="workspace-dashboard__home-card-head">
        <h2>{title}</h2>
        {moreHref ? (
          <Link className="workspace-dashboard__home-more" href={moreHref}>
            {t("dashboard.home.more")} <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
      <div className="workspace-dashboard__home-card-body">{children}</div>
    </GlassPanel>
  );
}

export function WorkspaceDashboard() {
  const { locale, t } = useI18n();
  const [state, setState] = useState<DashboardState>({ kind: "loading" });
  const [activeRoom, setActiveRoom] = useState<{ label: string | null; roomId: string | null }>({ label: null, roomId: null });
  const [personalTasks, setPersonalTasks] = useState<TaskResponse[]>([]);
  const [dashboardFeedTasks, setDashboardFeedTasks] = useState<TaskResponse[]>([]);
  const [personalResources, setPersonalResources] = useState<ResourceResponse[]>([]);
  const [creatingTodo, setCreatingTodo] = useState(false);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [todoNotice, setTodoNotice] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ProjectRoomResponse[]>([]);
  const [todayActivityLogs, setTodayActivityLogs] = useState<ActivityLogResponse[] | null>(null);
  // 인사말/날짜는 마운트 후에만 계산해 SSR-클라이언트 하이드레이션 불일치를 피한다.
  const [now, setNow] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardApi.getWork();
      setState(hasDashboardItems(data) ? { data, kind: "ready" } : { data, kind: "empty" });
      const [roomResult, personalTaskResult, dashboardTaskResult, personalResourceResult, activityResult] = await Promise.allSettled([
        projectRoomApi.list(),
        todoApi.list(),
        dashboardApi.getTasks(),
        resourcesApi.listPersonal(),
        activityApi.getToday(),
      ]);

      setRooms(roomResult.status === "fulfilled" ? roomResult.value.items : []);
      setPersonalTasks(personalTaskResult.status === "fulfilled" ? personalTaskResult.value.items : []);
      setDashboardFeedTasks(dashboardTaskResult.status === "fulfilled" ? dashboardTaskResult.value.items : []);
      setPersonalResources(personalResourceResult.status === "fulfilled" ? personalResourceResult.value.items : []);
      setTodayActivityLogs(activityResult.status === "fulfilled" ? activityResult.value : null);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        setState({ data: workspacePreviewDashboard, kind: "ready" });
        setRooms(workspacePreviewRooms);
        setTodayActivityLogs([]);
        return;
      }
      setState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("dashboard.state.loadFailed"),
      });
    }
  }, [t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      void fetchDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboard]);

  useEffect(() => {
    function syncActiveRoom(event?: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as { roomId?: string | null; roomLabel?: string | null } | null) : null;
      setActiveRoom({
        label: detail?.roomLabel ?? getActiveProjectRoomLabel(),
        roomId: detail?.roomId ?? getActiveProjectRoomId(),
      });
    }

    syncActiveRoom();
    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, syncActiveRoom);

    return () => {
      window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, syncActiveRoom);
    };
  }, []);

  const realData = state.kind === "ready" || state.kind === "empty" ? state.data : emptyDashboard;
  const data = useMemo<DashboardWorkResponse>(() => {
    if (!activeRoom.roomId) return realData;

    return {
      ...realData,
      todaySchedules: realData.todaySchedules.filter((schedule) => schedule.roomId === activeRoom.roomId),
      todayTasks: realData.todayTasks.filter((task) => task.roomId === activeRoom.roomId),
      upcomingDeadlines: realData.upcomingDeadlines.filter((task) => task.roomId === activeRoom.roomId),
    };
  }, [activeRoom.roomId, realData]);

  const scopedFeedTasks = activeRoom.roomId ? dashboardFeedTasks.filter((task) => task.roomId === activeRoom.roomId) : dashboardFeedTasks;
  const dashboardTasks = [...data.todayTasks, ...data.upcomingDeadlines, ...(activeRoom.roomId ? [] : personalTasks), ...scopedFeedTasks].filter(
    (task, index, source) => source.findIndex((item) => item.id === task.id) === index,
  );
  const taskItems = dashboardTasks.slice(0, 6);
  const todaySchedules = data.todaySchedules.slice(0, 4);
  const activityFocus = useMemo(() => summarizeActivityFocus(t, todayActivityLogs, activeRoom.roomId), [activeRoom.roomId, t, todayActivityLogs]);
  const canShowCards = state.kind === "ready" || state.kind === "empty";
  const recentResources = useMemo(() => {
    if (personalResources.length > 0) {
      const scoped = activeRoom.roomId ? personalResources.filter((resource) => resource.roomId === activeRoom.roomId) : personalResources;
      return scoped.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
    }

    if (!shouldUseWorkspacePreviewData()) return [];
    const resources = activeRoom.roomId
      ? workspacePreviewRoomResources.filter((resource) => resource.roomId === activeRoom.roomId)
      : [...workspacePreviewPersonalResources, ...workspacePreviewRoomResources];

    return resources.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
  }, [activeRoom.roomId, personalResources]);
  const activeRooms = useMemo(() => {
    const filtered = rooms.filter((room) => room.status === "ACTIVE");
    if (!activeRoom.roomId) return filtered;
    return filtered.filter((room) => room.id === activeRoom.roomId);
  }, [activeRoom.roomId, rooms]);
  const selectableRooms = useMemo(() => rooms.filter((room) => room.status === "ACTIVE"), [rooms]);
  const selectedRoom = useMemo(
    () => (activeRoom.roomId ? rooms.find((room) => room.id === activeRoom.roomId) ?? null : null),
    [activeRoom.roomId, rooms],
  );

  const upsertTask = useCallback((task: TaskResponse) => {
    if (!task.roomId) {
      setPersonalTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    }
    setState((current) => {
      if (current.kind !== "ready" && current.kind !== "empty") return current;
      return {
        data: {
          ...current.data,
          todayTasks: [task, ...current.data.todayTasks.filter((item) => item.id !== task.id)],
        },
        kind: "ready",
      };
    });
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setPersonalTasks((current) => current.filter((task) => task.id !== taskId));
    setDashboardFeedTasks((current) => current.filter((task) => task.id !== taskId));
    setState((current) => {
      if (current.kind !== "ready" && current.kind !== "empty") return current;
      return {
        ...current,
        data: {
          ...current.data,
          todayTasks: current.data.todayTasks.filter((task) => task.id !== taskId),
          upcomingDeadlines: current.data.upcomingDeadlines.filter((task) => task.id !== taskId),
        },
      };
    });
  }, []);

  const createTodo = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        setTodoNotice(t("dashboard.todo.needTitle"));
        return false;
      }

      setCreatingTodo(true);
      setTodoNotice(null);

      try {
        const created = activeRoom.roomId
          ? await todoApi.createRoomTask(activeRoom.roomId, { status: "TODO", title: trimmed })
          : await todoApi.create({ status: "TODO", title: trimmed });
        upsertTask(created);
        setTodoNotice(activeRoom.roomId ? t("dashboard.todo.createdRoom") : t("dashboard.todo.createdPersonal"));
        return true;
      } catch (error) {
        setTodoNotice(error instanceof ApiClientError && error.status === 401 ? t("dashboard.todo.loginRequired") : t("dashboard.todo.saveFailed"));
        return false;
      } finally {
        setCreatingTodo(false);
      }
    },
    [activeRoom.roomId, t, upsertTask],
  );

  const deleteTodo = useCallback(
    async (task: TaskResponse) => {
      setDeletingTodoId(task.id);
      setTodoNotice(null);

      try {
        await todoApi.delete(task.id);
        removeTask(task.id);
        setTodoNotice(t("dashboard.todo.deleted"));
      } catch (error) {
        setTodoNotice(error instanceof ApiClientError && error.status === 401 ? t("dashboard.todo.loginRequired") : t("dashboard.todo.deleteFailed"));
      } finally {
        setDeletingTodoId(null);
      }
    },
    [removeTask, t],
  );

  const todayLabel = now
    ? new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? "ko-KR", { day: "numeric", month: "long", weekday: "short" }).format(now)
    : null;
  const unreadCount = typeof realData.unreadNotificationCount === "number" ? realData.unreadNotificationCount : null;

  return (
    <section className="workspace-dashboard" aria-label={t("dashboard.aria")}>
      <GlassPanel className="workspace-dashboard__hero">
        <div className="workspace-dashboard__copy">
          <div className="workspace-dashboard__titlebar">
            <h1>{t("dashboard.title")}</h1>
            {now ? <span>{t(greetingKey(now.getHours()))}</span> : null}
          </div>
          <div className="workspace-dashboard__today-strip" aria-label={t("dashboard.home.summaryAria")}>
            {todayLabel ? (
              <span className="workspace-dashboard__today-item">
                <b>{todayLabel}</b>
              </span>
            ) : null}
            <span className="workspace-dashboard__today-item">
              <em>{t("dashboard.home.activeRoom")}</em>
              <b>{activeRoom.label ?? t("dashboard.scope.all")}</b>
            </span>
            <span className="workspace-dashboard__today-item">
              <em>{t("dashboard.metric.todos")}</em>
              <b>{dashboardTasks.length}</b>
            </span>
            <span className="workspace-dashboard__today-item">
              <em>{t("dashboard.metric.schedule")}</em>
              <b>{data.todaySchedules.length}</b>
            </span>
            {unreadCount !== null ? (
              <span className="workspace-dashboard__today-item">
                <em>{t("dashboard.home.unread")}</em>
                <b>{unreadCount}</b>
              </span>
            ) : null}
            {activityFocus && activityFocus.totalSeconds > 0 ? (
              <span className="workspace-dashboard__today-item">
                <em>{t("dashboard.metric.focus")}</em>
                <b>{formatDuration(t, activityFocus.totalSeconds)}</b>
              </span>
            ) : null}
          </div>
          <ProjectRoomScopeSelector activeRoomId={activeRoom.roomId} onSelect={setActiveRoom} rooms={selectableRooms} />
        </div>
      </GlassPanel>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-dashboard__state">
          <Clock3 aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("dashboard.state.loading")}</h2>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-dashboard__state">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("dashboard.state.authTitle")}</h2>
            <Link className="bubli-button bubli-button--primary" href="/login">
              {t("common.login")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-dashboard__state">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("dashboard.state.errorTitle")}</h2>
            <p>{state.message}</p>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "empty" ? (
        <GlassPanel className="workspace-dashboard__state">
          <CheckCircle2 aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("dashboard.state.emptyTitle")}</h2>
          </div>
        </GlassPanel>
      ) : null}

      {canShowCards ? (
        <>
          <SelectedProjectRoomSummary room={selectedRoom} schedules={todaySchedules} tasks={dashboardTasks} />
          <div className="workspace-dashboard__home-grid">
            <HomeCard moreHref="/app/calendar" title={t("dashboard.catalog.todayTodos.title")}>
              <TodoWidget
                canCreate={canShowCards}
                creating={creatingTodo}
                deletingTaskId={deletingTodoId}
                notice={todoNotice}
                onCreate={createTodo}
                onDelete={(task) => void deleteTodo(task)}
                roomLabel={activeRoom.label}
                tasks={taskItems}
              />
            </HomeCard>
            <HomeCard moreHref="/app/project-rooms" title={t("dashboard.catalog.projectRooms.title")}>
              {activeRooms.length > 0 ? (
                <DashboardLineList>
                  {activeRooms.slice(0, 4).map((room) => (
                    <RoomLine key={room.id} room={room} />
                  ))}
                </DashboardLineList>
              ) : (
                <EmptyWidget />
              )}
            </HomeCard>
            <HomeCard moreHref="/app/resources" title={t("dashboard.catalog.recentResources.title")}>
              {recentResources.length > 0 ? (
                <DashboardLineList>
                  {recentResources.map((resource) => (
                    <ResourceLine key={resource.id} resource={resource} />
                  ))}
                </DashboardLineList>
              ) : (
                <EmptyWidget />
              )}
            </HomeCard>
            <HomeCard title={t("dashboard.home.memoTitle")}>
              <MemoDashboardCard />
            </HomeCard>
          </div>
        </>
      ) : null}
    </section>
  );
}
