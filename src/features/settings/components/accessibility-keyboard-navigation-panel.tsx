import {
  CheckCircle2,
  CircleDot,
  CornerDownLeft,
  Eye,
  Keyboard,
  MousePointer2,
  PanelTopClose,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./accessibility-keyboard-navigation-panel.module.css";

type KeyboardPriority = "required" | "important" | "watch";
type KeyboardTargetKind = "button" | "input" | "dialog" | "bubble" | "board";
type KeyboardRuleState = "ready" | "needsReview" | "blocked";

type KeyboardTarget = {
  description: string;
  keyFlow: string;
  kind: KeyboardTargetKind;
  label: string;
  priority: KeyboardPriority;
};

type KeyboardRule = {
  description: string;
  label: string;
  state: KeyboardRuleState;
};

export type AccessibilityKeyboardNavigationPanelProps = HTMLAttributes<HTMLElement> & {
  activeTarget?: KeyboardTargetKind;
  rules: KeyboardRule[];
  targets: KeyboardTarget[];
  title?: string;
};

const priorityMeta: Record<KeyboardPriority, { label: string; tone: StatusTone }> = {
  important: { label: "중요", tone: "todo" },
  required: { label: "필수", tone: "success" },
  watch: { label: "점검", tone: "pending" },
};

const targetMeta: Record<KeyboardTargetKind, { icon: typeof Keyboard; tone: StatusTone }> = {
  board: { icon: CircleDot, tone: "room" },
  bubble: { icon: MousePointer2, tone: "timer" },
  button: { icon: CheckCircle2, tone: "success" },
  dialog: { icon: PanelTopClose, tone: "warning" },
  input: { icon: CornerDownLeft, tone: "todo" },
};

const ruleMeta: Record<KeyboardRuleState, { label: string; tone: StatusTone }> = {
  blocked: { label: "막힘", tone: "warning" },
  needsReview: { label: "확인", tone: "pending" },
  ready: { label: "준비", tone: "success" },
};

export const defaultKeyboardTargets: KeyboardTarget[] = [
  {
    description: "자료 업로드, 후보 승인, 저장처럼 결과가 남는 버튼은 Tab으로 닿고 Enter 또는 Space로 실행합니다.",
    keyFlow: "Tab -> Enter",
    kind: "button",
    label: "주요 버튼",
    priority: "required",
  },
  {
    description: "검색, 채팅 입력, 이름 입력은 포커스 위치와 입력 상태가 분명해야 합니다.",
    keyFlow: "Tab -> Type -> Enter",
    kind: "input",
    label: "입력창",
    priority: "required",
  },
  {
    description: "초대, 삭제, 복구 확인 창은 닫기와 취소가 키보드로 가능해야 합니다.",
    keyFlow: "Esc 또는 Shift+Tab",
    kind: "dialog",
    label: "확인 창",
    priority: "important",
  },
  {
    description: "TODO, 타이머, 알림 버블은 작아도 기본 조작과 닫기 버튼에 포커스가 보여야 합니다.",
    keyFlow: "Tab -> Space",
    kind: "bubble",
    label: "버블 기본 조작",
    priority: "required",
  },
  {
    description: "작업판과 자료보드는 드래그 전용으로 만들지 않고 선택, 이동, 열기 대체 흐름을 둡니다.",
    keyFlow: "Tab -> Arrow -> Enter",
    kind: "board",
    label: "보드 항목",
    priority: "watch",
  },
];

export const defaultKeyboardRules: KeyboardRule[] = [
  {
    description: "포커스는 화면의 읽는 순서와 같은 방향으로 이동해야 합니다.",
    label: "이동 순서",
    state: "ready",
  },
  {
    description: "선택된 항목은 유리 테두리와 색 변화로 보이되 글자를 가리지 않습니다.",
    label: "보이는 포커스",
    state: "ready",
  },
  {
    description: "닫기, 취소, 되돌리기 동작은 마우스 없이도 실행할 수 있어야 합니다.",
    label: "탈출 경로",
    state: "needsReview",
  },
  {
    description: "활동 감지와 위젯 조작은 키 입력 내용을 저장하는 기능으로 쓰지 않습니다.",
    label: "입력 보호",
    state: "ready",
  },
];

export function AccessibilityKeyboardNavigationPanel({
  activeTarget = "bubble",
  className,
  rules,
  targets,
  title = "키보드 접근성 점검",
  ...props
}: AccessibilityKeyboardNavigationPanelProps) {
  const active = targets.find((target) => target.kind === activeTarget) ?? targets[0];
  const activeMeta = targetMeta[active.kind];
  const ActiveIcon = activeMeta.icon;
  const activePriority = priorityMeta[active.priority];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Keyboard size={16} strokeWidth={2.1} />}>NFR 접근성</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              자료 업로드, 후보 승인, 위젯 기본 조작처럼 중요한 흐름은 마우스 없이도 이동하고 실행할 수 있어야
              합니다. 디자인보드의 유리 톤은 유지하되 포커스가 흐려지지 않도록 별도 상태를 둡니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>우선 점검</span>
          <strong>{active.label}</strong>
          <StatusBadge tone={activePriority.tone}>{activePriority.label}</StatusBadge>
        </div>
      </header>

      <section className={styles.previewGrid} aria-label="키보드 흐름 미리보기">
        <article className={styles.flowPreview}>
          <div className={styles.browserBar}>
            <span />
            <b>회원 웹 앱 / 데스크탑 앱</b>
          </div>
          <div className={styles.focusRail}>
            <span>Tab</span>
            <span>Enter</span>
            <span>Esc</span>
          </div>
          <div className={styles.focusCard}>
            <span className={styles.focusIcon}>
              <ActiveIcon size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{active.label}</strong>
              <p>{active.description}</p>
            </div>
            <StatusBadge tone={activeMeta.tone}>{active.keyFlow}</StatusBadge>
          </div>
          <div className={styles.focusSteps}>
            <button type="button">검색 입력</button>
            <button className={styles.isFocused} type="button">
              후보 승인
            </button>
            <button type="button">버블 닫기</button>
          </div>
        </article>

        <aside className={styles.targetList} aria-label="접근성 점검 대상">
          {targets.map((target) => {
            const meta = targetMeta[target.kind];
            const Icon = meta.icon;
            const priority = priorityMeta[target.priority];
            const selected = target.kind === active.kind;

            return (
              <button
                aria-pressed={selected}
                className={cn(styles.targetCard, selected && styles.selected)}
                key={target.kind}
                type="button"
              >
                <span className={styles.targetIcon}>
                  <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.targetCopy}>
                  <b>{target.label}</b>
                  <span>{target.keyFlow}</span>
                </span>
                <StatusBadge tone={priority.tone}>{priority.label}</StatusBadge>
              </button>
            );
          })}
        </aside>
      </section>

      <section className={styles.ruleGrid} aria-label="키보드 접근성 규칙">
        {rules.map((rule) => {
          const meta = ruleMeta[rule.state];

          return (
            <article className={styles.ruleCard} key={rule.label}>
              <div className={styles.ruleTop}>
                <Eye size={16} strokeWidth={2.1} aria-hidden="true" />
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.boundaryCard} aria-label="프론트 구현 기준">
        <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
        <div>
          <strong>구현 기준</strong>
          <p>
            접근성 상태는 UI의 기본 품질 기준입니다. API 명세와 별개로 컴포넌트 단계에서 `focus-visible`, 닫기
            동작, 버튼 역할, 입력 보호 문구를 먼저 맞춥니다.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <Button icon={<Keyboard size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          Tab 순서 확인
        </Button>
        <Button icon={<PanelTopClose size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          닫기 동작 확인
        </Button>
      </footer>
    </GlassPanel>
  );
}
