"use client";

import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  Columns3,
  LayoutDashboard,
  ListTodo,
  MonitorUp,
  PauseCircle,
  PencilLine,
  UserRoundCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./todo-list-panel.module.css";

export type TodoScope = "PERSONAL" | "PROJECT_ROOM";
export type TodoStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type TodoSource = "DIRECT" | "APPROVED_CANDIDATE";
export type TodoViewSurface = "WORK_BOARD" | "DASHBOARD" | "BUBBLE" | "SCHEDULE";

export type TodoItem = {
  assigneeLabel?: string;
  dueLabel?: string;
  id: string;
  projectRoomLabel?: string;
  scope: TodoScope;
  source: TodoSource;
  status: TodoStatus;
  surfaces: TodoViewSurface[];
  title: string;
};

export type TodoListPanelProps = HTMLAttributes<HTMLElement> & {
  onAddTodo?: () => void;
  onOpenTodo?: (todoId: string) => void;
  selectedFilter?: TodoScope | "ALL";
  title?: string;
  todos?: TodoItem[];
};

const statusMeta: Record<TodoStatus, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  BLOCKED: { icon: <PauseCircle size={16} strokeWidth={2.1} />, labelKey: "todo.list.status.blocked", tone: "warning" },
  DONE: { icon: <CheckCircle2 size={16} strokeWidth={2.1} />, labelKey: "todo.list.status.done", tone: "approved" },
  IN_PROGRESS: { icon: <Clock3 size={16} strokeWidth={2.1} />, labelKey: "todo.list.status.inProgress", tone: "todo" },
  REVIEW: { icon: <PencilLine size={16} strokeWidth={2.1} />, labelKey: "todo.list.status.review", tone: "pending" },
  TODO: { icon: <Circle size={16} strokeWidth={2.1} />, labelKey: "todo.list.status.todo", tone: "neutral" },
};

const scopeMeta: Record<TodoScope, { labelKey: MessageKey; tone: StatusTone }> = {
  PERSONAL: { labelKey: "todo.list.scope.personal", tone: "personal" },
  PROJECT_ROOM: { labelKey: "todo.list.scope.room", tone: "room" },
};

const sourceMeta: Record<TodoSource, MessageKey> = {
  APPROVED_CANDIDATE: "todo.list.source.approved",
  DIRECT: "todo.list.source.direct",
};

const surfaceMeta: Record<TodoViewSurface, { icon: ReactNode; labelKey: MessageKey }> = {
  BUBBLE: { icon: <MonitorUp size={14} strokeWidth={2.1} />, labelKey: "todo.list.surface.bubble" },
  DASHBOARD: { icon: <LayoutDashboard size={14} strokeWidth={2.1} />, labelKey: "todo.list.surface.dashboard" },
  SCHEDULE: { icon: <CalendarClock size={14} strokeWidth={2.1} />, labelKey: "todo.list.surface.schedule" },
  WORK_BOARD: { icon: <Columns3 size={14} strokeWidth={2.1} />, labelKey: "todo.list.surface.board" },
};

export const defaultTodos: TodoItem[] = [
  {
    assigneeLabel: "todo.list.default.assigneeMe",
    dueLabel: "todo.list.default.dueToday",
    id: "todo-send-client-question",
    projectRoomLabel: "todo.list.default.roomTranslation",
    scope: "PROJECT_ROOM",
    source: "APPROVED_CANDIDATE",
    status: "IN_PROGRESS",
    surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE"],
    title: "todo.list.default.todo1Title",
  },
  {
    assigneeLabel: "todo.list.default.assigneeMe",
    dueLabel: "todo.list.default.dueDMinus2",
    id: "todo-review-translation",
    projectRoomLabel: "todo.list.default.roomTranslation",
    scope: "PROJECT_ROOM",
    source: "DIRECT",
    status: "REVIEW",
    surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE", "SCHEDULE"],
    title: "todo.list.default.todo2Title",
  },
  {
    dueLabel: "todo.list.default.dueToday",
    id: "todo-personal-memo",
    scope: "PERSONAL",
    source: "DIRECT",
    status: "TODO",
    surfaces: ["DASHBOARD", "BUBBLE"],
    title: "todo.list.default.todo3Title",
  },
  {
    assigneeLabel: "todo.list.default.assigneeMe",
    dueLabel: "todo.list.default.dueJun27",
    id: "todo-resource-tags",
    projectRoomLabel: "todo.list.default.roomIntro",
    scope: "PROJECT_ROOM",
    source: "APPROVED_CANDIDATE",
    status: "BLOCKED",
    surfaces: ["WORK_BOARD", "DASHBOARD"],
    title: "todo.list.default.todo4Title",
  },
];

function getFilteredTodos(todos: TodoItem[], selectedFilter: TodoListPanelProps["selectedFilter"]) {
  if (!selectedFilter || selectedFilter === "ALL") {
    return todos;
  }

  return todos.filter((todo) => todo.scope === selectedFilter);
}

export function TodoListPanel({
  className,
  onAddTodo,
  onOpenTodo,
  selectedFilter = "ALL",
  title,
  todos = defaultTodos,
  ...props
}: TodoListPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("todo.list.title");
  const filteredTodos = getFilteredTodos(todos, selectedFilter);
  const activeCount = todos.filter((todo) => todo.status !== "DONE").length;
  const projectRoomCount = todos.filter((todo) => todo.scope === "PROJECT_ROOM").length;
  const personalCount = todos.filter((todo) => todo.scope === "PERSONAL").length;
  const donePercent = Math.round((todos.filter((todo) => todo.status === "DONE").length / Math.max(todos.length, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListTodo size={15} strokeWidth={2.1} />}>{t("todo.list.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("todo.list.description")}</p>
          </div>
        </div>
        <Button icon={<PencilLine size={15} strokeWidth={2.1} />} onClick={onAddTodo} size="sm" variant="primary">
          {t("todo.list.addTodo")}
        </Button>
      </header>

      <section className={styles.summaryGrid} aria-label={t("todo.list.summaryAria")}>
        <article>
          <span>{t("todo.list.summary.activeLabel")}</span>
          <strong>{t("todo.list.count", { count: activeCount })}</strong>
          <p>{t("todo.list.summary.activeDesc")}</p>
        </article>
        <article>
          <span>{t("todo.list.summary.roomLabel")}</span>
          <strong>{t("todo.list.count", { count: projectRoomCount })}</strong>
          <p>{t("todo.list.summary.roomDesc")}</p>
        </article>
        <article>
          <span>{t("todo.list.summary.personalLabel")}</span>
          <strong>{t("todo.list.count", { count: personalCount })}</strong>
          <p>{t("todo.list.summary.personalDesc")}</p>
        </article>
        <article>
          <span>{t("todo.list.summary.doneLabel")}</span>
          <strong>{t("todo.list.percent", { value: donePercent })}</strong>
          <ProgressBar value={donePercent} />
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.todoList} aria-label={t("todo.list.listAria")}>
          <div className={styles.listHeader}>
            <strong>{t("todo.list.showing")}</strong>
            <StatusBadge tone="todo">{t("todo.list.count", { count: filteredTodos.length })}</StatusBadge>
          </div>

          {filteredTodos.map((todo) => {
            const status = statusMeta[todo.status];
            const scope = scopeMeta[todo.scope];
            const todoTitle = t(todo.title as MessageKey);

            return (
              <article className={styles.todoCard} key={todo.id}>
                <div className={styles.todoTop}>
                  <span className={styles.statusIcon} aria-hidden="true">
                    {status.icon}
                  </span>
                  <div className={styles.todoCopy}>
                    <strong>{todoTitle}</strong>
                    <span>
                      {todo.projectRoomLabel ? t(todo.projectRoomLabel as MessageKey) : t("todo.list.personalWork")} · {todo.assigneeLabel ? t("todo.list.assigneePrefix", { name: t(todo.assigneeLabel as MessageKey) }) : t("todo.list.myWork")} · {todo.dueLabel ? t(todo.dueLabel as MessageKey) : t("todo.list.noDue")}
                    </span>
                  </div>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                </div>

                <div className={styles.todoMeta}>
                  <StatusBadge tone={scope.tone}>{t(scope.labelKey)}</StatusBadge>
                  <span>{t(sourceMeta[todo.source])}</span>
                  <span>{todo.scope === "PROJECT_ROOM" ? t("todo.list.multiSurface") : t("todo.list.personalSurface")}</span>
                </div>

                <div className={styles.surfaceRow} aria-label={t("todo.list.surfaceRowAria", { title: todoTitle })}>
                  {todo.surfaces.map((surface) => {
                    const surfaceInfo = surfaceMeta[surface];

                    return (
                      <span key={surface}>
                        {surfaceInfo.icon}
                        {t(surfaceInfo.labelKey)}
                      </span>
                    );
                  })}
                </div>

                <footer className={styles.todoFooter}>
                  <span>{t("todo.list.candidateNote")}</span>
                  <Button onClick={() => onOpenTodo?.(todo.id)} size="sm" variant="quiet">
                    {t("todo.list.viewDetail")}
                  </Button>
                </footer>
              </article>
            );
          })}
        </section>

        <aside className={styles.policyPanel} aria-label={t("todo.list.policyAria")}>
          <article>
            <UserRoundCheck size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t("todo.list.policy.assigneeTitle")}</strong>
              <p>{t("todo.list.policy.assigneeBody")}</p>
            </div>
          </article>
          <article>
            <LayoutDashboard size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t("todo.list.policy.noCopyTitle")}</strong>
              <p>{t("todo.list.policy.noCopyBody")}</p>
            </div>
          </article>
          <article>
            <MonitorUp size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t("todo.list.policy.desktopTitle")}</strong>
              <p>{t("todo.list.policy.desktopBody")}</p>
            </div>
          </article>
        </aside>
      </div>
    </GlassPanel>
  );
}
