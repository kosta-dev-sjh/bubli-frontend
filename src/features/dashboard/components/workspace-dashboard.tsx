"use client";

import { DndContext, DragOverlay, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, CheckCircle2, Clock3, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardGrid, DashboardPalette, DashboardWidgetTile, WIDGET_CATALOG, sizeToClass, widgetIcon } from "@/components/dashboard";
import type { DashboardWidgetDef } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { dashboardApi } from "@/features/dashboard/api/dashboardApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { todoApi } from "@/features/todo/api/todoApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n, type MessageKey } from "@/lib/i18n";
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
import type { ProjectRoomResponse } from "@/types/api/projectRoom";
import type { ResourceResponse } from "@/types/api/resource";
import type { WidgetSummaryResponse } from "@/types/api/widget";
import type { DashboardWorkResponse, ScheduleResponse, TaskResponse } from "@/types/api/work";

// 번역 함수 시그니처. 모듈 레벨 헬퍼/컴포넌트에 t를 넘길 때 사용한다.
type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

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

const connectedWidgetIds = [
  "today-summary",
  "next-focus",
  "today-todos",
  "schedule",
  "project-rooms",
  "pending-approval",
  "timer",
  "recent-resources",
];
const defaultWidgetIds = ["today-summary", "next-focus", "today-todos", "schedule", "project-rooms", "pending-approval", "timer"];
const dashboardDropzoneId = "dashboard-canvas";
const dashboardRemoveDropzoneId = "dashboard-remove-card";
let dashboardWidgetLayoutSnapshot = [...defaultWidgetIds];

function normalizeWidgetIds(ids: string[]) {
  const seen = new Set<string>();
  const normalized = ids.filter((id) => {
    if (!connectedWidgetIds.includes(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return normalized.length > 0 ? normalized : [...defaultWidgetIds];
}

function readStoredWidgetIds() {
  return normalizeWidgetIds(dashboardWidgetLayoutSnapshot);
}

function storeWidgetIds(ids: string[]) {
  dashboardWidgetLayoutSnapshot = normalizeWidgetIds(ids);
}

function formatTime(value: string | null | undefined, t: Translate) {
  if (!value) {
    return t("dashboard.common.timeUndecided");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("dashboard.common.timeUndecided");
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDue(value: string | null | undefined, t: Translate) {
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

function formatDuration(seconds: number | null | undefined, t: Translate) {
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

function getTimerSeconds(timer: DashboardWorkResponse["runningTimer"]) {
  if (!timer) return null;
  if (typeof timer.durationSeconds === "number") return timer.durationSeconds;

  const startedAt = timer.lastStartedAt ?? timer.startedAt;
  const started = startedAt ? new Date(startedAt).getTime() : NaN;
  if (timer.status !== "RUNNING" || Number.isNaN(started)) return null;

  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function hasDashboardItems(data: DashboardWorkResponse) {
  return (
    data.todayTasks.length +
      data.upcomingDeadlines.length +
      data.todaySchedules.length +
      (data.runningTimer ? 1 : 0) +
      (data.unreadNotificationCount ?? 0) >
    0
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

function TaskLine({ task, t }: { task: TaskResponse; t: Translate }) {
  return <StatusLine meta={formatDue(task.dueAt, t)}>{task.title}</StatusLine>;
}

function ScheduleLine({ schedule, t }: { schedule: ScheduleResponse; t: Translate }) {
  return <StatusLine meta={formatTime(schedule.startsAt, t)}>{schedule.title}</StatusLine>;
}

function pickNextTask(tasks: TaskResponse[]) {
  const inProgressTask = tasks.find((task) => task.status === "IN_PROGRESS");
  if (inProgressTask) return inProgressTask;

  const withDueDate = tasks
    .filter((task) => task.status !== "DONE" && task.dueAt)
    .sort((left, right) => new Date(left.dueAt ?? "").getTime() - new Date(right.dueAt ?? "").getTime());
  if (withDueDate[0]) return withDueDate[0];

  return tasks.find((task) => task.status !== "DONE") ?? null;
}

function pickNextSchedule(schedules: ScheduleResponse[]) {
  const now = Date.now();
  const sorted = schedules
    .filter((schedule) => schedule.startsAt)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  return sorted.find((schedule) => new Date(schedule.startsAt).getTime() >= now) ?? sorted[0] ?? null;
}

function getMetricProgress(value: number, max: number) {
  if (value <= 0) return 0;
  return Math.min(100, Math.max(18, Math.round((value / max) * 100)));
}

function DashboardMetricRing({ label, progress, tone, value }: { label: string; progress: number; tone: string; value: number | string }) {
  return (
    <div className="workspace-dashboard__metric-ring" data-tone={tone}>
      <span className="workspace-dashboard__metric-ring-graph" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" />
          <path
            d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
            style={{ strokeDasharray: `${progress}, 100` }}
          />
        </svg>
        <b>{value}</b>
      </span>
      <span>{label}</span>
    </div>
  );
}

function DashboardSummary({ data, enabledBubbleCount, t, tasks }: { data: DashboardWorkResponse; enabledBubbleCount: number | null; t: Translate; tasks: TaskResponse[] }) {
  const reviewCount = tasks.filter((task) => task.status === "REVIEW" || task.status === "BLOCKED").length;
  const timerActive = data.runningTimer ? 1 : 0;
  const metrics = [
    { label: t("dashboard.metric.todos"), progress: getMetricProgress(tasks.length, 8), tone: "task", value: tasks.length },
    { label: t("dashboard.metric.schedule"), progress: getMetricProgress(data.todaySchedules.length, 6), tone: "schedule", value: data.todaySchedules.length },
    { label: t("dashboard.metric.review"), progress: getMetricProgress(reviewCount, 5), tone: "review", value: reviewCount },
    { label: t("dashboard.metric.timer"), progress: timerActive ? 100 : 0, tone: "timer", value: timerActive ? t("dashboard.metric.timerOn") : "0" },
    ...(enabledBubbleCount !== null
      ? [{ label: t("dashboard.metric.bubble"), progress: getMetricProgress(enabledBubbleCount, 8), tone: "bubble", value: enabledBubbleCount }]
      : []),
  ];

  return (
    <div className="workspace-dashboard__summary">
      {metrics.map((metric) => (
        <DashboardMetricRing key={metric.label} {...metric} />
      ))}
    </div>
  );
}

function NextFocusWidget({
  nextSchedule,
  nextTask,
  runningTimer,
  t,
}: {
  nextSchedule: ScheduleResponse | null;
  nextTask: TaskResponse | null;
  runningTimer?: DashboardWorkResponse["runningTimer"];
  t: Translate;
}) {
  if (!nextTask && !nextSchedule && !runningTimer) {
    return <EmptyWidget t={t} />;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {runningTimer ? (
        <div className="workspace-dashboard__timer-preview">
          <b>{formatDuration(getTimerSeconds(runningTimer), t)}</b>
          <span>{nextTask ? t("dashboard.nextFocus.continueTask", { title: nextTask.title }) : t("dashboard.nextFocus.hasOngoing")}</span>
        </div>
      ) : null}
      <DashboardLineList>
        {nextTask ? <TaskLine task={nextTask} t={t} /> : null}
        {nextSchedule ? <ScheduleLine schedule={nextSchedule} t={t} /> : null}
      </DashboardLineList>
    </div>
  );
}

function ProjectRoomScopeSelector({
  activeRoomId,
  onSelect,
  rooms,
  t,
}: {
  activeRoomId: string | null;
  onSelect: (room: { label: string | null; roomId: string | null }) => void;
  rooms: ProjectRoomResponse[];
  t: Translate;
}) {
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
  t,
  tasks,
}: {
  room: ProjectRoomResponse | null;
  schedules: ScheduleResponse[];
  t: Translate;
  tasks: TaskResponse[];
}) {
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

function ResourceLine({ resource, t }: { resource: ResourceResponse; t: Translate }) {
  return <StatusLine meta={resource.visibility === "ROOM_SHARED" ? t("dashboard.resource.room") : t("dashboard.resource.personal")}>{resource.title}</StatusLine>;
}

function EmptyWidget({ t }: { t: Translate }) {
  return <div className="workspace-dashboard__empty-widget">{t("dashboard.common.noData")}</div>;
}

function SortableDashboardTile({
  children,
  def,
  editMode,
  onRemove,
}: {
  children: React.ReactNode;
  def: DashboardWidgetDef;
  editMode: boolean;
  onRemove: () => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: def.widgetId });
  const dragHandleProps = { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>;

  return (
    <div
      ref={setNodeRef}
      className={sizeToClass[def.size]}
      style={{
        minWidth: 0,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <DashboardWidgetTile
        dragHandleProps={dragHandleProps}
        dragging={isDragging}
        editMode={editMode}
        icon={widgetIcon(def.widgetId)}
        interactive
        onRemove={onRemove}
        size={def.size}
        title={def.title}
      >
        {children}
      </DashboardWidgetTile>
    </div>
  );
}

function DashboardCanvas({
  boardDragging,
  children,
  editMode,
  sorting,
  t,
}: {
  boardDragging: boolean;
  children: React.ReactNode;
  editMode: boolean;
  sorting: boolean;
  t: Translate;
}) {
  const { isOver, setNodeRef } = useDroppable({
    disabled: !editMode,
    id: dashboardDropzoneId,
  });

  return (
    <section
      className="workspace-dashboard__canvas"
      data-drop-active={isOver ? "true" : undefined}
      data-sorting={sorting ? "true" : undefined}
      ref={setNodeRef}
      aria-label={t("dashboard.canvas.placeAria")}
    >
      {children}
      {editMode ? <DashboardCanvasRemoveDropzone active={boardDragging} t={t} /> : null}
    </section>
  );
}

function DashboardCanvasRemoveDropzone({ active, t }: { active: boolean; t: Translate }) {
  const { isOver, setNodeRef } = useDroppable({
    disabled: !active,
    id: dashboardRemoveDropzoneId,
  });

  return (
    <div
      className="workspace-dashboard__remove-drop"
      data-drop-active={isOver ? "true" : undefined}
      data-visible={active ? "true" : undefined}
      ref={setNodeRef}
    >
      <span>{t("dashboard.canvas.removeHint")}</span>
    </div>
  );
}

export function WorkspaceDashboard() {
  const { t } = useI18n();
  const [state, setState] = useState<DashboardState>({ kind: "loading" });
  const [editMode, setEditMode] = useState(false);
  const [activeBoardWidgetId, setActiveBoardWidgetId] = useState<string | null>(null);
  const [activePaletteWidgetId, setActivePaletteWidgetId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<{ label: string | null; roomId: string | null }>({ label: null, roomId: null });
  const [personalTasks, setPersonalTasks] = useState<TaskResponse[]>([]);
  const [rooms, setRooms] = useState<ProjectRoomResponse[]>([]);
  const [widgetSummary, setWidgetSummary] = useState<WidgetSummaryResponse | null>(null);
  const [widgetIds, setWidgetIds] = useState(() => readStoredWidgetIds());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardApi.getWork();
      setState(hasDashboardItems(data) ? { data, kind: "ready" } : { data, kind: "empty" });
      const [roomResult, personalTaskResult, widgetSummaryResult] = await Promise.allSettled([
        projectRoomApi.list(),
        todoApi.list(),
        widgetApi.getSummary(),
      ]);

      setRooms(roomResult.status === "fulfilled" ? roomResult.value.items : []);
      setPersonalTasks(personalTaskResult.status === "fulfilled" ? personalTaskResult.value.items : []);
      setWidgetSummary(widgetSummaryResult.status === "fulfilled" ? widgetSummaryResult.value : null);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        setState({ data: workspacePreviewDashboard, kind: "ready" });
        setRooms(workspacePreviewRooms);
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

  useEffect(() => {
    storeWidgetIds(widgetIds);
  }, [widgetIds]);

  const realData = state.kind === "ready" || state.kind === "empty" ? state.data : emptyDashboard;
  const data = useMemo<DashboardWorkResponse>(() => {
    if (!activeRoom.roomId) return realData;

    return {
      ...realData,
      runningTimer: realData.runningTimer?.roomId === activeRoom.roomId ? realData.runningTimer : null,
      todaySchedules: realData.todaySchedules.filter((schedule) => schedule.roomId === activeRoom.roomId),
      todayTasks: realData.todayTasks.filter((task) => task.roomId === activeRoom.roomId),
      upcomingDeadlines: realData.upcomingDeadlines.filter((task) => task.roomId === activeRoom.roomId),
    };
  }, [activeRoom.roomId, realData]);
  const dashboardTasks = [...data.todayTasks, ...data.upcomingDeadlines, ...(activeRoom.roomId ? [] : personalTasks)].filter(
    (task, index, source) => source.findIndex((item) => item.id === task.id) === index,
  );
  const taskItems = dashboardTasks
    .filter((task, index, source) => source.findIndex((item) => item.id === task.id) === index)
    .slice(0, 4);
  const todaySchedules = data.todaySchedules.slice(0, 4);
  const reviewTasks = dashboardTasks
    .filter((task, index, source) => (task.status === "REVIEW" || task.status === "BLOCKED") && source.findIndex((item) => item.id === task.id) === index)
    .slice(0, 4);
  const nextFocusTask = pickNextTask(dashboardTasks);
  const nextFocusSchedule = pickNextSchedule(todaySchedules);
  const canShowDashboardGrid = state.kind === "ready" || state.kind === "empty";
  const inProgressTask = dashboardTasks.find((task) => task.status === "IN_PROGRESS") ?? null;
  const enabledBubbleCount = widgetSummary ? widgetSummary.bubbles.filter((bubble) => bubble.enabled).length : null;
  const recentResources = useMemo(() => {
    if (!shouldUseWorkspacePreviewData()) return [];
    const resources = activeRoom.roomId
      ? workspacePreviewRoomResources.filter((resource) => resource.roomId === activeRoom.roomId)
      : [...workspacePreviewPersonalResources, ...workspacePreviewRoomResources];

    return resources.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  }, [activeRoom.roomId]);
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
  const visibleWidgets = useMemo(
    () =>
      widgetIds
        .filter((id) => connectedWidgetIds.includes(id))
        .map((id) => WIDGET_CATALOG.find((widget) => widget.widgetId === id))
        .filter((widget): widget is DashboardWidgetDef => Boolean(widget)),
    [widgetIds],
  );
  const availableWidgets = WIDGET_CATALOG.filter(
    (widget) => connectedWidgetIds.includes(widget.widgetId) && !widgetIds.includes(widget.widgetId),
  );

  const activePaletteWidget = activePaletteWidgetId ? WIDGET_CATALOG.find((widget) => widget.widgetId === activePaletteWidgetId) ?? null : null;
  const activeBoardWidget = activeBoardWidgetId ? WIDGET_CATALOG.find((widget) => widget.widgetId === activeBoardWidgetId) ?? null : null;
  const dashboardCollisionDetection = useCallback<CollisionDetection>((args) => {
    const activeId = String(args.active.id);
    const droppableContainers = activeId.startsWith("palette:")
      ? args.droppableContainers
      : args.droppableContainers.filter((container) => container.id !== dashboardDropzoneId);

    return closestCenter({ ...args, droppableContainers });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith("palette:")) {
      setActivePaletteWidgetId(activeId.replace("palette:", ""));
      setActiveBoardWidgetId(null);
      return;
    }

    setActiveBoardWidgetId(activeId);
    setActivePaletteWidgetId(null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    setActivePaletteWidgetId(null);
    setActiveBoardWidgetId(null);

    if (!overId || activeId === overId) {
      return;
    }

    if (activeId.startsWith("palette:")) {
      const widgetId = activeId.replace("palette:", "");
      setWidgetIds((current) => {
        if (current.includes(widgetId)) return current;
        if (overId === dashboardRemoveDropzoneId) return current;
        if (overId === dashboardDropzoneId || overId.startsWith("palette:")) return [...current, widgetId];

        const overIndex = current.indexOf(overId);
        if (overIndex < 0) return [...current, widgetId];

        const next = [...current];
        next.splice(overIndex, 0, widgetId);
        return next;
      });
      return;
    }

    setWidgetIds((current) => {
      if (overId === dashboardRemoveDropzoneId) {
        return current.filter((id) => id !== activeId);
      }

      const activeIndex = current.indexOf(activeId);
      const overIndex = current.indexOf(overId);
      if (activeIndex < 0 || overIndex < 0) return current;
      return arrayMove(current, activeIndex, overIndex);
    });
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith("palette:") || activeId === overId || overId === dashboardDropzoneId || overId === dashboardRemoveDropzoneId) return;

    setWidgetIds((current) => {
      const activeIndex = current.indexOf(activeId);
      const overIndex = current.indexOf(overId);
      if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return current;
      return arrayMove(current, activeIndex, overIndex);
    });
  }, []);

  const handleDragCancel = useCallback(() => {
    setActivePaletteWidgetId(null);
    setActiveBoardWidgetId(null);
  }, []);

  const renderWidgetBody = useCallback(
    (widgetId: string) => {
      switch (widgetId) {
        case "today-summary":
          return <DashboardSummary data={data} enabledBubbleCount={enabledBubbleCount} t={t} tasks={dashboardTasks} />;
        case "next-focus":
          return <NextFocusWidget nextSchedule={nextFocusSchedule} nextTask={nextFocusTask} runningTimer={data.runningTimer} t={t} />;
        case "today-todos":
          if (taskItems.length === 0) return <EmptyWidget t={t} />;
          return (
            <DashboardLineList>
              {taskItems.map((task) => (
                <TaskLine key={task.id} task={task} t={t} />
              ))}
            </DashboardLineList>
          );
        case "pending-approval":
          if (reviewTasks.length === 0) return <EmptyWidget t={t} />;
          return (
            <DashboardLineList>
              {reviewTasks.map((task) => (
                <TaskLine key={task.id} task={task} t={t} />
              ))}
            </DashboardLineList>
          );
        case "schedule":
          if (todaySchedules.length === 0) return <EmptyWidget t={t} />;
          return (
            <DashboardLineList>
              {todaySchedules.map((schedule) => (
                <ScheduleLine key={schedule.id} schedule={schedule} t={t} />
              ))}
            </DashboardLineList>
          );
        case "project-rooms":
          if (activeRooms.length === 0) return <EmptyWidget t={t} />;
          return (
            <DashboardLineList>
              {activeRooms.slice(0, 4).map((room) => (
                <StatusLine key={room.id} meta={room.clientName ?? undefined}>
                  {room.name}
                </StatusLine>
              ))}
            </DashboardLineList>
          );
        case "timer":
          if (!data.runningTimer && !inProgressTask) return <EmptyWidget t={t} />;
          return (
            <div className="workspace-dashboard__timer-preview">
              <b>{formatDuration(getTimerSeconds(data.runningTimer), t)}</b>
              <span>{inProgressTask ? t("dashboard.timer.taskRunning", { title: inProgressTask.title }) : t("dashboard.timer.running")}</span>
            </div>
          );
        case "recent-resources":
          if (recentResources.length === 0) return <EmptyWidget t={t} />;
          return (
            <DashboardLineList>
              {recentResources.map((resource) => (
                <ResourceLine key={resource.id} resource={resource} t={t} />
              ))}
            </DashboardLineList>
          );
        default:
          return null;
      }
    },
    [activeRooms, dashboardTasks, data, enabledBubbleCount, inProgressTask, nextFocusSchedule, nextFocusTask, recentResources, reviewTasks, t, taskItems, todaySchedules],
  );

  return (
    <section className="workspace-dashboard" aria-label={t("dashboard.aria")}>
      <GlassPanel className="workspace-dashboard__hero">
        <div className="workspace-dashboard__copy">
          <div className="workspace-dashboard__titlebar">
            <h1>{t("dashboard.title")}</h1>
            <span>{t("dashboard.personalHome")}</span>
          </div>
          <ProjectRoomScopeSelector activeRoomId={activeRoom.roomId} onSelect={setActiveRoom} rooms={selectableRooms} t={t} />
        </div>
        {canShowDashboardGrid ? (
          <div className="workspace-dashboard__actions">
            {editMode ? (
              <Button onClick={() => setWidgetIds([...defaultWidgetIds])} variant="secondary">
                {t("dashboard.action.default")}
              </Button>
            ) : null}
            <Button onClick={() => setEditMode((current) => !current)} variant={editMode ? "primary" : "secondary"}>
              <LayoutDashboard aria-hidden size={15} strokeWidth={1.9} />
              {editMode ? t("dashboard.action.done") : t("dashboard.action.edit")}
            </Button>
          </div>
        ) : null}
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

      {canShowDashboardGrid ? (
        <DndContext
          collisionDetection={dashboardCollisionDetection}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SelectedProjectRoomSummary room={selectedRoom} schedules={todaySchedules} t={t} tasks={dashboardTasks} />
          <div className={`workspace-dashboard__stage${editMode ? " workspace-dashboard__stage--editing" : ""}`}>
            <DashboardCanvas boardDragging={Boolean(activeBoardWidgetId)} editMode={editMode} sorting={Boolean(activeBoardWidgetId)} t={t}>
              <div className="workspace-dashboard__canvas-head">
                <div>
                  <strong>{t("dashboard.board.title")}</strong>
                  <span>
                    {editMode
                      ? t("dashboard.board.editing")
                      : activeRoom.roomId
                        ? t("dashboard.board.roomItems", { room: activeRoom.label ?? t("dashboard.board.roomFallback") })
                        : t("dashboard.board.cardCount", { count: visibleWidgets.length })}
                  </span>
                </div>
                {editMode ? <StatusBadge tone="agent">{t("dashboard.board.autoSave")}</StatusBadge> : null}
              </div>
              <SortableContext items={visibleWidgets.map((widget) => widget.widgetId)} strategy={rectSortingStrategy}>
                <DashboardGrid mode={editMode ? "edit" : "view"}>
                  {visibleWidgets.map((widget) => (
                    <SortableDashboardTile
                      def={widget}
                      editMode={editMode}
                      key={widget.widgetId}
                      onRemove={() => setWidgetIds((current) => current.filter((id) => id !== widget.widgetId))}
                    >
                      {renderWidgetBody(widget.widgetId)}
                    </SortableDashboardTile>
                  ))}
                </DashboardGrid>
              </SortableContext>
            </DashboardCanvas>

            {editMode ? (
              <aside className="workspace-dashboard__palette" aria-label={t("dashboard.board.addAria")}>
                <DashboardPalette
                  draggable
                  items={availableWidgets}
                  onAdd={(widgetId) => setWidgetIds((current) => (current.includes(widgetId) ? current : [...current, widgetId]))}
                />
              </aside>
            ) : null}
          </div>
          <DragOverlay>
            {activePaletteWidget ? (
              <div className="bubli-dash-palette__drag-preview">
                <span className="bubli-dash-tile__icon">{widgetIcon(activePaletteWidget.widgetId)}</span>
                <strong>{activePaletteWidget.title}</strong>
              </div>
            ) : activeBoardWidget ? (
              <div className={`bubli-dash-tile ${sizeToClass[activeBoardWidget.size]} bubli-dash-tile--overlay`}>
                <div className="bubli-dash-tile__head">
                  <span className="bubli-dash-tile__title">
                    <span className="bubli-dash-tile__icon">{widgetIcon(activeBoardWidget.widgetId)}</span>
                    {activeBoardWidget.title}
                  </span>
                </div>
                <div className="bubli-dash-tile__body">{activeBoardWidget.description}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}
    </section>
  );
}
