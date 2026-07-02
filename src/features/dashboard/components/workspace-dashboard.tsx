"use client";

import { DndContext, DragOverlay, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DashboardGrid, DashboardPalette, DashboardWidgetTile, WIDGET_CATALOG, sizeToClass, widgetIcon } from "@/components/dashboard";
import type { DashboardWidgetDef } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { activityApi } from "@/features/activity/api/activityApi";
import { dashboardApi } from "@/features/dashboard/api/dashboardApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { timerApi } from "@/features/timer/api/timerApi";
import { todoApi } from "@/features/todo/api/todoApi";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { readWidgetSummary } from "@/lib/widget";
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
import type { TimeLogResponse } from "@/types/api/timer";
import type { WidgetSummaryResponse, WidgetTodayUsageSummaryResponse } from "@/types/api/widget";
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
const DASHBOARD_TIMER_HEARTBEAT_INTERVAL_MS = 60_000;
let dashboardWidgetLayoutSnapshot = [...defaultWidgetIds];
type DashboardTimerAction = "idle" | "starting" | "pausing" | "resuming" | "stopping";
type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;
type ActivityFocusSummary = {
  logCount: number;
  topAppName: string | null;
  topWindowTitle: string | null;
  totalSeconds: number;
};

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

function formatTime(t: TranslateFn, value?: string | null) {
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

function formatMetricDuration(t: TranslateFn, seconds: number) {
  if (seconds <= 0) return t("dashboard.metricDuration.zero");

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.max(1, Math.floor((seconds % 3600) / 60));
  if (hours > 0) return t("dashboard.metricDuration.hour", { hours });

  return t("dashboard.metricDuration.minute", { minutes });
}

function getTimerSeconds(timer: DashboardWorkResponse["runningTimer"]) {
  if (!timer) return null;
  if (typeof timer.durationSeconds === "number") return timer.durationSeconds;

  const startedAt = timer.lastStartedAt ?? timer.startedAt;
  const started = startedAt ? new Date(startedAt).getTime() : NaN;
  if (timer.status !== "RUNNING" || Number.isNaN(started)) return null;

  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function makeTimerIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `dashboard-timer-${crypto.randomUUID()}`;
  }

  return `dashboard-timer-${Date.now()}`;
}

function timerActionLabel(t: TranslateFn, timer?: DashboardWorkResponse["runningTimer"]) {
  if (timer?.status === "RUNNING") return t("dashboard.timer.statusRunning");
  if (timer?.status === "PAUSED") return t("dashboard.timer.statusPaused");
  if (timer?.status === "NEEDS_RECOVERY") return t("dashboard.timer.statusRecovery");
  return t("dashboard.timer.statusWaiting");
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

function ScheduleLine({ schedule }: { schedule: ScheduleResponse }) {
  const { t } = useI18n();
  return <StatusLine meta={formatTime(t, schedule.startsAt)}>{schedule.title}</StatusLine>;
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

function getActivitySeconds(activity: ActivityLogResponse) {
  if (typeof activity.durationSeconds === "number" && activity.durationSeconds >= 0) {
    return activity.durationSeconds;
  }

  const started = new Date(activity.startedAt).getTime();
  const ended = activity.endedAt ? new Date(activity.endedAt).getTime() : NaN;
  if (Number.isNaN(started) || Number.isNaN(ended) || ended <= started) return 0;

  return Math.floor((ended - started) / 1000);
}

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

function DashboardSummary({
  activityFocus,
  data,
  enabledBubbleCount,
  tasks,
  widgetUsageSummary,
}: {
  activityFocus: ActivityFocusSummary | null;
  data: DashboardWorkResponse;
  enabledBubbleCount: number | null;
  tasks: TaskResponse[];
  widgetUsageSummary: WidgetTodayUsageSummaryResponse | null;
}) {
  const { t } = useI18n();
  const reviewCount = tasks.filter((task) => task.status === "REVIEW" || task.status === "BLOCKED").length;
  const timerActive = data.runningTimer ? 1 : 0;
  const bubbleUsageCount = widgetUsageSummary ? widgetUsageSummary.totalOpenCount + widgetUsageSummary.totalInteractionCount : null;
  const metrics = [
    { label: t("dashboard.metric.todos"), progress: getMetricProgress(tasks.length, 8), tone: "task", value: tasks.length },
    { label: t("dashboard.metric.schedule"), progress: getMetricProgress(data.todaySchedules.length, 6), tone: "schedule", value: data.todaySchedules.length },
    { label: t("dashboard.metric.review"), progress: getMetricProgress(reviewCount, 5), tone: "review", value: reviewCount },
    { label: t("dashboard.metric.timer"), progress: timerActive ? 100 : 0, tone: "timer", value: timerActive ? t("dashboard.metric.timerOn") : "0" },
    ...(bubbleUsageCount !== null
      ? [{ label: t("dashboard.metric.bubbleUsage"), progress: getMetricProgress(bubbleUsageCount, 24), tone: "bubble", value: bubbleUsageCount }]
      : enabledBubbleCount !== null
        ? [{ label: t("dashboard.metric.bubbleActive"), progress: getMetricProgress(enabledBubbleCount, 8), tone: "bubble", value: enabledBubbleCount }]
        : []),
    ...(activityFocus
      ? [
          {
            label: t("dashboard.metric.focus"),
            progress: getMetricProgress(Math.round(activityFocus.totalSeconds / 60), 240),
            tone: "focus",
            value: formatMetricDuration(t, activityFocus.totalSeconds),
          },
        ]
      : []),
  ];

  return (
    <div className="workspace-dashboard__summary-wrap">
      <div className="workspace-dashboard__summary">
        {metrics.map((metric) => (
          <DashboardMetricRing key={metric.label} {...metric} />
        ))}
      </div>
      <div className="workspace-dashboard__summary-insights">
        {widgetUsageSummary ? (
          <span>
            {t("dashboard.insight.bubbleUsage", {
              open: widgetUsageSummary.totalOpenCount,
              interaction: widgetUsageSummary.totalInteractionCount,
              visible: formatDuration(t, widgetUsageSummary.totalVisibleSeconds),
            })}
          </span>
        ) : (
          <span>{enabledBubbleCount !== null ? t("dashboard.insight.bubbleActive", { count: enabledBubbleCount }) : t("dashboard.insight.bubbleNone")}</span>
        )}
        {activityFocus ? (
          <span>
            {activityFocus.totalSeconds > 0
              ? t("dashboard.insight.focusApp", {
                  app: activityFocus.topAppName ?? t("dashboard.insight.focusAppFallback"),
                  duration: formatDuration(t, activityFocus.totalSeconds),
                })
              : activityFocus.logCount > 0
                ? t("dashboard.insight.focusNoTime")
                : t("dashboard.insight.focusNone")}
          </span>
        ) : (
          <span>{t("dashboard.insight.focusConsent")}</span>
        )}
      </div>
    </div>
  );
}

function NextFocusWidget({
  activityFocus,
  nextSchedule,
  nextTask,
  runningTimer,
}: {
  activityFocus: ActivityFocusSummary | null;
  nextSchedule: ScheduleResponse | null;
  nextTask: TaskResponse | null;
  runningTimer?: DashboardWorkResponse["runningTimer"];
}) {
  const { t } = useI18n();

  if (!nextTask && !nextSchedule && !runningTimer && !activityFocus?.totalSeconds) {
    return <EmptyWidget />;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {runningTimer ? (
        <div className="workspace-dashboard__timer-preview">
          <b>{formatDuration(t, getTimerSeconds(runningTimer))}</b>
          <span>{nextTask ? t("dashboard.nextFocus.continueTask", { title: nextTask.title }) : t("dashboard.nextFocus.hasOngoing")}</span>
        </div>
      ) : activityFocus?.totalSeconds ? (
        <div className="workspace-dashboard__timer-preview workspace-dashboard__timer-preview--compact">
          <b>{formatDuration(t, activityFocus.totalSeconds)}</b>
          <span>{activityFocus.topAppName ? t("dashboard.nextFocus.focusApp", { app: activityFocus.topAppName }) : t("dashboard.nextFocus.focusRecorded")}</span>
          {activityFocus.topWindowTitle ? <small>{activityFocus.topWindowTitle}</small> : null}
        </div>
      ) : null}
      <DashboardLineList>
        {nextTask ? <TaskLine task={nextTask} /> : null}
        {nextSchedule ? <ScheduleLine schedule={nextSchedule} /> : null}
      </DashboardLineList>
    </div>
  );
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

function EmptyWidget() {
  const { t } = useI18n();
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
  const { t } = useI18n();
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
        title={t(def.titleKey)}
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
}: {
  boardDragging: boolean;
  children: React.ReactNode;
  editMode: boolean;
  sorting: boolean;
}) {
  const { t } = useI18n();
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
      {editMode ? <DashboardCanvasRemoveDropzone active={boardDragging} /> : null}
    </section>
  );
}

function DashboardCanvasRemoveDropzone({ active }: { active: boolean }) {
  const { t } = useI18n();
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
  const [creatingTodo, setCreatingTodo] = useState(false);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [todoNotice, setTodoNotice] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ProjectRoomResponse[]>([]);
  const [todayActivityLogs, setTodayActivityLogs] = useState<ActivityLogResponse[] | null>(null);
  const [todayWidgetUsageSummary, setTodayWidgetUsageSummary] = useState<WidgetTodayUsageSummaryResponse | null>(null);
  const [widgetSummary, setWidgetSummary] = useState<WidgetSummaryResponse | null>(null);
  const [widgetIds, setWidgetIds] = useState(() => readStoredWidgetIds());
  const [timerAction, setTimerAction] = useState<DashboardTimerAction>("idle");
  const [timerMessage, setTimerMessage] = useState<string | null>(null);
  const timerRecoveryAttemptedRef = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardApi.getWork();
      setState(hasDashboardItems(data) ? { data, kind: "ready" } : { data, kind: "empty" });
      const [roomResult, personalTaskResult, widgetSummaryResult, widgetUsageResult, activityResult] = await Promise.allSettled([
        projectRoomApi.list(),
        todoApi.list(),
        readWidgetSummary(),
        widgetApi.getTodayUsageRollups(),
        activityApi.getToday(),
      ]);

      setRooms(roomResult.status === "fulfilled" ? roomResult.value.items : []);
      setPersonalTasks(personalTaskResult.status === "fulfilled" ? personalTaskResult.value.items : []);
      setWidgetSummary(widgetSummaryResult.status === "fulfilled" && widgetSummaryResult.value.status === "ready" ? widgetSummaryResult.value.data : null);
      setTodayWidgetUsageSummary(widgetUsageResult.status === "fulfilled" ? widgetUsageResult.value : null);
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
        setTodayWidgetUsageSummary(null);
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

  const recordDashboardTimerState = useCallback((timeLog: TimeLogResponse) => {
    if (!isTauriRuntime()) return;

    void tauriCommands
      .recordTimerState({
        roomId: timeLog.roomId ?? null,
        serverTimeLogId: timeLog.id,
        startedAt: timeLog.startedAt,
        status: timeLog.status,
      })
      .catch(() => undefined);
  }, []);

  const applyDashboardTimerResult = useCallback(
    (timeLog: TimeLogResponse) => {
      setState((current) => {
        if (current.kind !== "ready" && current.kind !== "empty") return current;

        const nextData = {
          ...current.data,
          runningTimer: timeLog.status === "ENDED" ? null : timeLog,
        };

        return hasDashboardItems(nextData) ? { data: nextData, kind: "ready" } : { data: nextData, kind: "empty" };
      });
      recordDashboardTimerState(timeLog);
    },
    [recordDashboardTimerState],
  );

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
  const activeDashboardTimer = data.runningTimer ?? null;
  const roomFilteredRunningTimer = activeRoom.roomId && realData.runningTimer && !activeDashboardTimer ? realData.runningTimer : null;
  const timerBusy = timerAction !== "idle";
  const activeHeartbeatTimerId = realData.runningTimer?.status === "RUNNING" ? realData.runningTimer.id : null;

  useEffect(() => {
    if (timerRecoveryAttemptedRef.current) return;
    if (state.kind !== "ready" && state.kind !== "empty") return;
    if (!isTauriRuntime()) return;

    timerRecoveryAttemptedRef.current = true;
    let cancelled = false;

    async function recoverDashboardTimerFromLocalState() {
      const recovery = await tauriCommands.recoverTimerState().catch(() => null);
      if (cancelled || !recovery?.recoveryRequired || !recovery.serverTimeLogId) return;

      const timeLog = await timerApi.heartbeat(recovery.serverTimeLogId).catch(() => null);
      if (cancelled || !timeLog) return;

      applyDashboardTimerResult(timeLog);
    }

    void recoverDashboardTimerFromLocalState();

    return () => {
      cancelled = true;
    };
  }, [applyDashboardTimerResult, state.kind]);

  useEffect(() => {
    if (!activeHeartbeatTimerId) return;

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      void timerApi
        .heartbeat(activeHeartbeatTimerId)
        .then((timeLog) => {
          if (!cancelled) {
            applyDashboardTimerResult(timeLog);
          }
        })
        .catch(() => undefined);
    }, DASHBOARD_TIMER_HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeHeartbeatTimerId, applyDashboardTimerResult]);

  const runDashboardTimerAction = useCallback(
    async (action: Exclude<DashboardTimerAction, "idle">) => {
      const currentTimer = data.runningTimer ?? realData.runningTimer ?? null;
      setTimerAction(action);
      setTimerMessage(null);

      try {
        if (action === "starting") {
          const roomId = activeRoom.roomId ?? null;
          const timeLog = await timerApi.start({
            idempotencyKey: makeTimerIdempotencyKey(),
            roomId,
            timerType: roomId ? "WORK" : "GENERAL",
          });
          applyDashboardTimerResult(timeLog);
          setTimerMessage(t("dashboard.timer.started"));
          return;
        }

        if (!currentTimer) {
          setTimerMessage(t("dashboard.timer.noRunning"));
          return;
        }

        const timeLog =
          action === "pausing"
            ? await timerApi.pause(currentTimer.id)
            : action === "resuming"
              ? await timerApi.resume(currentTimer.id)
              : await timerApi.stop(currentTimer.id);

        applyDashboardTimerResult(timeLog);
        setTimerMessage(action === "pausing" ? t("dashboard.timer.paused") : action === "resuming" ? t("dashboard.timer.resumed") : t("dashboard.timer.stopped"));
      } catch (error) {
        setTimerMessage(error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("dashboard.timer.requestFailed"));
      } finally {
        setTimerAction("idle");
      }
    },
    [activeRoom.roomId, applyDashboardTimerResult, data.runningTimer, realData.runningTimer, t],
  );

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
  const activityFocus = useMemo(() => summarizeActivityFocus(t, todayActivityLogs, activeRoom.roomId), [activeRoom.roomId, t, todayActivityLogs]);
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
          return (
            <DashboardSummary
              activityFocus={activityFocus}
              data={data}
              enabledBubbleCount={enabledBubbleCount}
              tasks={dashboardTasks}
              widgetUsageSummary={todayWidgetUsageSummary}
            />
          );
        case "next-focus":
          return <NextFocusWidget activityFocus={activityFocus} nextSchedule={nextFocusSchedule} nextTask={nextFocusTask} runningTimer={data.runningTimer} />;
        case "today-todos":
          return (
            <TodoWidget
              canCreate={state.kind === "ready" || state.kind === "empty"}
              creating={creatingTodo}
              deletingTaskId={deletingTodoId}
              notice={todoNotice}
              onCreate={createTodo}
              onDelete={(task) => void deleteTodo(task)}
              roomLabel={activeRoom.label}
              tasks={taskItems}
            />
          );
        case "pending-approval":
          if (reviewTasks.length === 0) return <EmptyWidget />;
          return (
            <DashboardLineList>
              {reviewTasks.map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </DashboardLineList>
          );
        case "schedule":
          if (todaySchedules.length === 0) return <EmptyWidget />;
          return (
            <DashboardLineList>
              {todaySchedules.map((schedule) => (
                <ScheduleLine key={schedule.id} schedule={schedule} />
              ))}
            </DashboardLineList>
          );
        case "project-rooms":
          if (activeRooms.length === 0) return <EmptyWidget />;
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
          return (
            <div className="workspace-dashboard__timer-preview">
              <b>{formatDuration(t, getTimerSeconds(activeDashboardTimer))}</b>
              <span>
                {activeDashboardTimer
                  ? timerActionLabel(t, activeDashboardTimer)
                  : roomFilteredRunningTimer
                    ? t("dashboard.timer.otherRoom")
                    : inProgressTask
                      ? t("dashboard.timer.taskRunning", { title: inProgressTask.title })
                      : t("dashboard.timer.idle")}
              </span>
              <div className="workspace-dashboard__timer-actions" aria-label={t("dashboard.timer.actionsAria")} role="group">
                <Button
                  aria-label={t("dashboard.timer.startAria")}
                  className="workspace-dashboard__timer-action"
                  disabled={timerBusy || Boolean(realData.runningTimer)}
                  icon={<Play size={13} strokeWidth={2.2} />}
                  loading={timerAction === "starting"}
                  onClick={() => void runDashboardTimerAction("starting")}
                  size="sm"
                  variant="primary"
                >
                  {t("dashboard.timer.start")}
                </Button>
                <Button
                  aria-label={t("dashboard.timer.pauseAria")}
                  className="workspace-dashboard__timer-action"
                  disabled={timerBusy || activeDashboardTimer?.status !== "RUNNING"}
                  icon={<Pause size={13} strokeWidth={2.2} />}
                  loading={timerAction === "pausing"}
                  onClick={() => void runDashboardTimerAction("pausing")}
                  size="sm"
                  variant="secondary"
                >
                  {t("dashboard.timer.pause")}
                </Button>
                <Button
                  aria-label={t("dashboard.timer.resumeAria")}
                  className="workspace-dashboard__timer-action"
                  disabled={timerBusy || activeDashboardTimer?.status !== "PAUSED"}
                  icon={<RotateCcw size={13} strokeWidth={2.2} />}
                  loading={timerAction === "resuming"}
                  onClick={() => void runDashboardTimerAction("resuming")}
                  size="sm"
                  variant="secondary"
                >
                  {t("dashboard.timer.resume")}
                </Button>
                <Button
                  aria-label={t("dashboard.timer.stopAria")}
                  className="workspace-dashboard__timer-action"
                  disabled={timerBusy || !activeDashboardTimer || activeDashboardTimer.status === "ENDED"}
                  icon={<Square size={12} strokeWidth={2.4} />}
                  loading={timerAction === "stopping"}
                  onClick={() => void runDashboardTimerAction("stopping")}
                  size="sm"
                  variant="quiet"
                >
                  {t("dashboard.timer.stop")}
                </Button>
              </div>
              {timerMessage ? <small aria-live="polite">{timerMessage}</small> : null}
            </div>
          );
        case "recent-resources":
          if (recentResources.length === 0) return <EmptyWidget />;
          return (
            <DashboardLineList>
              {recentResources.map((resource) => (
                <ResourceLine key={resource.id} resource={resource} />
              ))}
            </DashboardLineList>
          );
        default:
          return null;
      }
    },
    [
      activeRoom.label,
      activeDashboardTimer,
      activeRooms,
      activityFocus,
      createTodo,
      creatingTodo,
      dashboardTasks,
      data,
      deleteTodo,
      deletingTodoId,
      enabledBubbleCount,
      inProgressTask,
      nextFocusSchedule,
      nextFocusTask,
      realData.runningTimer,
      recentResources,
      reviewTasks,
      roomFilteredRunningTimer,
      runDashboardTimerAction,
      state.kind,
      t,
      taskItems,
      timerAction,
      timerBusy,
      timerMessage,
      todaySchedules,
      todayWidgetUsageSummary,
      todoNotice,
    ],
  );

  return (
    <section className="workspace-dashboard" aria-label={t("dashboard.aria")}>
      <GlassPanel className="workspace-dashboard__hero">
        <div className="workspace-dashboard__copy">
          <div className="workspace-dashboard__titlebar">
            <h1>{t("dashboard.title")}</h1>
            <span>{t("dashboard.personalHome")}</span>
          </div>
          <ProjectRoomScopeSelector activeRoomId={activeRoom.roomId} onSelect={setActiveRoom} rooms={selectableRooms} />
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
          <SelectedProjectRoomSummary room={selectedRoom} schedules={todaySchedules} tasks={dashboardTasks} />
          <div className={`workspace-dashboard__stage${editMode ? " workspace-dashboard__stage--editing" : ""}`}>
            <DashboardCanvas boardDragging={Boolean(activeBoardWidgetId)} editMode={editMode} sorting={Boolean(activeBoardWidgetId)}>
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
                <strong>{t(activePaletteWidget.titleKey)}</strong>
              </div>
            ) : activeBoardWidget ? (
              <div className={`bubli-dash-tile ${sizeToClass[activeBoardWidget.size]} bubli-dash-tile--overlay`}>
                <div className="bubli-dash-tile__head">
                  <span className="bubli-dash-tile__title">
                    <span className="bubli-dash-tile__icon">{widgetIcon(activeBoardWidget.widgetId)}</span>
                    {t(activeBoardWidget.titleKey)}
                  </span>
                </div>
                <div className="bubli-dash-tile__body">{t(activeBoardWidget.descriptionKey)}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}
    </section>
  );
}
