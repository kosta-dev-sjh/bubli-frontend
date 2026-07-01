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
import { cn } from "@/lib/utils";

import styles from "./todo-assignee-reflection-panel.module.css";

type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
type TodoSurface = "WORK_BOARD" | "DASHBOARD" | "BUBBLE" | "CALENDAR";

type AssignedTodo = {
  assigneeLabel: string;
  dueLabel: string;
  id: string;
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
  currentUserLabel?: string;
  surfaces?: SurfaceState[];
  title?: string;
  todos?: AssignedTodo[];
};

const priorityMeta: Record<TodoPriority, { label: string; tone: StatusTone }> = {
  HIGH: { label: "높음", tone: "warning" },
  LOW: { label: "낮음", tone: "personal" },
  MEDIUM: { label: "보통", tone: "pending" },
};

const surfaceIcon: Record<TodoSurface, typeof ListTodo> = {
  BUBBLE: Bell,
  CALENDAR: CalendarDays,
  DASHBOARD: LayoutDashboard,
  WORK_BOARD: PanelTop,
};

export const defaultAssignedTodos: AssignedTodo[] = [];

export const defaultTodoSurfaces: SurfaceState[] = [
  {
    description: "프로젝트룸 안에서는 WBS/작업판의 한 작업 카드로 보입니다.",
    label: "작업판",
    surface: "WORK_BOARD",
    syncedCount: 3,
    tone: "room",
  },
  {
    description: "담당자가 나인 작업은 개인 대시보드의 오늘 업무로 모입니다.",
    label: "대시보드",
    surface: "DASHBOARD",
    syncedCount: 2,
    tone: "personal",
  },
  {
    description: "Tauri 앱에서는 데스크탑 위젯과 알림이 같은 작업을 표시합니다.",
    label: "데스크탑 위젯",
    surface: "BUBBLE",
    syncedCount: 2,
    tone: "todo",
  },
  {
    description: "마감일이 있는 작업은 일정 후보나 캘린더 카드에 연결됩니다.",
    label: "일정",
    surface: "CALENDAR",
    syncedCount: 2,
    tone: "timer",
  },
];

export function TodoAssigneeReflectionPanel({
  className,
  currentUserLabel = "나",
  surfaces = defaultTodoSurfaces,
  title = "담당자 기준 TODO 반영",
  todos = defaultAssignedTodos,
  ...props
}: TodoAssigneeReflectionPanelProps) {
  const myTodoCount = todos.filter((todo) => todo.assigneeLabel === currentUserLabel).length;
  const urgentCount = todos.filter((todo) => todo.priority === "HIGH").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UserRoundCheck size={16} strokeWidth={2.1} />}>TODO 연결</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              프로젝트룸에서 생긴 TODO는 하나의 작업으로 관리합니다. 담당자가 지정되면 개인 대시보드와 데스크탑 위젯은
              같은 작업을 담당자 기준으로 보여줍니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>내 TODO</span>
          <strong>{myTodoCount}개</strong>
          <StatusBadge tone={urgentCount > 0 ? "warning" : "success"}>긴급 {urgentCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.flow} aria-label="TODO 표시 흐름">
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <ListTodo size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>하나의 TODO</strong>
            <p>프로젝트룸 작업판에서 하나로 관리되는 작업입니다.</p>
          </div>
        </article>
        <span className={styles.flowLine} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <UserRoundCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>담당자 지정</strong>
            <p>담당자가 나로 지정된 작업만 개인 화면에 모입니다.</p>
          </div>
        </article>
        <span className={styles.flowLine} aria-hidden="true" />
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <MonitorUp size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>여러 화면 표시</strong>
            <p>작업판, 대시보드, 데스크탑 위젯, 일정이 같은 작업을 봅니다.</p>
          </div>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.todoColumn} aria-label="담당 TODO">
          <div className={styles.sectionTitle}>
            <strong>담당 작업</strong>
            <StatusBadge tone="todo">{todos.length}개</StatusBadge>
          </div>
          <div className={styles.todoStack}>
            {todos.map((todo) => {
              const priority = priorityMeta[todo.priority];

              return (
                <article className={cn(styles.todoRow, todo.assigneeLabel === currentUserLabel && styles.myTodo)} key={todo.id}>
                  <div className={styles.todoTop}>
                    <span className={styles.checkTile}>
                      <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <div className={styles.todoCopy}>
                      <b>{todo.title}</b>
                      <span>
                        {todo.projectRoomLabel} · 담당 {todo.assigneeLabel} · {todo.dueLabel}
                      </span>
                    </div>
                    <StatusBadge tone={priority.tone}>{priority.label}</StatusBadge>
                  </div>
                  <ProgressBar value={todo.progressPercent} />
                </article>
              );
            })}
            {todos.length === 0 ? (
              <article className={styles.todoRow}>
                <div className={styles.todoTop}>
                  <span className={styles.checkTile}>
                    <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div className={styles.todoCopy}>
                    <b>담당 작업이 없습니다</b>
                    <span>서버에서 담당자 기준 TODO를 받으면 이곳에 표시됩니다.</span>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section className={styles.surfaceColumn} aria-label="표시 화면">
          <div className={styles.sectionTitle}>
            <strong>표시되는 화면</strong>
            <span className={styles.sectionMeta}>같은 TODO 기준</span>
          </div>
          <div className={styles.surfaceGrid}>
            {surfaces.map((surface) => {
              const Icon = surfaceIcon[surface.surface];

              return (
                <article key={surface.surface}>
                  <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
                  <div>
                    <strong>{surface.label}</strong>
                    <p>{surface.description}</p>
                    <StatusBadge tone={surface.tone}>{surface.syncedCount}개 표시</StatusBadge>
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
          <span>화면마다 작업을 새로 만들지 않습니다. 담당자와 권한 기준으로 같은 작업을 읽습니다.</span>
        </div>
        <Button icon={<Route size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          연결 상태 보기
        </Button>
      </footer>
    </GlassPanel>
  );
}
