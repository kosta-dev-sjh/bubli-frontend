import {
  BellRing,
  CalendarDays,
  FolderSearch,
  Grip,
  LayoutDashboard,
  ListTodo,
  PanelTop,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./dashboard-card-library-panel.module.css";

type DashboardCardKind = "TODO" | "SCHEDULE_WBS" | "REVIEW" | "AGENT" | "TIMER" | "RESOURCE";
type CardSource = "SERVER_ORIGINAL" | "WIDGET_ROLLUP" | "LOCAL_HINT";
type CardStatus = "ADDED" | "AVAILABLE" | "DISABLED";

type DashboardCardOption = {
  countLabel: string;
  description: string;
  kind: DashboardCardKind;
  source: CardSource;
  sourceLabel: string;
  status: CardStatus;
  title: string;
  tone: StatusTone;
};

type DashboardRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type DashboardCardLibraryPanelProps = HTMLAttributes<HTMLElement> & {
  cards: DashboardCardOption[];
  rules: DashboardRule[];
  selectedProjectRoomName?: string;
  title?: string;
};

const cardIcons: Record<DashboardCardKind, typeof ListTodo> = {
  AGENT: Sparkles,
  RESOURCE: FolderSearch,
  REVIEW: BellRing,
  SCHEDULE_WBS: CalendarDays,
  TIMER: Timer,
  TODO: ListTodo,
};

const statusMeta: Record<CardStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  ADDED: { actionLabel: "설정", label: "추가됨", tone: "approved" },
  AVAILABLE: { actionLabel: "추가", label: "추가 가능", tone: "pending" },
  DISABLED: { actionLabel: "대기", label: "준비 중", tone: "personal" },
};

const sourceMeta: Record<CardSource, string> = {
  LOCAL_HINT: "기기 안 보조",
  SERVER_ORIGINAL: "기준 데이터",
  WIDGET_ROLLUP: "버블 집계",
};

export const defaultDashboardCards: DashboardCardOption[] = [
  {
    countLabel: "8개",
    description: "여러 프로젝트룸에서 내 담당자로 연결된 할 일을 모아 보여줍니다.",
    kind: "TODO",
    source: "SERVER_ORIGINAL",
    sourceLabel: "확정된 TODO",
    status: "ADDED",
    title: "내 TODO",
    tone: "todo",
  },
  {
    countLabel: "3건",
    description: "오늘 일정과 WBS 흐름을 카드로 올려 작업 순서를 빠르게 확인합니다.",
    kind: "SCHEDULE_WBS",
    source: "SERVER_ORIGINAL",
    sourceLabel: "확정된 일정과 WBS",
    status: "AVAILABLE",
    title: "일정/WBS",
    tone: "room",
  },
  {
    countLabel: "4건",
    description: "문서에서 빠졌거나 값이 다른 항목을 검토 카드로 분리합니다.",
    kind: "REVIEW",
    source: "SERVER_ORIGINAL",
    sourceLabel: "확인 필요 후보",
    status: "ADDED",
    title: "확인 필요",
    tone: "warning",
  },
  {
    countLabel: "2건",
    description: "에이전트가 정리한 후보를 승인 전 상태로 보여줍니다.",
    kind: "AGENT",
    source: "SERVER_ORIGINAL",
    sourceLabel: "에이전트 작업 결과",
    status: "AVAILABLE",
    title: "에이전트 제안",
    tone: "agent",
  },
  {
    countLabel: "03:42",
    description: "타이머 원본과 버블 집계를 합쳐 오늘 작업 시간을 확인합니다.",
    kind: "TIMER",
    source: "WIDGET_ROLLUP",
    sourceLabel: "타이머와 버블 집계",
    status: "AVAILABLE",
    title: "작업 시간",
    tone: "timer",
  },
  {
    countLabel: "5건",
    description: "현재 작업과 관련 있는 자료 후보를 카드로 올릴 수 있게 준비합니다.",
    kind: "RESOURCE",
    source: "SERVER_ORIGINAL",
    sourceLabel: "관련 자료 후보",
    status: "DISABLED",
    title: "자료 제안",
    tone: "memo",
  },
];

export const defaultDashboardRules: DashboardRule[] = [
  {
    description: "대시보드는 프로젝트룸 하나의 현황판이 아니라 사용자를 따라다니는 개인 화면입니다.",
    label: "사용자 기준",
    tone: "personal",
  },
  {
    description: "프로젝트룸 데이터는 접근 권한이 있는 일정, TODO, 자료 후보만 카드에 표시합니다.",
    label: "권한 확인",
    tone: "approved",
  },
  {
    description: "버블은 같은 원본 데이터를 작업 중에 짧게 보여주는 개인 위젯으로 연결합니다.",
    label: "버블 연결",
    tone: "todo",
  },
];

export function DashboardCardLibraryPanel({
  cards,
  className,
  rules,
  selectedProjectRoomName = "전체 프로젝트룸",
  title = "카드 보관함",
  ...props
}: DashboardCardLibraryPanelProps) {
  const addedCount = cards.filter((card) => card.status === "ADDED").length;
  const availableCount = cards.filter((card) => card.status === "AVAILABLE").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<LayoutDashboard size={16} strokeWidth={2.1} />}>개인 대시보드</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              대시보드에 올릴 카드를 고르는 영역입니다. 카드 내용은 확정된 데이터와 버블 집계를 기준으로 가져오고,
              사용자가 고른 구성만 개인 대시보드에 저장합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>현재 추가</span>
          <strong>{addedCount}개</strong>
          <StatusBadge tone="pending">추가 가능 {availableCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.contextRow} aria-label="대시보드 표시 기준">
        <article className={styles.contextCard}>
          <span className={styles.iconTile}>
            <PanelTop size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{selectedProjectRoomName}</strong>
            <p>선택한 프로젝트룸 범위의 정보도 개인 화면에 필요한 만큼만 가져옵니다.</p>
          </div>
        </article>
        <article className={styles.contextCard}>
          <span className={styles.iconTile}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>표시 전 권한 확인</strong>
            <p>개인 자료와 프로젝트룸 자료는 권한 기준을 유지한 뒤 카드에 표시합니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.cardGrid} aria-label="대시보드 카드 후보">
        {cards.map((card) => {
          const CardIcon = cardIcons[card.kind];
          const status = statusMeta[card.status];
          const disabled = card.status === "DISABLED";

          return (
            <article className={cn(styles.cardOption, disabled && styles.disabledCard)} key={card.kind}>
              <div className={styles.cardTop}>
                <span className={styles.iconTile}>
                  <CardIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.cardTitle}>
                  <strong>{card.title}</strong>
                  <span>{card.countLabel}</span>
                </div>
                <span aria-hidden="true" className={styles.dragHandle}>
                  <Grip size={16} strokeWidth={2.1} />
                </span>
              </div>

              <p className={styles.cardDescription}>{card.description}</p>

              <div className={styles.cardMeta}>
                <StatusBadge tone={card.tone}>{sourceMeta[card.source]}</StatusBadge>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>

              <footer className={styles.cardFooter}>
                <span>{card.sourceLabel}</span>
                <Button
                  disabled={disabled}
                  icon={!disabled ? <Plus size={15} strokeWidth={2.2} /> : undefined}
                  size="sm"
                  variant={card.status === "ADDED" ? "quiet" : "secondary"}
                >
                  {status.actionLabel}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="대시보드 구성 기준">
        {rules.map((rule) => (
          <article key={rule.label}>
            <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
            <p>{rule.description}</p>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
