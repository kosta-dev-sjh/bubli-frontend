"use client";

import { DndContext, DragOverlay, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, CheckCircle2, Clock3, LayoutDashboard, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DashboardGrid, DashboardPalette, DashboardWidgetTile, WIDGET_CATALOG, sizeToClass, widgetIcon } from "@/components/dashboard";
import type { DashboardWidgetDef } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Ring } from "@/components/ui/ring";
import { activityApi } from "@/features/activity/api/activityApi";
import { agentApi } from "@/features/agent/api/agentApi";
import { calendarApi } from "@/features/calendar/api/calendarApi";
import { dashboardApi } from "@/features/dashboard/api/dashboardApi";
import { readStoredBoard, writeStoredBoard } from "@/features/dashboard/lib/board-storage";
import type { WidgetRoomScope } from "@/features/dashboard/lib/board-storage";
import { useHomeBoardPresetListener } from "@/features/dashboard/lib/home-board-preset";
import { MemoDashboardCard } from "@/features/memo/components";
import { notificationApi } from "@/features/notification/api/notificationApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { todoApi } from "@/features/todo/api/todoApi";
import { wbsApi } from "@/features/wbs/api/wbsApi";
import { getDeoverlappedActivityDurationSeconds } from "@/lib/activity/activity-duration";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged, useDataRefresh } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { projectRoomRoute } from "@/lib/project-room-routes";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewDashboard,
  workspacePreviewPersonalResources,
  workspacePreviewRoomResources,
  workspacePreviewRooms,
} from "@/lib/workspace-preview-data";
import type { ActivityLogResponse } from "@/types/api/activity";
import type { AgentSuggestionResponse, AgentSuggestionType } from "@/types/api/agent";
import type { NotificationResponse } from "@/types/api/notification";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";
import type { ResourceResponse } from "@/types/api/resource";
import type { DashboardActivityHeatmapResponse, DashboardWorkResponse, ScheduleResponse, TaskResponse } from "@/types/api/work";

import styles from "./workspace-dashboard.module.css";

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
type WbsProgress = { done: number; total: number };

// 홈 보드에 실제 데이터가 연결된 위젯만 노출한다(카탈로그의 데모 항목 제외).
// 앞의 8개는 기본 보드 구성이고, 뒤의 4개는 팔레트에서 사용자가 직접 담는 추가 카드다.
const connectedWidgetIds = [
  "today-summary",
  "today-todos",
  "schedule",
  "room-progress",
  "focus-stats",
  "agent-queue",
  "recent-resources",
  "quick-memo",
  "project-rooms",
  "upcoming-deadlines",
  "pending-approval",
  "notifications",
];
// 기본 보드는 과밀하지 않게 기존 8개만 둔다(새 카드는 opt-in).
const defaultWidgetIds = connectedWidgetIds.slice(0, 8);
const dashboardDropzoneId = "dashboard-canvas";
const dashboardRemoveDropzoneId = "dashboard-remove-card";
// 데이터 변경 이벤트의 발행 주체 표시 — 홈이 자기 변경(낙관적 갱신 완료분)으로 다시 전체 재조회하지 않게 한다.
const DASHBOARD_EVENT_SOURCE = "workspace-dashboard";
const PROGRESS_ROOM_LIMIT = 4;

const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
};

function normalizeWidgetIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [...defaultWidgetIds];
  const seen = new Set<string>();
  const normalized = ids.filter((id): id is string => {
    if (typeof id !== "string" || !connectedWidgetIds.includes(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return normalized.length > 0 ? normalized : [...defaultWidgetIds];
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

// 마감까지 남은 일수를 사람이 읽을 라벨로 바꾼다(지남/오늘/N일 뒤).
function formatDeadlineMeta(t: TranslateFn, value?: string | null): string {
  if (!value) return t("dashboard.common.dueUndecided");

  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return t("dashboard.common.dueUndecided");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDue = new Date(due);
  startOfDue.setHours(0, 0, 0, 0);
  const days = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86_400_000);

  if (days < 0) return t("dashboard.deadlines.overdue");
  if (days === 0) return t("dashboard.deadlines.today");
  return t("dashboard.deadlines.dayAfter", { days });
}

const SUGGESTION_TYPE_KEYS: Partial<Record<AgentSuggestionType, MessageKey>> = {
  QUESTION: "dashboard.approval.type.QUESTION",
  REQUIREMENT: "dashboard.approval.type.REQUIREMENT",
  SCHEDULE: "dashboard.approval.type.SCHEDULE",
  TASK: "dashboard.approval.type.TASK",
  TODO: "dashboard.approval.type.TODO",
  WBS: "dashboard.approval.type.WBS",
};

// AI 후보의 표시 제목을 payloadJson에서 최선으로 뽑는다(desktop-widget과 동일 규칙).
function suggestionTitle(suggestion: AgentSuggestionResponse, t: TranslateFn): string {
  const { content, summary, text, title } = suggestion.payloadJson;
  for (const candidate of [title, text, content, summary]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return t(SUGGESTION_TYPE_KEYS[suggestion.suggestionType] ?? "dashboard.approval.type.OTHER");
}

function notificationKindLabel(t: TranslateFn, sourceType: NotificationResponse["sourceType"]): string {
  if (sourceType === "AGENT") return t("dashboard.notifications.kind.agent");
  if (sourceType === "MESSAGE" || sourceType === "COMMENT") return t("dashboard.notifications.kind.communication");
  if (sourceType === "RESOURCE") return t("dashboard.notifications.kind.resource");
  return t("dashboard.notifications.kind.system");
}

function formatFocusDuration(t: TranslateFn, seconds: number) {
  if (seconds < 60) {
    return t("dashboard.common.minute", { minutes: 0 });
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return t("dashboard.common.hourMinute", { hours, minutes });
  }

  return t("dashboard.common.minute", { minutes });
}

function formatHeatmapDate(locale: string, value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? "ko-KR", {
    day: "numeric",
    month: "numeric",
  }).format(date);
}

function getWeekRange(base: Date) {
  const from = new Date(base);
  from.setHours(0, 0, 0, 0);
  const weekday = (from.getDay() + 6) % 7; // 월요일 시작
  from.setDate(from.getDate() - weekday);

  const to = new Date(from);
  to.setDate(from.getDate() + 7);

  return { from, to };
}

function dedupeTasks(tasks: TaskResponse[]) {
  return tasks.filter((task, index, source) => source.findIndex((item) => item.id === task.id) === index);
}

function StatusLine({ children, meta }: { children: string; meta?: string }) {
  return (
    <li className="workspace-dashboard__line">
      <span>{children}</span>
      {meta ? <b>{meta}</b> : null}
    </li>
  );
}

function DashboardLineList({ children }: { children: ReactNode }) {
  return <ul className="workspace-dashboard__list workspace-dashboard__list--compact">{children}</ul>;
}

function EmptyWidget({ message }: { message?: string }) {
  const { t } = useI18n();
  return <div className="workspace-dashboard__empty-widget">{message ?? t("dashboard.common.noData")}</div>;
}

function WidgetRoomPicker({
  onChange,
  rooms,
  value,
}: {
  onChange: (roomId: string | null) => void;
  rooms: ProjectRoomResponse[];
  value: string | null;
}) {
  const { t } = useI18n();

  if (rooms.length === 0) return null;

  return (
    <select
      aria-label={t("dashboard.widget.roomScopeAria")}
      className={styles.roomPicker}
      onChange={(event) => onChange(event.target.value || null)}
      value={value ?? ""}
    >
      <option value="">{t("dashboard.widget.scopeAll")}</option>
      {rooms.map((room) => (
        <option key={room.id} value={room.id}>
          {room.name}
        </option>
      ))}
    </select>
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

function WeekScheduleWidget({ locale, schedules }: { locale: string; schedules: ScheduleResponse[] }) {
  const { t } = useI18n();
  const localeTag = LOCALE_TAGS[locale] ?? "ko-KR";
  const from = useMemo(() => getWeekRange(new Date()).from, []);

  const dayCounts = useMemo(() => {
    const counts = new Array<number>(7).fill(0);
    for (const schedule of schedules) {
      const started = new Date(schedule.startsAt);
      if (Number.isNaN(started.getTime())) continue;
      const dayIndex = Math.floor((started.getTime() - from.getTime()) / 86_400_000);
      if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex] += 1;
    }
    return counts;
  }, [from, schedules]);

  const maxCount = Math.max(1, ...dayCounts);
  const dayFormatter = new Intl.DateTimeFormat(localeTag, { weekday: "narrow" });
  const timeFormatter = new Intl.DateTimeFormat(localeTag, { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" });
  const upcoming = schedules
    .slice()
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 4);

  return (
    <div className={styles.statBlock}>
      <p className={styles.statHeadline}>{t("dashboard.schedule.weekCount", { count: schedules.length })}</p>
      <div aria-label={t("dashboard.schedule.chartAria")} className={styles.weekBars} role="img">
        {dayCounts.map((count, index) => {
          const day = new Date(from);
          day.setDate(from.getDate() + index);
          return (
            <span className={styles.weekBar} key={day.toISOString()}>
              <i className={styles.weekBarFill} style={{ height: `${Math.max(8, Math.round((count / maxCount) * 100))}%` }} data-empty={count === 0 ? "true" : undefined} />
              <b>{dayFormatter.format(day)}</b>
            </span>
          );
        })}
      </div>
      {upcoming.length > 0 ? (
        <DashboardLineList>
          {upcoming.map((schedule) => (
            <StatusLine key={schedule.id} meta={timeFormatter.format(new Date(schedule.startsAt))}>
              {schedule.title}
            </StatusLine>
          ))}
        </DashboardLineList>
      ) : (
        <EmptyWidget />
      )}
    </div>
  );
}

function RoomProgressWidget({
  boards,
  roomId,
  rooms,
}: {
  boards: Record<string, WbsProgress | null>;
  roomId: string | null;
  rooms: ProjectRoomResponse[];
}) {
  const { t } = useI18n();

  if (rooms.length === 0) {
    return <EmptyWidget />;
  }

  if (roomId) {
    const progress = boards[roomId];
    if (!progress) {
      return <EmptyWidget />;
    }
    if (progress.total === 0) {
      return <EmptyWidget message={t("dashboard.progress.empty")} />;
    }

    const percent = Math.round((progress.done / progress.total) * 100);
    return (
      <div className={styles.progressSingle}>
        <Ring label={t("dashboard.progress.ratioLabel")} max={progress.total} metric={`${percent}%`} size={92} value={progress.done} variant="progress" />
        <p className={styles.statCaption}>{t("dashboard.progress.count", { done: progress.done, total: progress.total })}</p>
      </div>
    );
  }

  const targetRooms = rooms.slice(0, PROGRESS_ROOM_LIMIT);
  return (
    <div aria-label={t("dashboard.progress.chartAria")} className={styles.progressList} role="img">
      {targetRooms.map((room) => {
        const progress = boards[room.id];
        const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
        return (
          <div className={styles.progressRow} key={room.id}>
            <span className={styles.progressName}>{room.name}</span>
            <span className={styles.progressTrack}>
              <i className={styles.progressFill} style={{ width: `${percent}%` }} />
            </span>
            <b className={styles.progressValue}>{progress && progress.total > 0 ? `${percent}%` : "-"}</b>
          </div>
        );
      })}
    </div>
  );
}

function FocusStatsWidget({
  heatmap,
  logs,
  roomId,
}: {
  heatmap: DashboardActivityHeatmapResponse[] | null;
  logs: ActivityLogResponse[] | null;
  roomId: string | null;
}) {
  const { locale, t } = useI18n();
  const visibleHeatmap = roomId ? [] : (heatmap ?? []).slice(-14);
  const maxHeatmapMinutes = Math.max(1, ...visibleHeatmap.map((entry) => entry.focusMinutes));

  if (!logs && visibleHeatmap.length === 0) {
    return <EmptyWidget message={t("dashboard.focus.empty")} />;
  }

  const scoped = roomId ? (logs ?? []).filter((log) => log.roomId === roomId) : (logs ?? []);
  const logsByApp = new Map<string, ActivityLogResponse[]>();

  for (const log of scoped) {
    const appName = log.appName?.trim() || t("dashboard.activity.appFallback");
    logsByApp.set(appName, [...(logsByApp.get(appName) ?? []), log]);
  }

  const byApp = new Map<string, number>();
  for (const [appName, appLogs] of logsByApp) {
    byApp.set(appName, getDeoverlappedActivityDurationSeconds(appLogs));
  }
  const totalSeconds = getDeoverlappedActivityDurationSeconds(scoped);

  if ((scoped.length === 0 || totalSeconds === 0) && visibleHeatmap.length === 0) {
    return <EmptyWidget message={t("dashboard.focus.empty")} />;
  }

  const topApps = [...byApp.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3);
  const topSeconds = Math.max(1, topApps[0]?.[1] ?? 1);

  return (
    <div className={styles.statBlock}>
      {scoped.length > 0 && totalSeconds > 0 ? (
        <>
          <p className={styles.statHeadline}>
            <em>{t("dashboard.focus.total")}</em>
            <b>{formatFocusDuration(t, totalSeconds)}</b>
          </p>
          <div aria-label={t("dashboard.focus.chartAria")} className={styles.appBars} role="img">
            {topApps.map(([appName, seconds]) => (
              <div className={styles.appBarRow} key={appName}>
                <span className={styles.appBarName}>{appName}</span>
                <span className={styles.appBarTrack}>
                  <i className={styles.appBarFill} style={{ width: `${Math.max(6, Math.round((seconds / topSeconds) * 100))}%` }} />
                </span>
                <b className={styles.appBarValue}>{formatFocusDuration(t, seconds)}</b>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {visibleHeatmap.length > 0 ? (
        <div aria-label={t("dashboard.focus.chartAria")} className={styles.focusHeatmap} role="img">
          {visibleHeatmap.map((entry) => (
            <span className={styles.focusHeatmapBar} key={entry.date} title={`${formatHeatmapDate(locale, entry.date)} - ${entry.focusMinutes}m - ${entry.count}`}>
              <i style={{ height: `${Math.max(8, Math.round((entry.focusMinutes / maxHeatmapMinutes) * 100))}%` }} />
            </span>
          ))}
        </div>
      ) : null}
      <p className={styles.statCaption}>{t("dashboard.focus.autoNote")}</p>
    </div>
  );
}

function AgentQueueWidget({ count }: { count: number | null }) {
  const { t } = useI18n();

  return (
    <div className={styles.queueBlock}>
      <p className={styles.queueCount}>
        <b>{count ?? "-"}</b>
        <span>{t("dashboard.agentQueue.waiting")}</span>
      </p>
      {/* /app/agent-suggestions는 /app/agent로 리다이렉트만 하므로 곧장 후보함으로 보낸다. */}
      <Link className="bubli-button bubli-button--quiet bubli-button--sm" href="/app/agent">
        {t("dashboard.agentQueue.open")}
      </Link>
    </div>
  );
}

function ProjectRoomsWidget({ rooms }: { rooms: ProjectRoomResponse[] }) {
  const { t } = useI18n();

  if (rooms.length === 0) {
    return <EmptyWidget message={t("dashboard.rooms.empty")} />;
  }

  return (
    <ul className="workspace-dashboard__list workspace-dashboard__list--compact">
      {rooms.slice(0, 6).map((room) => {
        const paymentMeta =
          room.paymentStatus === "OVERDUE"
            ? t("dashboard.rooms.paymentOverdue")
            : room.paymentStatus === "PENDING"
              ? t("dashboard.rooms.paymentPending")
              : t("dashboard.rooms.statusActive");
        return (
          <li className="workspace-dashboard__line" key={room.id}>
            <Link
              aria-label={t("dashboard.rooms.enterAria", { room: room.name })}
              className="workspace-dashboard__room-link"
              href={projectRoomRoute(room.id, "work")}
            >
              {room.name}
            </Link>
            <b>{paymentMeta}</b>
          </li>
        );
      })}
    </ul>
  );
}

function UpcomingDeadlinesWidget({ tasks }: { tasks: TaskResponse[] }) {
  const { t } = useI18n();

  const sorted = tasks
    .filter((task) => Boolean(task.dueAt) && task.status !== "DONE")
    .slice()
    .sort((left, right) => new Date(left.dueAt ?? "").getTime() - new Date(right.dueAt ?? "").getTime())
    .slice(0, 6);

  if (sorted.length === 0) {
    return <EmptyWidget message={t("dashboard.deadlines.empty")} />;
  }

  return (
    <DashboardLineList>
      {sorted.map((task) => (
        <StatusLine key={task.id} meta={formatDeadlineMeta(t, task.dueAt)}>
          {task.title}
        </StatusLine>
      ))}
    </DashboardLineList>
  );
}

function PendingApprovalWidget({ suggestions }: { suggestions: AgentSuggestionResponse[] | null }) {
  const { t } = useI18n();

  const recent = (suggestions ?? [])
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return <EmptyWidget message={t("dashboard.approval.empty")} />;
  }

  return (
    <div className={styles.statBlock}>
      <DashboardLineList>
        {recent.map((suggestion) => (
          <StatusLine
            key={suggestion.suggestionId}
            meta={t(SUGGESTION_TYPE_KEYS[suggestion.suggestionType] ?? "dashboard.approval.type.OTHER")}
          >
            {suggestionTitle(suggestion, t)}
          </StatusLine>
        ))}
      </DashboardLineList>
      <Link className="bubli-button bubli-button--quiet bubli-button--sm" href="/app/agent">
        {t("dashboard.approval.open")}
      </Link>
    </div>
  );
}

function NotificationsWidget({ notifications }: { notifications: NotificationResponse[] | null }) {
  const { t } = useI18n();

  const unread = (notifications ?? [])
    .filter((notification) => notification.status === "UNREAD")
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);

  if (unread.length === 0) {
    return <EmptyWidget message={t("dashboard.notifications.empty")} />;
  }

  return (
    <DashboardLineList>
      {unread.map((notification) => (
        <StatusLine key={notification.id} meta={notificationKindLabel(t, notification.sourceType)}>
          {notification.title.trim() || notificationKindLabel(t, notification.sourceType)}
        </StatusLine>
      ))}
    </DashboardLineList>
  );
}

function TodaySummaryWidget({
  focusSeconds,
  pendingCount,
  taskCount,
  weekScheduleCount,
}: {
  focusSeconds: number;
  pendingCount: number | null;
  taskCount: number;
  weekScheduleCount: number;
}) {
  const { t } = useI18n();
  const focusMinutes = Math.round(focusSeconds / 60);
  const rings = [
    { label: t("dashboard.metric.todos"), max: 8, metric: `${taskCount}`, value: taskCount },
    { label: t("dashboard.metric.schedule"), max: 10, metric: `${weekScheduleCount}`, value: weekScheduleCount },
    { label: t("dashboard.metric.focusMinutes"), max: 240, metric: `${focusMinutes}`, value: focusMinutes },
    ...(pendingCount !== null ? [{ label: t("dashboard.metric.aiQueue"), max: 8, metric: `${pendingCount}`, value: pendingCount }] : []),
  ];

  return (
    <div className={styles.summaryRow}>
      {rings.map((ring) => (
        <Ring key={ring.label} label={ring.label} max={ring.max} metric={ring.metric} size={82} thickness={9} value={ring.value} variant="todo" />
      ))}
    </div>
  );
}

function ResourceLine({ resource }: { resource: ResourceResponse }) {
  const { t } = useI18n();
  return (
    <StatusLine meta={resource.visibility === "ROOM_SHARED" ? t("dashboard.resource.room") : t("dashboard.resource.personal")}>
      {resource.title}
    </StatusLine>
  );
}

function SortableDashboardTile({
  children,
  def,
  editMode,
  onRemove,
}: {
  children: ReactNode;
  def: DashboardWidgetDef;
  editMode: boolean;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ disabled: !editMode, id: def.widgetId });
  const dragHandleProps = { ...attributes, ...listeners } as HTMLAttributes<HTMLButtonElement>;

  return (
    <div
      className={sizeToClass[def.size]}
      ref={setNodeRef}
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

function DashboardCanvas({
  boardDragging,
  children,
  editMode,
  sorting,
}: {
  boardDragging: boolean;
  children: ReactNode;
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
      aria-label={t("dashboard.canvas.placeAria")}
      className="workspace-dashboard__canvas"
      data-drop-active={isOver ? "true" : undefined}
      data-sorting={sorting ? "true" : undefined}
      ref={setNodeRef}
    >
      {children}
      {editMode ? <DashboardCanvasRemoveDropzone active={boardDragging} /> : null}
    </section>
  );
}

export function WorkspaceDashboard() {
  const { locale, t } = useI18n();
  const [state, setState] = useState<DashboardState>({ kind: "loading" });
  const [editMode, setEditMode] = useState(false);
  const [boardHydrated, setBoardHydrated] = useState(false);
  const [widgetIds, setWidgetIds] = useState<string[]>([...defaultWidgetIds]);
  const [widgetRoomScope, setWidgetRoomScope] = useState<WidgetRoomScope>({});
  const [activeBoardWidgetId, setActiveBoardWidgetId] = useState<string | null>(null);
  const [activePaletteWidgetId, setActivePaletteWidgetId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<ProjectRoomResponse[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [personalTasks, setPersonalTasks] = useState<TaskResponse[]>([]);
  const [dashboardFeedTasks, setDashboardFeedTasks] = useState<TaskResponse[]>([]);
  const [personalResources, setPersonalResources] = useState<ResourceResponse[]>([]);
  const [roomResources, setRoomResources] = useState<Record<string, ResourceResponse[] | null>>({});
  const [weekSchedules, setWeekSchedules] = useState<ScheduleResponse[] | null>(null);
  const [activityHeatmap, setActivityHeatmap] = useState<DashboardActivityHeatmapResponse[] | null>(null);
  const [todayActivityLogs, setTodayActivityLogs] = useState<ActivityLogResponse[] | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<AgentSuggestionResponse[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[] | null>(null);
  const [wbsBoards, setWbsBoards] = useState<Record<string, WbsProgress | null>>({});

  const [creatingTodo, setCreatingTodo] = useState(false);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [todoNotice, setTodoNotice] = useState<string | null>(null);
  // 인사말/날짜는 마운트 후에만 계산해 SSR-클라이언트 하이드레이션 불일치를 피한다.
  const [now, setNow] = useState<Date | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 저장된 보드 구성(카드 순서 + 위젯별 룸 범위)을 마운트 뒤에 복원한다.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = readStoredBoard(normalizeWidgetIds);
      if (stored) {
        setWidgetIds(stored.widgetIds);
        setWidgetRoomScope(stored.roomScope);
      }
      setBoardHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // 보드 구성 변경은 이 기기의 브라우저 저장소에 자동 저장한다(board-storage 모듈이 단독 소유).
  // widgetApi에는 홈 보드 배치용 endpoint가 없어(버블 설정/사용 집계 전용) 로컬 저장만 쓴다.
  useEffect(() => {
    if (!boardHydrated) return;
    writeStoredBoard({ roomScope: widgetRoomScope, widgetIds });
  }, [boardHydrated, widgetIds, widgetRoomScope]);

  // 직군 온보딩이 프리셋을 적용하면(홈 위 오버레이) 리로드 없이 카드 구성을 즉시 반영한다.
  const applyPresetWidgetIds = useCallback((ids: string[]) => {
    setWidgetIds(normalizeWidgetIds(ids));
    setWidgetRoomScope({});
  }, []);
  useHomeBoardPresetListener(applyPresetWidgetIds);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardApi.getWork();
      setState(hasDashboardItems(data) ? { data, kind: "ready" } : { data, kind: "empty" });

      const { from, to } = getWeekRange(new Date());
      const [
        roomResult,
        personalTaskResult,
        feedTaskResult,
        resourceResult,
        activityResult,
        activityHeatmapResult,
        scheduleResult,
        suggestionResult,
        notificationResult,
      ] = await Promise.allSettled([
        projectRoomApi.list(),
        todoApi.list(),
        dashboardApi.getTasks(),
        resourcesApi.listPersonal(),
        activityApi.getToday(),
        dashboardApi.getActivityHeatmap({ days: 14 }),
        calendarApi.getEvents({ from: from.toISOString(), size: 100, to: to.toISOString() }),
        agentApi.listPersonalSuggestions({ status: "DRAFT" }),
        notificationApi.list({ size: 20 }),
      ]);

      setRooms(roomResult.status === "fulfilled" ? roomResult.value.items : []);
      setRoomsLoaded(true);
      setPersonalTasks(personalTaskResult.status === "fulfilled" ? personalTaskResult.value.items : []);
      setDashboardFeedTasks(feedTaskResult.status === "fulfilled" ? feedTaskResult.value.items : []);
      setPersonalResources(resourceResult.status === "fulfilled" ? resourceResult.value.items : []);
      setTodayActivityLogs(activityResult.status === "fulfilled" ? activityResult.value : null);
      setActivityHeatmap(activityHeatmapResult.status === "fulfilled" ? activityHeatmapResult.value : null);
      setWeekSchedules(scheduleResult.status === "fulfilled" ? scheduleResult.value.items : null);
      setPendingSuggestions(suggestionResult.status === "fulfilled" ? suggestionResult.value : null);
      setNotifications(notificationResult.status === "fulfilled" ? notificationResult.value.items : null);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        setState({ data: workspacePreviewDashboard, kind: "ready" });
        setRooms(workspacePreviewRooms);
        setRoomsLoaded(true);
        setPersonalResources([...workspacePreviewPersonalResources, ...workspacePreviewRoomResources]);
        setWeekSchedules(workspacePreviewDashboard.todaySchedules);
        setActivityHeatmap([]);
        setTodayActivityLogs([]);
        setPendingSuggestions([]);
        setNotifications([]);
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

  const activeRooms = useMemo(() => rooms.filter((room) => room.status === "ACTIVE"), [rooms]);
  const realData = state.kind === "ready" || state.kind === "empty" ? state.data : emptyDashboard;
  const canShowBoard = state.kind === "ready" || state.kind === "empty";

  // 진행률 위젯이 참조하는 프로젝트룸의 WBS 보드를 필요할 때만 가져와 캐시한다.
  const requestedWbsRoomsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!canShowBoard || !widgetIds.includes("room-progress")) return;

    const scopedRoomId = widgetRoomScope["room-progress"] ?? null;
    const targets = scopedRoomId ? [scopedRoomId] : activeRooms.slice(0, PROGRESS_ROOM_LIMIT).map((room) => room.id);

    for (const roomId of targets) {
      if (requestedWbsRoomsRef.current.has(roomId)) continue;
      requestedWbsRoomsRef.current.add(roomId);

      void wbsApi
        .getBoard(roomId)
        .then((board) => {
          const total = board.wbsItems.length;
          const done = board.wbsItems.filter((item) => item.status === "DONE").length;
          setWbsBoards((current) => ({ ...current, [roomId]: { done, total } }));
        })
        .catch(() => {
          // 실패한 룸은 다음 진입 때 다시 시도한다.
          requestedWbsRoomsRef.current.delete(roomId);
        });
    }
  }, [activeRooms, canShowBoard, widgetIds, widgetRoomScope]);

  // 자료 위젯이 특정 룸을 보면 해당 룸의 공유 자료를 가져와 캐시한다.
  // 캐시 값(roomResources)이 비워지면 다시 받아온다 — refreshDashboard가 이 경로로 재조회를 유도한다.
  const requestedResourceRoomsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!canShowBoard || !widgetIds.includes("recent-resources")) return;

    const scopedRoomId = widgetRoomScope["recent-resources"] ?? null;
    if (!scopedRoomId || roomResources[scopedRoomId] !== undefined || requestedResourceRoomsRef.current.has(scopedRoomId)) return;
    requestedResourceRoomsRef.current.add(scopedRoomId);

    void resourcesApi
      .listRoomResources(scopedRoomId)
      .then((page) => {
        setRoomResources((current) => ({ ...current, [scopedRoomId]: page.items }));
      })
      .catch(() => {
        setRoomResources((current) => ({ ...current, [scopedRoomId]: [] }));
      });
  }, [canShowBoard, roomResources, widgetIds, widgetRoomScope]);

  // 다른 표면(셸 스위처의 룸 생성/초대 수락, 일정·워크보드·자료보드, 데스크톱 위젯/다른 탭 등)의
  // 변경을 새로고침 없이 반영한다 — 데이터 변경 이벤트 + 포커스 복귀 재검증(30초 스로틀), 폴링 없음.
  const refreshDashboard = useCallback(() => {
    requestedWbsRoomsRef.current.clear();
    requestedResourceRoomsRef.current.clear();
    setRoomResources({});
    void fetchDashboard();
  }, [fetchDashboard]);

  // memo 도메인은 제외 — 메모 카드는 자체 조회를 갖고 있어(MemoDashboardCard) 스스로 갱신한다.
  useDataRefresh({
    domains: ["agent", "chat", "notification", "project-room", "resource", "schedule", "timer", "todo"],
    ignoreSource: DASHBOARD_EVENT_SOURCE,
    minFocusIntervalMs: 30_000,
    onRefresh: refreshDashboard,
  });

  const allTasks = useMemo(
    () => dedupeTasks([...realData.todayTasks, ...realData.upcomingDeadlines, ...personalTasks, ...dashboardFeedTasks]),
    [dashboardFeedTasks, personalTasks, realData.todayTasks, realData.upcomingDeadlines],
  );

  const totalFocusSeconds = useMemo(
    () => getDeoverlappedActivityDurationSeconds(todayActivityLogs ?? []),
    [todayActivityLogs],
  );

  const pendingSuggestionCount = useMemo(
    () => (pendingSuggestions === null ? null : pendingSuggestions.length),
    [pendingSuggestions],
  );

  const scheduleItems = useMemo(() => weekSchedules ?? realData.todaySchedules, [realData.todaySchedules, weekSchedules]);

  const visibleWidgets = useMemo(
    () =>
      widgetIds
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

  const setWidgetScope = useCallback((widgetId: string, roomId: string | null) => {
    setWidgetRoomScope((current) => {
      const next = { ...current };
      if (roomId) {
        next[widgetId] = roomId;
      } else {
        delete next[widgetId];
      }
      return next;
    });
  }, []);

  const upsertTask = useCallback((task: TaskResponse) => {
    if (!task.roomId) {
      setPersonalTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    } else {
      setDashboardFeedTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    }
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

  const todoScopeRoomId = widgetRoomScope["today-todos"] ?? null;

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
        const created = todoScopeRoomId
          ? await todoApi.createRoomTask(todoScopeRoomId, { status: "TODO", title: trimmed })
          : await todoApi.create({ status: "TODO", title: trimmed });
        upsertTask(created);
        // 같은 창의 다른 표면(워크보드/일정 화면 등)이 이 변경을 받도록 알린다(홈 자신은 무시).
        notifyDataChanged("todo", { source: DASHBOARD_EVENT_SOURCE });
        setTodoNotice(todoScopeRoomId ? t("dashboard.todo.createdRoom") : t("dashboard.todo.createdPersonal"));
        return true;
      } catch (error) {
        setTodoNotice(error instanceof ApiClientError && error.status === 401 ? t("dashboard.todo.loginRequired") : t("dashboard.todo.saveFailed"));
        return false;
      } finally {
        setCreatingTodo(false);
      }
    },
    [t, todoScopeRoomId, upsertTask],
  );

  const deleteTodo = useCallback(
    async (task: TaskResponse) => {
      setDeletingTodoId(task.id);
      setTodoNotice(null);

      try {
        await todoApi.delete(task.id);
        removeTask(task.id);
        notifyDataChanged("todo", { source: DASHBOARD_EVENT_SOURCE });
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
      const scopedRoomId = widgetRoomScope[widgetId] ?? null;

      switch (widgetId) {
        case "today-summary":
          return (
            <TodaySummaryWidget
              focusSeconds={totalFocusSeconds}
              pendingCount={pendingSuggestionCount}
              taskCount={allTasks.length}
              weekScheduleCount={scheduleItems.length}
            />
          );
        case "today-todos": {
          const scopedTasks = scopedRoomId ? allTasks.filter((task) => task.roomId === scopedRoomId) : allTasks;
          const roomLabel = scopedRoomId ? rooms.find((room) => room.id === scopedRoomId)?.name ?? null : null;
          return (
            <TodoWidget
              canCreate={canShowBoard}
              creating={creatingTodo}
              deletingTaskId={deletingTodoId}
              notice={todoNotice}
              onCreate={createTodo}
              onDelete={(task) => void deleteTodo(task)}
              roomLabel={roomLabel}
              tasks={scopedTasks.slice(0, 6)}
            />
          );
        }
        case "schedule": {
          const scopedSchedules = scopedRoomId ? scheduleItems.filter((schedule) => schedule.roomId === scopedRoomId) : scheduleItems;
          return <WeekScheduleWidget locale={locale} schedules={scopedSchedules} />;
        }
        case "room-progress":
          return <RoomProgressWidget boards={wbsBoards} roomId={scopedRoomId} rooms={activeRooms} />;
        case "focus-stats":
          return <FocusStatsWidget heatmap={activityHeatmap} logs={todayActivityLogs} roomId={scopedRoomId} />;
        case "agent-queue":
          return <AgentQueueWidget count={pendingSuggestionCount} />;
        case "project-rooms":
          return <ProjectRoomsWidget rooms={activeRooms} />;
        case "upcoming-deadlines": {
          const source = scopedRoomId ? allTasks.filter((task) => task.roomId === scopedRoomId) : allTasks;
          return <UpcomingDeadlinesWidget tasks={source} />;
        }
        case "pending-approval":
          return <PendingApprovalWidget suggestions={pendingSuggestions} />;
        case "notifications":
          return <NotificationsWidget notifications={notifications} />;
        case "recent-resources": {
          const source = scopedRoomId ? roomResources[scopedRoomId] ?? [] : personalResources;
          const recent = (source ?? [])
            .slice()
            .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
            .slice(0, 4);
          if (recent.length === 0) return <EmptyWidget />;
          return (
            <DashboardLineList>
              {recent.map((resource) => (
                <ResourceLine key={resource.id} resource={resource} />
              ))}
            </DashboardLineList>
          );
        }
        case "quick-memo":
          // dev PR 201 이식: 위젯별 룸 범위에 맞춰 개인/룸 메모를 구분해 연결한다.
          return <MemoDashboardCard key={scopedRoomId ?? "personal"} roomId={scopedRoomId} />;
        default:
          return null;
      }
    },
    [
      activeRooms,
      activityHeatmap,
      allTasks,
      canShowBoard,
      createTodo,
      creatingTodo,
      deleteTodo,
      deletingTodoId,
      locale,
      notifications,
      pendingSuggestionCount,
      pendingSuggestions,
      personalResources,
      roomResources,
      rooms,
      scheduleItems,
      todayActivityLogs,
      todoNotice,
      totalFocusSeconds,
      wbsBoards,
      widgetRoomScope,
    ],
  );

  const todayLabel = now
    ? new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? "ko-KR", { day: "numeric", month: "long", weekday: "short" }).format(now)
    : null;

  return (
    <section aria-label={t("dashboard.aria")} className="workspace-dashboard">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroText}>
          <h1>{t("dashboard.title")}</h1>
          <p className={styles.heroMeta}>
            {now ? <span>{t(greetingKey(now.getHours()))}</span> : null}
            {todayLabel ? <b>{todayLabel}</b> : null}
          </p>
        </div>
        {canShowBoard ? (
          <div className={styles.heroActions}>
            {editMode ? (
              <Button
                icon={<RotateCcw aria-hidden size={14} strokeWidth={2} />}
                onClick={() => {
                  setWidgetIds([...defaultWidgetIds]);
                  setWidgetRoomScope({});
                }}
                variant="secondary"
              >
                {t("dashboard.home.resetLayout")}
              </Button>
            ) : null}
            <Button
              data-tour="card-edit"
              icon={<LayoutDashboard aria-hidden size={15} strokeWidth={1.9} />}
              onClick={() => setEditMode((current) => !current)}
              variant={editMode ? "primary" : "secondary"}
            >
              {editMode ? t("dashboard.home.editDone") : t("dashboard.home.editWidgets")}
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

      {state.kind === "empty" && roomsLoaded && rooms.length === 0 ? (
        <GlassPanel className="workspace-dashboard__state">
          <CheckCircle2 aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("dashboard.state.emptyTitle")}</h2>
            <p>{t("dashboard.state.emptyBody")}</p>
            <button
              className="bubli-button bubli-button--primary"
              onClick={() => window.dispatchEvent(new CustomEvent("bubli:open-project-room-create"))}
              type="button"
            >
              {t("dashboard.state.emptyCreate")}
            </button>
          </div>
        </GlassPanel>
      ) : null}

      {canShowBoard ? (
        <DndContext
          collisionDetection={dashboardCollisionDetection}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <div aria-label={t("dashboard.home.boardAria")} className={`workspace-dashboard__stage${editMode ? " workspace-dashboard__stage--editing" : ""}`}>
            <DashboardCanvas boardDragging={Boolean(activeBoardWidgetId)} editMode={editMode} sorting={Boolean(activeBoardWidgetId)}>
              {editMode ? (
                <div className={styles.editHint}>
                  <span>{t("dashboard.home.editingHint")}</span>
                  <b>{t("dashboard.home.autoSaved")}</b>
                </div>
              ) : null}
              <SortableContext items={visibleWidgets.map((widget) => widget.widgetId)} strategy={rectSortingStrategy}>
                <DashboardGrid mode={editMode ? "edit" : "view"}>
                  {visibleWidgets.map((widget) => (
                    <SortableDashboardTile
                      def={widget}
                      editMode={editMode}
                      key={widget.widgetId}
                      onRemove={() => setWidgetIds((current) => current.filter((id) => id !== widget.widgetId))}
                    >
                      {widget.roomScope ? (
                        <WidgetRoomPicker
                          onChange={(roomId) => setWidgetScope(widget.widgetId, roomId)}
                          rooms={activeRooms}
                          value={widgetRoomScope[widget.widgetId] ?? null}
                        />
                      ) : null}
                      {renderWidgetBody(widget.widgetId)}
                    </SortableDashboardTile>
                  ))}
                </DashboardGrid>
              </SortableContext>
            </DashboardCanvas>

            {editMode ? (
              <aside aria-label={t("dashboard.palette.title")} className="workspace-dashboard__palette">
                <DashboardPalette
                  draggable
                  items={availableWidgets}
                  onAdd={(widgetId) => setWidgetIds((current) => (current.includes(widgetId) ? current : [...current, widgetId]))}
                  removeDropId={dashboardRemoveDropzoneId}
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
