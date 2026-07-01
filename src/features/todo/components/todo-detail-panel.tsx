"use client";

import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Columns3,
  LayoutDashboard,
  ListTodo,
  MonitorUp,
  PauseCircle,
  PencilLine,
  Save,
  Trash2,
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

import styles from "./todo-detail-panel.module.css";

export type TodoDetailScope = "PERSONAL" | "PROJECT_ROOM";
export type TodoDetailStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type TodoDetailSource = "DIRECT" | "APPROVED_CANDIDATE";
export type TodoDetailSurface = "WORK_BOARD" | "DASHBOARD" | "BUBBLE" | "SCHEDULE";

export type TodoDetail = {
  assigneeLabel?: string;
  description?: string;
  dueLabel?: string;
  id: string;
  linkedProjectRoomLabel?: string;
  progressPercent: number;
  scope: TodoDetailScope;
  source: TodoDetailSource;
  status: TodoDetailStatus;
  surfaces: TodoDetailSurface[];
  title: string;
};

export type TodoDetailPanelProps = HTMLAttributes<HTMLElement> & {
  onDelete?: (todoId: string) => void;
  onSave?: (todoId: string) => void;
  onStatusChange?: (todoId: string, status: TodoDetailStatus) => void;
  todo?: TodoDetail;
};

const statusMeta: Record<TodoDetailStatus, { icon: ReactNode; label: string; tone: StatusTone }> = {
  BLOCKED: { icon: <PauseCircle size={16} strokeWidth={2.1} />, label: "막힘", tone: "warning" },
  DONE: { icon: <CheckCircle2 size={16} strokeWidth={2.1} />, label: "완료", tone: "approved" },
  IN_PROGRESS: { icon: <PencilLine size={16} strokeWidth={2.1} />, label: "진행 중", tone: "todo" },
  REVIEW: { icon: <UserRoundCheck size={16} strokeWidth={2.1} />, label: "검토", tone: "pending" },
  TODO: { icon: <Circle size={16} strokeWidth={2.1} />, label: "할 일", tone: "neutral" },
};

const scopeMeta: Record<TodoDetailScope, { label: string; tone: StatusTone }> = {
  PERSONAL: { label: "개인 TODO", tone: "personal" },
  PROJECT_ROOM: { label: "프로젝트룸 TODO", tone: "room" },
};

const sourceMeta: Record<TodoDetailSource, { description: string; label: string }> = {
  APPROVED_CANDIDATE: {
    description: "에이전트가 제안한 후보를 사용자가 확인한 뒤 TODO로 만든 항목입니다.",
    label: "승인한 후보",
  },
  DIRECT: {
    description: "사용자가 직접 추가한 TODO입니다.",
    label: "직접 추가",
  },
};

const surfaceMeta: Record<TodoDetailSurface, { icon: ReactNode; label: string }> = {
  BUBBLE: { icon: <MonitorUp size={15} strokeWidth={2.1} />, label: "데스크탑 위젯" },
  DASHBOARD: { icon: <LayoutDashboard size={15} strokeWidth={2.1} />, label: "대시보드" },
  SCHEDULE: { icon: <CalendarClock size={15} strokeWidth={2.1} />, label: "일정" },
  WORK_BOARD: { icon: <Columns3 size={15} strokeWidth={2.1} />, label: "작업판" },
};

const statusOrder: TodoDetailStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];

export const defaultTodoDetail: TodoDetail = {
  assigneeLabel: "나",
  description: "회의록과 업무 기준 문서의 납품일 표현이 달라 클라이언트에게 기준 날짜를 확인합니다.",
  dueLabel: "오늘",
  id: "todo-send-client-question",
  linkedProjectRoomLabel: "신규 웹사이트 번역",
  progressPercent: 42,
  scope: "PROJECT_ROOM",
  source: "APPROVED_CANDIDATE",
  status: "IN_PROGRESS",
  surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE"],
  title: "납품일 확인 질문 보내기",
};

export function TodoDetailPanel({
  className,
  onDelete,
  onSave,
  onStatusChange,
  todo = defaultTodoDetail,
  ...props
}: TodoDetailPanelProps) {
  const status = statusMeta[todo.status];
  const scope = scopeMeta[todo.scope];
  const source = sourceMeta[todo.source];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListTodo size={15} strokeWidth={2.1} />}>TODO 상세</Chip>
          <div>
            <h2 className={styles.title}>{todo.title}</h2>
            <p className={styles.description}>
              하나의 TODO를 원본으로 두고, 상태와 담당자 기준에 따라 작업판, 대시보드, 데스크탑 위젯, 일정에 함께 표시합니다.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Save size={15} strokeWidth={2.1} />} onClick={() => onSave?.(todo.id)} size="sm" variant="primary">
            저장
          </Button>
          <Button icon={<Trash2 size={15} strokeWidth={2.1} />} onClick={() => onDelete?.(todo.id)} size="sm" variant="quiet">
            삭제
          </Button>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label="TODO 핵심 정보">
        <article>
          <span>상태</span>
          <strong>{status.label}</strong>
          <StatusBadge tone={status.tone}>{status.icon} 현재 상태</StatusBadge>
        </article>
        <article>
          <span>구분</span>
          <strong>{scope.label}</strong>
          <StatusBadge tone={scope.tone}>{todo.linkedProjectRoomLabel ?? "개인 작업"}</StatusBadge>
        </article>
        <article>
          <span>담당자</span>
          <strong>{todo.assigneeLabel ?? "나"}</strong>
          <p>{todo.scope === "PROJECT_ROOM" ? "담당자 기준으로 개인 화면에 표시" : "사용자에게 귀속"}</p>
        </article>
        <article>
          <span>마감</span>
          <strong>{todo.dueLabel ?? "없음"}</strong>
          <p>마감이 있으면 일정에도 연결됩니다.</p>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.editorCard} aria-label="TODO 수정">
          <div className={styles.sectionTitle}>
            <strong>상태 변경</strong>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <div className={styles.statusGrid}>
            {statusOrder.map((statusKey) => {
              const meta = statusMeta[statusKey];
              const selected = statusKey === todo.status;

              return (
                <button
                  className={cn(styles.statusButton, selected && styles.statusButtonSelected)}
                  key={statusKey}
                  onClick={() => onStatusChange?.(todo.id, statusKey)}
                  type="button"
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  <b>{meta.label}</b>
                </button>
              );
            })}
          </div>

          <div className={styles.memoBox}>
            <span>설명</span>
            <p>{todo.description ?? "아직 설명이 없습니다."}</p>
          </div>

          <div className={styles.progressBox}>
            <div>
              <span>진행률</span>
              <strong>{todo.progressPercent}%</strong>
            </div>
            <ProgressBar value={todo.progressPercent} />
          </div>
        </section>

        <aside className={styles.linkCard} aria-label="TODO 연결 기준">
          <div className={styles.sectionTitle}>
            <strong>표시 화면</strong>
            <StatusBadge tone="todo">{todo.surfaces.length}곳</StatusBadge>
          </div>
          <div className={styles.surfaceStack}>
            {todo.surfaces.map((surface) => {
              const meta = surfaceMeta[surface];

              return (
                <div className={styles.surfaceRow} key={surface}>
                  <span aria-hidden="true">{meta.icon}</span>
                  <b>{meta.label}</b>
                  <small>{surface === "WORK_BOARD" ? "프로젝트룸 안 작업" : "개인 실행 화면"}</small>
                </div>
              );
            })}
          </div>

          <div className={styles.sourceCard}>
            <span>{source.label}</span>
            <p>{source.description}</p>
          </div>

          <div className={styles.ruleList}>
            <p>같은 TODO를 화면마다 복사하지 않습니다.</p>
            <p>후보는 승인 전까지 확정 TODO가 아닙니다.</p>
            <p>프로젝트룸 TODO는 담당자 기준으로 개인 화면에 보입니다.</p>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
