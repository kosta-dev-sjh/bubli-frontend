"use client";

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  ListTodo,
  MonitorUp,
  PanelTop,
  Route,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./todo-assignee-reflection-panel.module.css";

type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
type TodoSurface = "WORK_BOARD" | "DASHBOARD" | "BUBBLE" | "CALENDAR";

type AssignedTodo = {
  assigneeLabel: string;
  dueLabel: string;
  id: string;
  isMe?: boolean;
  priority: TodoPriority;
  projectRoomLabel: string;
  progressPercent: number;
  title: string;
};

type SurfaceState = {
  description: string;
  label: string;
  surface: TodoSurface;
  syncedCount: number;
  tone: StatusTone;
};

export type TodoAssigneeReflectionPanelProps = HTMLAttributes<HTMLElement> & {
  surfaces: SurfaceState[];
  title?: string;
  todos: AssignedTodo[];
};

const priorityMeta: Record<TodoPriority, { labelKey: MessageKey; tone: StatusTone }> = {
  HIGH: { labelKey: "todo.reflection.priority.high", tone: "warning" },
  LOW: { labelKey: "todo.reflection.priority.low", tone: "personal" },
  MEDIUM: { labelKey: "todo.reflection.priority.medium", tone: "pending" },
};

const surfaceIcon: Record<TodoSurface, typeof ListTodo> = {
  BUBBLE: Bell,
  CALENDAR: CalendarDays,
  DASHBOARD: LayoutDashboard,
  WORK_BOARD: PanelTop,
};

export const defaultAssignedTodos: AssignedTodo[] = [
  {
    assigneeLabel: "todo.reflection.default.assigneeMe",
    dueLabel: "todo.reflection.default.dueDMinus2",
    id: "todo-translation-review",
    isMe: true,
    priority: "HIGH",
    progressPercent: 62,
    projectRoomLabel: "todo.reflection.default.roomTranslation",
    title: "todo.reflection.default.todo1Title",
  },
  {
    assigneeLabel: "todo.reflection.default.assigneeMe",
    dueLabel: "todo.reflection.default.dueToday",
    id: "todo-question-send",
    isMe: true,
    priority: "MEDIUM",
    progressPercent: 30,
    projectRoomLabel: "todo.reflection.default.roomTranslation",
    title: "todo.reflection.default.todo2Title",
  },
  {
    assigneeLabel: "todo.reflection.default.assigneeReviewer",
    dueLabel: "todo.reflection.default.dueJun25",
    id: "todo-resource-sort",
    isMe: false,
    priority: "LOW",
    progressPercent: 18,
    projectRoomLabel: "todo.reflection.default.roomIntro",
    title: "todo.reflection.default.todo3Title",
  },
];

export const defaultTodoSurfaces: SurfaceState[] = [
  {
    description: "todo.reflection.surface.board.description",
    label: "todo.reflection.surface.board.label",
    surface: "WORK_BOARD",
    syncedCount: 3,
    tone: "room",
  },
  {
    description: "todo.reflection.surface.dashboard.description",
    label: "todo.reflection.surface.dashboard.label",
    surface: "DASHBOARD",
    syncedCount: 2,
    tone: "personal",
  },
  {
    description: "todo.reflection.surface.bubble.description",
    label: "todo.reflection.surface.bubble.label",
    surface: "BUBBLE",
    syncedCount: 2,
    tone: "todo",
  },
  {
    description: "todo.reflection.surface.calendar.description",
    label: "todo.reflection.surface.calendar.label",
    surface: "CALENDAR",
    syncedCount: 2,
    tone: "timer",
  },
];

export function TodoAssigneeReflectionPanel({
  className,
  surfaces,
  title,
  todos,
  ...props
}: TodoAssigneeReflectionPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("todo.reflection.title");
  const myTodoCount = todos.filter((todo) => todo.isMe).length;
  const urgentCount = todos.filter((todo) => todo.priority === "HIGH").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UserRoundCheck size={16} strokeWidth={2.1} />}>{t("todo.reflection.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("todo.reflection.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("todo.reflection.myTodo")}</span>
          <strong>{t("todo.reflection.count", { count: myTodoCount })}</strong>
          <StatusBadge tone={urgentCount > 0 ? "warning" : "success"}>{t("todo.reflection.urgentCount", { count: urgentCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.flow} aria-label={t("todo.reflection.flowAria")}>
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <ListTodo size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("todo.reflection.flow.singleTitle")}</strong>
            <p>{t("todo.reflection.flow.singleBody")}</p>
          </div>
        </article>
        <span className={styles.flowLine} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <UserRoundCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("todo.reflection.flow.assignTitle")}</strong>
            <p>{t("todo.reflection.flow.assignBody")}</p>
          </div>
        </article>
        <span className={styles.flowLine} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <MonitorUp size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("todo.reflection.flow.multiTitle")}</strong>
            <p>{t("todo.reflection.flow.multiBody")}</p>
          </div>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.todoColumn} aria-label={t("todo.reflection.assignedAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("todo.reflection.assignedTitle")}</strong>
            <StatusBadge tone="todo">{t("todo.reflection.count", { count: todos.length })}</StatusBadge>
          </div>
          <div className={styles.todoStack}>
            {todos.map((todo) => {
              const priority = priorityMeta[todo.priority];

              return (
                <article className={cn(styles.todoRow, todo.isMe && styles.myTodo)} key={todo.id}>
                  <div className={styles.todoTop}>
                    <span className={styles.checkTile}>
                      <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <div className={styles.todoCopy}>
                      <b>{t(todo.title as MessageKey)}</b>
                      <span>
                        {t(todo.projectRoomLabel as MessageKey)} · {t("todo.reflection.assigneePrefix", { name: t(todo.assigneeLabel as MessageKey) })} · {t(todo.dueLabel as MessageKey)}
                      </span>
                    </div>
                    <StatusBadge tone={priority.tone}>{t(priority.labelKey)}</StatusBadge>
                  </div>
                  <ProgressBar value={todo.progressPercent} />
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.surfaceColumn} aria-label={t("todo.reflection.surfaceAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("todo.reflection.surfaceTitle")}</strong>
            <span className={styles.sectionMeta}>{t("todo.reflection.surfaceMeta")}</span>
          </div>
          <div className={styles.surfaceGrid}>
            {surfaces.map((surface) => {
              const Icon = surfaceIcon[surface.surface];

              return (
                <article key={surface.surface}>
                  <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
                  <div>
                    <strong>{t(surface.label as MessageKey)}</strong>
                    <p>{t(surface.description as MessageKey)}</p>
                    <StatusBadge tone={surface.tone}>{t("todo.reflection.displayCount", { count: surface.syncedCount })}</StatusBadge>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("todo.reflection.footerNote")}</span>
        </div>
        <Button icon={<Route size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("todo.reflection.viewLinkStatus")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
