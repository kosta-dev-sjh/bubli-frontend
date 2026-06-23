import {
  Activity,
  Gauge,
  MousePointer2,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-motion-policy-panel.module.css";

type MotionMode = "static" | "hover" | "signal" | "reduced";
type MotionRuleStatus = "allowed" | "limited" | "avoid";
type MotionToken = "transform" | "opacity" | "shadow" | "layout";

type MotionRule = {
  description: string;
  label: string;
  status: MotionRuleStatus;
  token: MotionToken;
};

type MotionScenario = {
  description: string;
  durationLabel: string;
  eventSource: "hover" | "notification" | "setting";
  label: string;
  mode: MotionMode;
};

export type WidgetMotionPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  activeMode?: MotionMode;
  rules: MotionRule[];
  scenarios: MotionScenario[];
  title?: string;
};

const modeMeta: Record<MotionMode, { icon: typeof PauseCircle; tone: StatusTone }> = {
  hover: { icon: MousePointer2, tone: "todo" },
  reduced: { icon: PauseCircle, tone: "personal" },
  signal: { icon: Activity, tone: "agent" },
  static: { icon: ShieldCheck, tone: "success" },
};

const statusMeta: Record<MotionRuleStatus, { label: string; tone: StatusTone }> = {
  allowed: { label: "사용", tone: "success" },
  avoid: { label: "피함", tone: "warning" },
  limited: { label: "제한", tone: "pending" },
};

const tokenLabel: Record<MotionToken, string> = {
  layout: "layout",
  opacity: "opacity",
  shadow: "rim/shadow",
  transform: "transform",
};

export const defaultMotionScenarios: MotionScenario[] = [
  {
    description: "작업 중 버블은 가만히 두고, 사용자가 방해받지 않게 정보 밀도와 가독성을 우선합니다.",
    durationLabel: "상시",
    eventSource: "setting",
    label: "정적 기본",
    mode: "static",
  },
  {
    description: "마우스를 올렸을 때만 유리 림, 그림자, 짧은 이동으로 조작 가능 상태를 보여줍니다.",
    durationLabel: "180ms",
    eventSource: "hover",
    label: "호버 반응",
    mode: "hover",
  },
  {
    description: "새 제안이나 알림이 생긴 순간에만 짧은 pulse를 쓰고 반복 부유는 기본으로 끕니다.",
    durationLabel: "1회",
    eventSource: "notification",
    label: "상태 신호",
    mode: "signal",
  },
  {
    description: "시스템 설정이나 앱 설정에서 모션 줄이기를 켜면 부유와 pulse를 모두 멈춥니다.",
    durationLabel: "즉시",
    eventSource: "setting",
    label: "모션 줄이기",
    mode: "reduced",
  },
];

export const defaultMotionRules: MotionRule[] = [
  {
    description: "버튼, 카드, 버블 호버 반응은 위치 계산을 흔들지 않는 이동값만 씁니다.",
    label: "가벼운 이동",
    status: "allowed",
    token: "transform",
  },
  {
    description: "새 알림이나 제안은 짧게 나타났다 사라지는 투명도 변화로만 알려줍니다.",
    label: "짧은 신호",
    status: "limited",
    token: "opacity",
  },
  {
    description: "유리 표면은 호버 때 림과 그림자만 살아나게 해서 작업 화면을 덜 가립니다.",
    label: "유리 림",
    status: "allowed",
    token: "shadow",
  },
  {
    description: "크기, 위치, 줄바꿈이 계속 바뀌는 움직임은 작업 중 읽기 흐름을 깨서 쓰지 않습니다.",
    label: "배치 흔들림",
    status: "avoid",
    token: "layout",
  },
];

export function WidgetMotionPolicyPanel({
  activeMode = "static",
  className,
  rules,
  scenarios,
  title = "위젯 모션 정책",
  ...props
}: WidgetMotionPolicyPanelProps) {
  const activeScenario = scenarios.find((scenario) => scenario.mode === activeMode) ?? scenarios[0];
  const activeMeta = modeMeta[activeScenario.mode];
  const ActiveIcon = activeMeta.icon;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Waves size={16} strokeWidth={2.1} />}>버블 모션 기준</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              위젯은 작업 중 화면 위에 남는 개인 영역입니다. 기본은 정적으로 두고, 필요한 순간에만
              `transform`과 `opacity` 중심의 짧은 반응을 사용합니다. 모션 설정과 상세 사용 이벤트는 Tauri 쪽에서
              다루고, 서버에는 필요한 설정과 집계값만 남깁니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>현재 정책</span>
          <strong>{activeScenario.label}</strong>
          <StatusBadge tone={activeMeta.tone}>{activeScenario.durationLabel}</StatusBadge>
        </div>
      </header>

      <section className={styles.sceneGrid} aria-label="버블 모션 미리보기">
        <article className={styles.previewScene}>
          <div className={styles.windowBar}>
            <span />
            <b>작업 화면</b>
          </div>
          <div className={cn(styles.motionBubble, styles[activeScenario.mode])}>
            <div className={styles.bubbleHeader}>
              <span className={styles.bubbleIcon}>
                <ActiveIcon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <strong>TODO 버블</strong>
                <p>{activeScenario.label}</p>
              </div>
            </div>
            <div className={styles.taskLine}>
              <span />
              <b>PRD 2차 검토</b>
            </div>
            <div className={styles.taskLine}>
              <span />
              <b>WBS 구조 설계</b>
            </div>
            <div className={styles.bubbleFooter}>
              <StatusBadge tone={activeMeta.tone}>{activeScenario.durationLabel}</StatusBadge>
              <span>{activeScenario.eventSource}</span>
            </div>
          </div>
        </article>

        <aside className={styles.scenarioList} aria-label="모션 시나리오">
          {scenarios.map((scenario) => {
            const meta = modeMeta[scenario.mode];
            const Icon = meta.icon;
            const selected = scenario.mode === activeMode;

            return (
              <button
                aria-pressed={selected}
                className={cn(styles.scenarioCard, selected && styles.selected)}
                key={scenario.mode}
                type="button"
              >
                <span className={styles.scenarioIcon}>
                  <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.scenarioCopy}>
                  <b>{scenario.label}</b>
                  <span>{scenario.description}</span>
                </span>
                <StatusBadge tone={meta.tone}>{scenario.durationLabel}</StatusBadge>
              </button>
            );
          })}
        </aside>
      </section>

      <section className={styles.ruleGrid} aria-label="구현 규칙">
        {rules.map((rule) => {
          const status = statusMeta[rule.status];

          return (
            <article className={styles.ruleCard} key={`${rule.token}-${rule.label}`}>
              <div className={styles.ruleTop}>
                <span>{tokenLabel[rule.token]}</span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.boundaryGrid} aria-label="저장과 접근성 기준">
        <article>
          <Gauge size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>성능 기준</strong>
            <p>반응은 GPU 친화적인 속성만 쓰고, 배치가 흔들리는 animation은 만들지 않습니다.</p>
          </div>
        </article>
        <article>
          <PauseCircle size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>접근성 기준</strong>
            <p>`prefers-reduced-motion`과 앱 설정에서 모션을 끌 수 있어야 합니다.</p>
          </div>
        </article>
        <article>
          <Sparkles size={17} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>저장 기준</strong>
            <p>모션 설정은 사용자 설정으로 저장하고, 상세 조작 이벤트는 로컬 기록으로 다룹니다.</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<MousePointer2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          호버 상태 보기
        </Button>
        <Button icon={<PauseCircle size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          모션 끄기
        </Button>
      </footer>
    </GlassPanel>
  );
}
