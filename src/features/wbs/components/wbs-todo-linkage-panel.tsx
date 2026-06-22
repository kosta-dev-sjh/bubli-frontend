import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Columns3,
  LayoutDashboard,
  Link2,
  MonitorUp,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./wbs-todo-linkage-panel.module.css";

export type WbsCandidateStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type LinkedTaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type LinkedSurfaceTone = "board" | "dashboard" | "bubble" | "schedule";

export type WbsCandidate = {
  code: string;
  confidence?: number;
  sourceLabel: string;
  status: WbsCandidateStatus;
  title: string;
};

export type LinkedTask = {
  assigneeLabel: string;
  dueLabel: string;
  idLabel: string;
  progress: number;
  status: LinkedTaskStatus;
  title: string;
};

export type LinkedSurface = {
  description: string;
  id: LinkedSurfaceTone;
  label: string;
  sourceLabel: string;
};

export type WbsTodoLinkagePanelProps = {
  candidate?: WbsCandidate;
  className?: string;
  linkedSurfaces?: LinkedSurface[];
  onApproveCandidate?: () => void;
  onOpenBoard?: () => void;
  onOpenSchedule?: () => void;
  onOpenWidget?: () => void;
  task?: LinkedTask;
};

const candidateStatusCopy: Record<WbsCandidateStatus, string> = {
  APPROVED: "승인됨",
  DRAFT: "승인 전",
  HELD: "보류",
  REJECTED: "제외",
};

const candidateTone: Record<WbsCandidateStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

const taskStatusCopy: Record<LinkedTaskStatus, string> = {
  BLOCKED: "막힘",
  DONE: "완료",
  IN_PROGRESS: "진행 중",
  REVIEW: "검토",
  TODO: "할 일",
};

const taskTone: Record<LinkedTaskStatus, "approved" | "pending" | "todo" | "warning" | "neutral"> = {
  BLOCKED: "warning",
  DONE: "approved",
  IN_PROGRESS: "todo",
  REVIEW: "pending",
  TODO: "neutral",
};

const surfaceIcon: Record<LinkedSurfaceTone, ReactNode> = {
  board: <Columns3 size={18} strokeWidth={2.1} />,
  bubble: <MonitorUp size={18} strokeWidth={2.1} />,
  dashboard: <LayoutDashboard size={18} strokeWidth={2.1} />,
  schedule: <CalendarDays size={18} strokeWidth={2.1} />,
};

type SurfaceHandlerKey = "onOpenBoard" | "onOpenSchedule" | "onOpenWidget";

const surfaceCta: Record<LinkedSurfaceTone, { label: string; onClick: SurfaceHandlerKey }> = {
  board: { label: "작업판 열기", onClick: "onOpenBoard" },
  bubble: { label: "버블 보기", onClick: "onOpenWidget" },
  dashboard: { label: "대시보드 기준", onClick: "onOpenBoard" },
  schedule: { label: "일정 열기", onClick: "onOpenSchedule" },
};

const defaultCandidate: WbsCandidate = {
  code: "1.2.1",
  confidence: 91,
  sourceLabel: "번역계약서_v2.pdf, 회의록_0618.md",
  status: "DRAFT",
  title: "1차 번역본 검토",
};

const defaultTask: LinkedTask = {
  assigneeLabel: "담당자 나",
  dueLabel: "D-2",
  idLabel: "task_id로 연결",
  progress: 46,
  status: "IN_PROGRESS",
  title: "1차 번역본 검토",
};

const defaultSurfaces: LinkedSurface[] = [
  {
    description: "WBS 트리와 칸반은 같은 작업을 다른 방식으로 보여줍니다.",
    id: "board",
    label: "WBS/작업판",
    sourceLabel: "wbs_items + tasks",
  },
  {
    description: "담당자 기준으로 내 TODO와 확인할 항목에 함께 표시됩니다.",
    id: "dashboard",
    label: "대시보드",
    sourceLabel: "GET /api/dashboard/tasks",
  },
  {
    description: "작업 중 필요한 제목, 마감, 상태만 버블에 띄웁니다.",
    id: "bubble",
    label: "TODO 버블",
    sourceLabel: "GET /api/widget/summary",
  },
  {
    description: "마감과 일정은 같은 작업의 schedule 연결로 관리합니다.",
    id: "schedule",
    label: "일정/캘린더",
    sourceLabel: "schedules.task_id",
  },
];

export function WbsTodoLinkagePanel({
  candidate = defaultCandidate,
  className,
  linkedSurfaces = defaultSurfaces,
  onApproveCandidate,
  onOpenBoard,
  onOpenSchedule,
  onOpenWidget,
  task = defaultTask,
}: WbsTodoLinkagePanelProps) {
  const handlers = {
    onApproveCandidate,
    onOpenBoard,
    onOpenSchedule,
    onOpenWidget,
  };

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Workflow size={14} />}>WBS/TODO 연결</Chip>
          <h2>WBS 후보를 하나의 TODO로 연결</h2>
          <p>
            에이전트 후보는 사용자가 승인하기 전까지 확정 데이터가 아닙니다. 승인된 작업만
            tasks를 기준으로 여러 실행 화면에 함께 보입니다.
          </p>
        </div>
        <StatusBadge tone={candidateTone[candidate.status]}>{candidateStatusCopy[candidate.status]}</StatusBadge>
      </header>

      <div className={styles.flow}>
        <section className={styles.candidateCard} aria-label="WBS 후보">
          <span className={styles.stepIcon} aria-hidden="true">
            <Bot size={18} strokeWidth={2.1} />
          </span>
          <p className={styles.eyebrow}>WBS 후보</p>
          <h3>{candidate.title}</h3>
          <dl className={styles.metaGrid}>
            <div>
              <dt>WBS 코드</dt>
              <dd>{candidate.code}</dd>
            </div>
            <div>
              <dt>출처</dt>
              <dd>{candidate.sourceLabel}</dd>
            </div>
          </dl>
          {typeof candidate.confidence === "number" ? (
            <ProgressBar label="후보 신뢰도" value={candidate.confidence} />
          ) : null}
          <Button icon={<CheckCircle2 size={15} />} onClick={onApproveCandidate} size="sm" variant="primary">
            후보 승인
          </Button>
        </section>

        <div className={styles.connector} aria-hidden="true">
          <ArrowRight size={22} />
          <span>사용자 확정</span>
        </div>

        <section className={styles.taskCard} aria-label="생성된 하나의 TODO">
          <div className={styles.taskHalo} aria-hidden="true" />
          <div className={styles.taskTop}>
            <span className={styles.taskIcon} aria-hidden="true">
              <ClipboardList size={20} strokeWidth={2.2} />
            </span>
            <StatusBadge tone={taskTone[task.status]}>{taskStatusCopy[task.status]}</StatusBadge>
          </div>
          <p className={styles.eyebrow}>하나의 TODO</p>
          <h3>{task.title}</h3>
          <div className={styles.taskChips}>
            <Chip>{task.dueLabel}</Chip>
            <Chip>{task.assigneeLabel}</Chip>
            <Chip>{task.idLabel}</Chip>
          </div>
          <ProgressBar label="진행률" value={task.progress} />
          <p className={styles.taskNote}>복사본을 만들지 않고 같은 task를 각 화면에서 조회합니다.</p>
        </section>

        <section className={styles.surfaceGrid} aria-label="연결된 실행 화면">
          {linkedSurfaces.map((surface) => {
            const cta = surfaceCta[surface.id];
            const handler = handlers[cta.onClick];

            return (
              <article className={cn(styles.surfaceCard, styles[surface.id])} key={surface.id}>
                <span className={styles.surfaceIcon} aria-hidden="true">
                  {surfaceIcon[surface.id]}
                </span>
                <div>
                  <h3>{surface.label}</h3>
                  <p>{surface.description}</p>
                  <span>{surface.sourceLabel}</span>
                </div>
                {typeof handler === "function" ? (
                  <button className={styles.surfaceButton} onClick={handler} type="button">
                    {cta.label}
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>

      <section className={styles.policyGrid} aria-label="연결 정책">
        <article>
          <Sparkles size={17} strokeWidth={2.1} />
          <h3>후보 생성</h3>
          <p>에이전트는 WBS와 TODO 후보를 만들고 상태를 DRAFT로 둡니다.</p>
        </article>
        <article>
          <CheckCircle2 size={17} strokeWidth={2.1} />
          <h3>확정 반영</h3>
          <p>사용자 승인 후 API가 tasks, wbs_items, schedules에 반영합니다.</p>
        </article>
        <article>
          <Link2 size={17} strokeWidth={2.1} />
          <h3>중복 방지</h3>
          <p>대시보드와 버블은 같은 작업을 담당자와 task_id 기준으로 조회합니다.</p>
        </article>
      </section>

      <footer className={styles.footer}>
        TODO를 복사하지 않고, 하나의 작업을 여러 실행 화면에서 함께 봅니다.
      </footer>
    </GlassPanel>
  );
}
