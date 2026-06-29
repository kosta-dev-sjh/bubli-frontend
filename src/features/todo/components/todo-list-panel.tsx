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

const statusMeta: Record<TodoStatus, { icon: ReactNode; label: string; tone: StatusTone }> = {
  BLOCKED: { icon: <PauseCircle size={16} strokeWidth={2.1} />, label: "막힘", tone: "warning" },
  DONE: { icon: <CheckCircle2 size={16} strokeWidth={2.1} />, label: "완료", tone: "approved" },
  IN_PROGRESS: { icon: <Clock3 size={16} strokeWidth={2.1} />, label: "진행 중", tone: "todo" },
  REVIEW: { icon: <PencilLine size={16} strokeWidth={2.1} />, label: "검토", tone: "pending" },
  TODO: { icon: <Circle size={16} strokeWidth={2.1} />, label: "할 일", tone: "neutral" },
};

const scopeMeta: Record<TodoScope, { label: string; tone: StatusTone }> = {
  PERSONAL: { label: "개인 TODO", tone: "personal" },
  PROJECT_ROOM: { label: "프로젝트룸 TODO", tone: "room" },
};

const sourceMeta: Record<TodoSource, string> = {
  APPROVED_CANDIDATE: "승인한 후보",
  DIRECT: "직접 추가",
};

const surfaceMeta: Record<TodoViewSurface, { icon: ReactNode; label: string }> = {
  BUBBLE: { icon: <MonitorUp size={14} strokeWidth={2.1} />, label: "데스크탑 위젯" },
  DASHBOARD: { icon: <LayoutDashboard size={14} strokeWidth={2.1} />, label: "대시보드" },
  SCHEDULE: { icon: <CalendarClock size={14} strokeWidth={2.1} />, label: "일정" },
  WORK_BOARD: { icon: <Columns3 size={14} strokeWidth={2.1} />, label: "작업판" },
};

export const defaultTodos: TodoItem[] = [
  {
    assigneeLabel: "정현",
    dueLabel: "오늘",
    id: "todo-send-client-question",
    projectRoomLabel: "신규 웹사이트 번역",
    scope: "PROJECT_ROOM",
    source: "APPROVED_CANDIDATE",
    status: "IN_PROGRESS",
    surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE"],
    title: "납품일 확인 질문 보내기",
  },
  {
    assigneeLabel: "정현",
    dueLabel: "D-2",
    id: "todo-review-translation",
    projectRoomLabel: "신규 웹사이트 번역",
    scope: "PROJECT_ROOM",
    source: "DIRECT",
    status: "REVIEW",
    surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE", "SCHEDULE"],
    title: "1차 번역본 검토",
  },
  {
    dueLabel: "오늘",
    id: "todo-personal-memo",
    scope: "PERSONAL",
    source: "DIRECT",
    status: "TODO",
    surfaces: ["DASHBOARD", "BUBBLE"],
    title: "회의 전에 확인할 질문 정리",
  },
  {
    assigneeLabel: "정현",
    dueLabel: "6.27",
    id: "todo-resource-tags",
    projectRoomLabel: "서비스 소개 페이지",
    scope: "PROJECT_ROOM",
    source: "APPROVED_CANDIDATE",
    status: "BLOCKED",
    surfaces: ["WORK_BOARD", "DASHBOARD"],
    title: "참고 자료 태그 기준 확인",
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
  title = "내 TODO",
  todos = defaultTodos,
  ...props
}: TodoListPanelProps) {
  const filteredTodos = getFilteredTodos(todos, selectedFilter);
  const activeCount = todos.filter((todo) => todo.status !== "DONE").length;
  const projectRoomCount = todos.filter((todo) => todo.scope === "PROJECT_ROOM").length;
  const personalCount = todos.filter((todo) => todo.scope === "PERSONAL").length;
  const donePercent = Math.round((todos.filter((todo) => todo.status === "DONE").length / Math.max(todos.length, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListTodo size={15} strokeWidth={2.1} />}>TODO</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              개인 TODO와 프로젝트룸 TODO를 한 화면에서 봅니다. 프로젝트룸 TODO는 담당자 기준으로 대시보드와 데스크탑 위젯에도 함께 보입니다.
            </p>
          </div>
        </div>
        <Button icon={<PencilLine size={15} strokeWidth={2.1} />} onClick={onAddTodo} size="sm" variant="primary">
          TODO 추가
        </Button>
      </header>

      <section className={styles.summaryGrid} aria-label="TODO 요약">
        <article>
          <span>진행할 TODO</span>
          <strong>{activeCount}개</strong>
          <p>완료 전 작업</p>
        </article>
        <article>
          <span>프로젝트룸 TODO</span>
          <strong>{projectRoomCount}개</strong>
          <p>담당자 기준 표시</p>
        </article>
        <article>
          <span>개인 TODO</span>
          <strong>{personalCount}개</strong>
          <p>나에게만 귀속</p>
        </article>
        <article>
          <span>완료율</span>
          <strong>{donePercent}%</strong>
          <ProgressBar value={donePercent} />
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.todoList} aria-label="TODO 목록">
          <div className={styles.listHeader}>
            <strong>표시 중인 TODO</strong>
            <StatusBadge tone="todo">{filteredTodos.length}개</StatusBadge>
          </div>

          {filteredTodos.map((todo) => {
            const status = statusMeta[todo.status];
            const scope = scopeMeta[todo.scope];

            return (
              <article className={styles.todoCard} key={todo.id}>
                <div className={styles.todoTop}>
                  <span className={styles.statusIcon} aria-hidden="true">
                    {status.icon}
                  </span>
                  <div className={styles.todoCopy}>
                    <strong>{todo.title}</strong>
                    <span>
                      {todo.projectRoomLabel ?? "개인 작업"} · {todo.assigneeLabel ? `담당 ${todo.assigneeLabel}` : "내 작업"} · {todo.dueLabel ?? "마감 없음"}
                    </span>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>

                <div className={styles.todoMeta}>
                  <StatusBadge tone={scope.tone}>{scope.label}</StatusBadge>
                  <span>{sourceMeta[todo.source]}</span>
                  <span>{todo.scope === "PROJECT_ROOM" ? "여러 화면 표시" : "개인 영역 표시"}</span>
                </div>

                <div className={styles.surfaceRow} aria-label={`${todo.title} 표시 화면`}>
                  {todo.surfaces.map((surface) => {
                    const surfaceInfo = surfaceMeta[surface];

                    return (
                      <span key={surface}>
                        {surfaceInfo.icon}
                        {surfaceInfo.label}
                      </span>
                    );
                  })}
                </div>

                <footer className={styles.todoFooter}>
                  <span>에이전트가 만든 후보는 사용자가 승인한 뒤에만 TODO로 만듭니다.</span>
                  <Button onClick={() => onOpenTodo?.(todo.id)} size="sm" variant="quiet">
                    자세히 보기
                  </Button>
                </footer>
              </article>
            );
          })}
        </section>

        <aside className={styles.policyPanel} aria-label="TODO 저장과 표시 기준">
          <article>
            <UserRoundCheck size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>담당자 기준</strong>
              <p>프로젝트룸 TODO에 담당자가 지정되면 그 사용자의 대시보드와 데스크탑 위젯 요약에 보입니다.</p>
            </div>
          </article>
          <article>
            <LayoutDashboard size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>복사하지 않기</strong>
              <p>같은 작업을 여러 화면에서 볼 뿐, 화면마다 새 TODO를 만들지 않습니다.</p>
            </div>
          </article>
          <article>
            <MonitorUp size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>데스크탑 표시</strong>
              <p>오늘 볼 일과 가까운 마감은 작업 중 데스크탑 위젯에 짧게 표시됩니다.</p>
            </div>
          </article>
        </aside>
      </div>
    </GlassPanel>
  );
}
