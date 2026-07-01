import { Bell, CheckCircle2, Clock3, MessageCircle, Minus, PanelTop, Sparkles, TimerReset } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-minimized-dock-panel.module.css";

type DockItemTone = "todo" | "agent" | "communication" | "timer" | "memo" | "schedule" | "resource" | "notification";

type DockItemSource = "server" | "cache" | "local";

type DockItem = {
  badge: string;
  description: string;
  label: string;
  source: DockItemSource;
  tone: DockItemTone;
  value: string;
};

export type WidgetMinimizedDockPanelProps = HTMLAttributes<HTMLElement> & {
  dockItems: DockItem[];
  lastSyncedLabel: string;
  title?: string;
};

const toneMeta: Record<DockItemTone, { icon: ReactNode; label: string; statusTone: StatusTone }> = {
  agent: { icon: <Sparkles size={15} strokeWidth={2.1} />, label: "에이전트", statusTone: "agent" },
  communication: { icon: <MessageCircle size={15} strokeWidth={2.1} />, label: "소통", statusTone: "communication" },
  memo: { icon: <PanelTop size={15} strokeWidth={2.1} />, label: "메모", statusTone: "memo" },
  notification: { icon: <Bell size={15} strokeWidth={2.1} />, label: "알림", statusTone: "warning" },
  resource: { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, label: "자료", statusTone: "room" },
  schedule: { icon: <Clock3 size={15} strokeWidth={2.1} />, label: "일정", statusTone: "personal" },
  timer: { icon: <TimerReset size={15} strokeWidth={2.1} />, label: "타이머", statusTone: "timer" },
  todo: { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, label: "TODO", statusTone: "todo" },
};

const sourceMeta: Record<DockItemSource, { label: string; tone: StatusTone }> = {
  cache: { label: "캐시", tone: "pending" },
  local: { label: "로컬", tone: "memo" },
  server: { label: "서버 원본", tone: "success" },
};

export const defaultDockItems: DockItem[] = [
  {
    badge: "3개",
    description: "오늘 확인할 내 TODO와 담당 작업",
    label: "TODO 버블",
    source: "server",
    tone: "todo",
    value: "업무 기준 문서 수정 조항 회신",
  },
  {
    badge: "1개",
    description: "승인 전 후보와 확인 질문",
    label: "에이전트 버블",
    source: "server",
    tone: "agent",
    value: "WBS 후보 검토",
  },
  {
    badge: "방금",
    description: "1:1과 프로젝트룸 메시지",
    label: "소통 버블",
    source: "cache",
    tone: "communication",
    value: "보이스 진행 중",
  },
  {
    badge: "42:18",
    description: "실행 중 타이머와 마지막 heartbeat",
    label: "타이머 버블",
    source: "server",
    tone: "timer",
    value: "토모에 1차 검수",
  },
];

export function WidgetMinimizedDockPanel({
  className,
  dockItems,
  lastSyncedLabel,
  title = "최소화 버블 도크",
  ...props
}: WidgetMinimizedDockPanelProps) {
  const serverCount = dockItems.filter((item) => item.source === "server").length;
  const cachedCount = dockItems.filter((item) => item.source !== "server").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Minus size={16} strokeWidth={2.1} />}>최소화 상태</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              최소화된 버블은 큰 화면을 다시 열지 않아도 지금 볼 값만 짧게 보여줍니다. 서버 원본이 필요한 값과
              기기 안 임시 기록으로 빠르게 보여주는 값을 구분합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>도크 항목</span>
          <strong>{dockItems.length}개</strong>
          <em>{lastSyncedLabel}</em>
        </div>
      </header>

      <section className={styles.dockSurface} aria-label="최소화된 버블 값">
        <div className={styles.dockBar}>
          <span className={styles.brandDot} aria-hidden="true" />
          <strong>Bubli</strong>
          <small>작업 중 표시</small>
          <StatusBadge tone="success">서버 {serverCount}</StatusBadge>
          <StatusBadge tone="pending">캐시/로컬 {cachedCount}</StatusBadge>
        </div>

        <div className={styles.itemGrid}>
          {dockItems.map((item) => {
            const tone = toneMeta[item.tone];
            const source = sourceMeta[item.source];

            return (
              <article className={cn(styles.dockItem, styles[item.tone])} key={`${item.label}-${item.value}`}>
                <div className={styles.itemTop}>
                  <span className={styles.itemIcon} aria-hidden="true">
                    {tone.icon}
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{tone.label}</p>
                  </div>
                  <StatusBadge tone={source.tone}>{source.label}</StatusBadge>
                </div>
                <div className={styles.itemBody}>
                  <b>{item.value}</b>
                  <span>{item.description}</span>
                </div>
                <div className={styles.itemFooter}>
                  <em>{item.badge}</em>
                  <button type="button">열기</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label="도크 표시 기준">
        <article>
          <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>핵심 값만 표시</strong>
            <p>최소화 상태에서는 긴 설명보다 현재 값, 건수, 남은 시간처럼 바로 필요한 정보만 보여줍니다.</p>
          </div>
        </article>
        <article>
          <Bell size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>알림과 함께 정렬</strong>
            <p>새 메시지, 후보, 확인 필요 항목은 도크에서 부드러운 상태 변화로 먼저 알려줍니다.</p>
          </div>
        </article>
        <article>
          <PanelTop size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>표시 상태 저장</strong>
            <p>최소화 여부와 위치는 widget_layouts, 표시 범위는 widget_preferences 기준으로 유지합니다.</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<PanelTop size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          모두 펼치기
        </Button>
        <Button icon={<Bell size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          알림만 보기
        </Button>
      </footer>
    </GlassPanel>
  );
}
