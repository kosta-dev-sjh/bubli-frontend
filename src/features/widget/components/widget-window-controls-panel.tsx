import {
  AlignCenter,
  EyeOff,
  Grip,
  Layers3,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Pin,
  Rows3,
  ShieldCheck,
  Type,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-window-controls-panel.module.css";

type WidgetDensity = "default" | "focus" | "compact";
type WidgetTextMode = "light" | "dark" | "auto";

type WidgetWindowControl = {
  description: string;
  enabled: boolean;
  icon: ReactNode;
  label: string;
};

type WidgetPersistenceRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type WidgetWindowControlsPanelProps = HTMLAttributes<HTMLElement> & {
  controls: WidgetWindowControl[];
  density: WidgetDensity;
  persistenceRules: WidgetPersistenceRule[];
  textMode: WidgetTextMode;
  title?: string;
  visibleBubbleCount: number;
};

const densityMeta: Record<WidgetDensity, { label: string; tone: StatusTone }> = {
  compact: { label: "컴팩트", tone: "pending" },
  default: { label: "기본", tone: "personal" },
  focus: { label: "집중", tone: "success" },
};

const textModeMeta: Record<WidgetTextMode, { label: string; tone: StatusTone }> = {
  auto: { label: "배경 기준", tone: "pending" },
  dark: { label: "어두운 글자", tone: "neutral" },
  light: { label: "밝은 글자", tone: "room" },
};

export const defaultWidgetWindowControls: WidgetWindowControl[] = [
  {
    description: "창을 다른 작업 화면 위에 남겨 둡니다.",
    enabled: true,
    icon: <Pin size={16} strokeWidth={2.1} />,
    label: "상단 고정",
  },
  {
    description: "유리 질감을 유지하면서 배경을 더 비치게 합니다.",
    enabled: false,
    icon: <EyeOff size={16} strokeWidth={2.1} />,
    label: "고스트 모드",
  },
  {
    description: "버블을 도크 값만 남긴 상태로 접습니다.",
    enabled: true,
    icon: <Minimize2 size={16} strokeWidth={2.1} />,
    label: "최소화",
  },
  {
    description: "겹친 버블을 화면 안쪽으로 정렬합니다.",
    enabled: true,
    icon: <AlignCenter size={16} strokeWidth={2.1} />,
    label: "자동 레이아웃",
  },
];

export const defaultWidgetPersistenceRules: WidgetPersistenceRule[] = [
  {
    description: "활성 여부, 위치, 크기, 최소화 상태는 서버 설정으로 유지합니다.",
    label: "창 위치와 크기",
    tone: "room",
  },
  {
    description: "선택한 프로젝트룸, 투명도, 고스트 모드, 알림 기준은 사용자 옵션으로 저장합니다.",
    label: "사용자 표시 옵션",
    tone: "personal",
  },
  {
    description: "열기, 클릭, 드래그 같은 상세 이벤트는 기기 안에만 남깁니다.",
    label: "상세 사용 기록",
    tone: "pending",
  },
];

export function WidgetWindowControlsPanel({
  className,
  controls,
  density,
  persistenceRules,
  textMode,
  title = "버블 창 제어",
  visibleBubbleCount,
  ...props
}: WidgetWindowControlsPanelProps) {
  const currentDensity = densityMeta[density];
  const currentTextMode = textModeMeta[textMode];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Layers3 size={16} strokeWidth={2.1} />}>데스크톱 버블</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              버블은 회원 웹 화면을 작게 복제한 것이 아니라 작업 중 화면 위에 남는 개인 도구입니다. 위치와 표시
              설정은 저장하고, 세부 사용 이벤트는 로컬에서만 다룹니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>표시 중인 버블</span>
          <strong>{visibleBubbleCount}개</strong>
          <StatusBadge tone={currentDensity.tone}>{currentDensity.label}</StatusBadge>
        </div>
      </header>

      <section className={styles.preview} aria-label="버블 창 제어 미리보기">
        <div className={styles.previewBar}>
          <span />
          <b>작업 화면 위 버블</b>
          <em>{currentTextMode.label}</em>
        </div>
        <div className={styles.bubbleMock}>
          <div className={styles.bubbleHeader}>
            <strong>TODO 버블</strong>
            <div className={styles.iconButtons} aria-hidden="true">
              <Pin size={14} strokeWidth={2.1} />
              <EyeOff size={14} strokeWidth={2.1} />
              <Minimize2 size={14} strokeWidth={2.1} />
            </div>
          </div>
          <div className={styles.bubbleBody}>
            <span>계약서 수정 조항 확인</span>
            <b>오늘 18:00</b>
          </div>
          <div className={styles.bubbleFooter}>
            <span>
              <Grip size={13} strokeWidth={2.1} aria-hidden="true" />
              드래그 가능
            </span>
            <span>
              <Maximize2 size={13} strokeWidth={2.1} aria-hidden="true" />
              338px
            </span>
          </div>
        </div>
      </section>

      <section className={styles.controlGrid} aria-label="버블 조작">
        {controls.map((control) => (
          <article className={cn(styles.controlCard, control.enabled && styles.enabled)} key={control.label}>
            <span className={styles.controlIcon} aria-hidden="true">
              {control.icon}
            </span>
            <div>
              <strong>{control.label}</strong>
              <p>{control.description}</p>
            </div>
            <StatusBadge tone={control.enabled ? "success" : "neutral"}>{control.enabled ? "켜짐" : "꺼짐"}</StatusBadge>
          </article>
        ))}
      </section>

      <section className={styles.optionStrip} aria-label="밀도와 글자 표시 옵션">
        <article>
          <Rows3 size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>표시 밀도</span>
          <StatusBadge tone={currentDensity.tone}>{currentDensity.label}</StatusBadge>
        </article>
        <article>
          <Type size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>고스트 모드 글자</span>
          <StatusBadge tone={currentTextMode.tone}>{currentTextMode.label}</StatusBadge>
        </article>
        <article>
          <MousePointerClick size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>이벤트 기록</span>
          <StatusBadge tone="pending">로컬 상세</StatusBadge>
        </article>
      </section>

      <section className={styles.persistenceList} aria-label="저장 기준">
        {persistenceRules.map((rule) => (
          <article className={styles.persistenceItem} key={rule.label}>
            <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </div>
            <StatusBadge tone={rule.tone}>저장 기준</StatusBadge>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Button icon={<AlignCenter size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          자동 정렬
        </Button>
        <Button icon={<EyeOff size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          고스트 전환
        </Button>
        <Button icon={<Minimize2 size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
          도크로 접기
        </Button>
      </footer>
    </GlassPanel>
  );
}
