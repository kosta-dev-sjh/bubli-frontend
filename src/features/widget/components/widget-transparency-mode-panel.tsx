import { Eye, EyeOff, Layers3, MousePointer2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-transparency-mode-panel.module.css";

type TransparencyMode = "normal" | "translucent" | "ghost";
type BackgroundCheck = "bright" | "dark" | "busy";

type TransparencyOption = {
  description: string;
  ghostMode: boolean;
  label: string;
  mode: TransparencyMode;
  opacity: number;
  pointerPolicy: string;
};

type BackgroundReadabilityCheck = {
  background: BackgroundCheck;
  label: string;
  result: "pass" | "watch";
};

export type WidgetTransparencyModePanelProps = HTMLAttributes<HTMLElement> & {
  activeMode: TransparencyMode;
  backgroundChecks: BackgroundReadabilityCheck[];
  options: TransparencyOption[];
  title?: string;
};

const modeMeta: Record<TransparencyMode, { icon: typeof Eye; tone: StatusTone }> = {
  ghost: { icon: EyeOff, tone: "pending" },
  normal: { icon: Eye, tone: "personal" },
  translucent: { icon: Layers3, tone: "todo" },
};

const backgroundMeta: Record<BackgroundCheck, { className: string; tone: StatusTone }> = {
  bright: { className: styles.bright, tone: "personal" },
  busy: { className: styles.busy, tone: "warning" },
  dark: { className: styles.dark, tone: "room" },
};

const resultTone: Record<BackgroundReadabilityCheck["result"], StatusTone> = {
  pass: "success",
  watch: "pending",
};

export const defaultTransparencyOptions: TransparencyOption[] = [
  {
    description: "유리 버블 표면을 유지해서 버튼과 항목을 모두 바로 조작할 수 있는 기본 단계입니다.",
    ghostMode: false,
    label: "기본",
    mode: "normal",
    opacity: 92,
    pointerPolicy: "입력 가능",
  },
  {
    description: "배경을 더 비치게 하되 주요 버튼과 항목 조작은 그대로 유지하는 중간 단계입니다.",
    ghostMode: false,
    label: "반투명",
    mode: "translucent",
    opacity: 58,
    pointerPolicy: "입력 가능",
  },
  {
    description: "배경과 테두리를 거의 지우고 글자만 남겨 기존 작업 화면을 덜 가립니다.",
    ghostMode: true,
    label: "고스트",
    mode: "ghost",
    opacity: 18,
    pointerPolicy: "입력 통과",
  },
];

export const defaultBackgroundChecks: BackgroundReadabilityCheck[] = [
  { background: "bright", label: "밝은 문서 배경", result: "pass" },
  { background: "dark", label: "어두운 편집 화면", result: "pass" },
  { background: "busy", label: "창이 겹친 화면", result: "watch" },
];

export function WidgetTransparencyModePanel({
  activeMode,
  backgroundChecks,
  className,
  options,
  title = "위젯 투명도 단계",
  ...props
}: WidgetTransparencyModePanelProps) {
  const activeOption = options.find((option) => option.mode === activeMode) ?? options[0];
  const activeMeta = modeMeta[activeOption.mode];
  const ActiveIcon = activeMeta.icon;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<SlidersHorizontal size={16} strokeWidth={2.1} />}>버블 표시 옵션</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              투명도와 고스트 모드는 버블별 `widget_preferences.opacity`와 `ghost_mode`에 저장합니다. 위젯은 개인
              영역이므로 사용자의 작업 화면을 덜 가리되, TODO와 타이머처럼 다시 보여야 하는 데이터는 서버 원본을
              기준으로 표시합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>현재 단계</span>
          <strong>{activeOption.label}</strong>
          <StatusBadge tone={activeMeta.tone}>{activeOption.opacity}%</StatusBadge>
        </div>
      </header>

      <section className={styles.optionGrid} aria-label="투명도 단계 선택">
        {options.map((option) => {
          const meta = modeMeta[option.mode];
          const Icon = meta.icon;
          const selected = option.mode === activeMode;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.optionCard, selected && styles.selected)}
              key={option.mode}
              type="button"
            >
              <span className={styles.optionIcon}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className={styles.optionTitle}>{option.label}</span>
              <span className={styles.optionDescription}>{option.description}</span>
              <span className={styles.optionFooter}>
                <StatusBadge tone={meta.tone}>{option.pointerPolicy}</StatusBadge>
                <b>{option.opacity}%</b>
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.previewArea} aria-label="위젯 투명도 미리보기">
        <article className={styles.desktopScene}>
          <div className={styles.desktopWindow}>
            <span />
            <b>작업 화면</b>
          </div>
          <div className={cn(styles.widgetPreview, styles[activeOption.mode])}>
            <div className={styles.widgetHeader}>
              <strong>TODO 버블</strong>
              <ActiveIcon size={15} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <p>토모에 1차 검수</p>
            <b>42:18</b>
            <span>{activeOption.pointerPolicy}</span>
          </div>
        </article>

        <aside className={styles.policyStack} aria-label="저장과 접근 기준">
          <article>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>설정 저장</strong>
              <p>투명도, 고스트 모드, 선택 프로젝트룸은 버블별 옵션으로 저장합니다.</p>
            </div>
          </article>
          <article>
            <MousePointer2 size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>입력 통과</strong>
              <p>고스트 단계에서는 기존 작업 화면을 누를 수 있게 조작 요소를 숨깁니다.</p>
            </div>
          </article>
          <article>
            <Layers3 size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>상태 분리</strong>
              <p>보이는 방식만 바꾸고 TODO, 일정, 알림 원본은 복사하지 않습니다.</p>
            </div>
          </article>
        </aside>
      </section>

      <section className={styles.checkGrid} aria-label="배경별 가독성 확인">
        {backgroundChecks.map((check) => {
          const meta = backgroundMeta[check.background];

          return (
            <article className={cn(styles.checkCard, meta.className)} key={check.background}>
              <span>{check.label}</span>
              <StatusBadge tone={resultTone[check.result]}>{check.result === "pass" ? "읽힘" : "주의"}</StatusBadge>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <Button icon={<EyeOff size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          단계 미리보기
        </Button>
        <Button icon={<SlidersHorizontal size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          버블 옵션 저장
        </Button>
      </footer>
    </GlassPanel>
  );
}
