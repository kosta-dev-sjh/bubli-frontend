import {
  CalendarDays,
  CheckCircle2,
  Columns3,
  LayoutDashboard,
  Link2,
  MonitorUp,
  Network,
  Split,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./wbs-todo-linkage-panel.module.css";

type LinkTarget = "WORK_BOARD" | "DASHBOARD" | "BUBBLE" | "CALENDAR";
type CandidateStatus = "PENDING" | "APPROVED" | "EDIT_NEEDED";

type WbsCandidate = {
  code: string;
  dueLabel: string;
  ownerLabel: string;
  status: CandidateStatus;
  title: string;
};

type TodoLink = {
  description: string;
  target: LinkTarget;
  title: string;
};

type LinkageRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type WbsTodoLinkagePanelProps = HTMLAttributes<HTMLElement> & {
  candidates: WbsCandidate[];
  links: TodoLink[];
  progress: number;
  projectRoomName: string;
  rules: LinkageRule[];
  todoTitle: string;
  title?: string;
};

const candidateStatusMeta: Record<CandidateStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  APPROVED: { actionLabel: "연결됨", label: "승인됨", tone: "approved" },
  EDIT_NEEDED: { actionLabel: "수정", label: "수정 필요", tone: "warning" },
  PENDING: { actionLabel: "승인", label: "검토 대기", tone: "personal" },
};

const targetMeta: Record<LinkTarget, { icon: ReactNode; label: string; tone: StatusTone }> = {
  BUBBLE: {
    icon: <MonitorUp size={18} strokeWidth={2.1} aria-hidden="true" />,
    label: "버블",
    tone: "todo",
  },
  CALENDAR: {
    icon: <CalendarDays size={18} strokeWidth={2.1} aria-hidden="true" />,
    label: "캘린더",
    tone: "timer",
  },
  DASHBOARD: {
    icon: <LayoutDashboard size={18} strokeWidth={2.1} aria-hidden="true" />,
    label: "대시보드",
    tone: "personal",
  },
  WORK_BOARD: {
    icon: <Columns3 size={18} strokeWidth={2.1} aria-hidden="true" />,
    label: "작업판",
    tone: "room",
  },
};

export const defaultWbsCandidates: WbsCandidate[] = [
  {
    code: "1.2.1",
    dueLabel: "D-2",
    ownerLabel: "담당자 나",
    status: "APPROVED",
    title: "1차 번역본 검토",
  },
  {
    code: "1.2.2",
    dueLabel: "D-4",
    ownerLabel: "담당자 김지현",
    status: "PENDING",
    title: "수정 요청 정리",
  },
  {
    code: "1.3.1",
    dueLabel: "다음 주",
    ownerLabel: "담당자 미정",
    status: "EDIT_NEEDED",
    title: "최종 납품 기준 확인",
  },
];

export const defaultTodoLinks: TodoLink[] = [
  {
    description: "칸반과 WBS 트리에서 같은 작업을 이동합니다.",
    target: "WORK_BOARD",
    title: "작업판 표시",
  },
  {
    description: "내가 맡은 TODO와 확인 필요 항목에 함께 보입니다.",
    target: "DASHBOARD",
    title: "대시보드 표시",
  },
  {
    description: "작업 중 화면 위에서 오늘 할 일로 짧게 확인합니다.",
    target: "BUBBLE",
    title: "TODO 버블 표시",
  },
  {
    description: "마감일이 일정과 캘린더 표시 데이터로 연결됩니다.",
    target: "CALENDAR",
    title: "캘린더 연결",
  },
];

export const defaultLinkageRules: LinkageRule[] = [
  {
    description: "WBS 후보를 승인하면 화면마다 따로 만든 항목이 아니라 하나의 TODO 원본이 생성됩니다.",
    label: "단일 TODO",
    tone: "approved",
  },
  {
    description: "작업판, 대시보드, 버블, 캘린더는 같은 TODO를 각 화면에 맞게 보여줍니다.",
    label: "여러 화면 표시",
    tone: "room",
  },
  {
    description: "담당자와 마감이 바뀌면 관련 화면도 같은 원본 기준으로 갱신됩니다.",
    label: "상태 동기화",
    tone: "todo",
  },
];

export function WbsTodoLinkagePanel({
  candidates,
  className,
  links,
  progress,
  projectRoomName,
  rules,
  title = "WBS 후보와 TODO 연결",
  todoTitle,
  ...props
}: WbsTodoLinkagePanelProps) {
  const approvedCount = candidates.filter((candidate) => candidate.status === "APPROVED").length;
  const reviewCount = candidates.length - approvedCount;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Network size={16} strokeWidth={2.1} />}>wbs_items · tasks</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              에이전트가 만든 WBS 후보를 사용자가 승인하면 하나의 TODO가 만들어집니다. 같은 TODO가 작업판,
              대시보드, 버블, 캘린더에 함께 표시됩니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{projectRoomName}</span>
          <strong>{approvedCount}개 승인</strong>
          <StatusBadge tone={reviewCount > 0 ? "warning" : "approved"}>검토 {reviewCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.linkageCanvas} aria-label="하나의 TODO 연결 구조">
        <div className={styles.candidateColumn}>
          <div className={styles.columnHeader}>
            <Split size={18} strokeWidth={2.1} aria-hidden="true" />
            <strong>WBS 후보</strong>
          </div>
          {candidates.map((candidate) => {
            const status = candidateStatusMeta[candidate.status];

            return (
              <article className={styles.candidateCard} key={candidate.code}>
                <div>
                  <span>{candidate.code}</span>
                  <strong>{candidate.title}</strong>
                  <p>
                    {candidate.ownerLabel} · {candidate.dueLabel}
                  </p>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </article>
            );
          })}
        </div>

        <div className={styles.centerTodo}>
          <span className={styles.iconTile}>
            <Link2 size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>하나의 TODO</Chip>
          <h3>{todoTitle}</h3>
          <p>담당자, 마감, 상태를 한 곳에서 관리합니다.</p>
          <ProgressBar label="TODO 연결 진행률" value={progress} />
          <Button size="sm" variant="secondary">
            연결 상태 보기
          </Button>
        </div>

        <div className={styles.linkGrid}>
          {links.map((link) => {
            const target = targetMeta[link.target];

            return (
              <article className={styles.linkCard} key={link.target}>
                <span className={styles.iconTile}>{target.icon}</span>
                <div>
                  <StatusBadge tone={target.tone}>{target.label}</StatusBadge>
                  <strong>{link.title}</strong>
                  <p>{link.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label="WBS TODO 연결 기준">
        {rules.map((rule) => (
          <article key={rule.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
