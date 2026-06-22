import { Eye, EyeOff, Monitor, ShieldCheck, Type, ZoomIn } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-background-readability-panel.module.css";

type BackgroundTone = "bright" | "dark" | "busy";
type ReadabilityResult = "pass" | "watch" | "fail";
type TextMode = "light" | "dark" | "auto";

type BackgroundScenario = {
  background: BackgroundTone;
  caption: string;
  fontScale: 90 | 100 | 115 | 130;
  ghostMode: boolean;
  result: ReadabilityResult;
  textMode: TextMode;
  title: string;
};

export type WidgetBackgroundReadabilityPanelProps = HTMLAttributes<HTMLElement> & {
  scenarios: BackgroundScenario[];
  title?: string;
};

const backgroundMeta: Record<BackgroundTone, { label: string; tone: StatusTone }> = {
  bright: { label: "밝은 배경", tone: "personal" },
  busy: { label: "복잡한 배경", tone: "warning" },
  dark: { label: "어두운 배경", tone: "room" },
};

const resultMeta: Record<ReadabilityResult, { label: string; tone: StatusTone }> = {
  fail: { label: "조정 필요", tone: "warning" },
  pass: { label: "읽힘", tone: "success" },
  watch: { label: "주의", tone: "pending" },
};

const textModeMeta: Record<TextMode, { label: string; tone: StatusTone }> = {
  auto: { label: "배경 기준", tone: "pending" },
  dark: { label: "어두운 글자", tone: "neutral" },
  light: { label: "밝은 글자", tone: "room" },
};

export const defaultReadabilityScenarios: BackgroundScenario[] = [
  {
    background: "bright",
    caption: "일반 작업 화면 위에 TODO 버블이 떠 있는 상태",
    fontScale: 100,
    ghostMode: false,
    result: "pass",
    textMode: "dark",
    title: "밝은 문서 배경",
  },
  {
    background: "dark",
    caption: "어두운 편집 화면 위에서 고스트 모드를 켠 상태",
    fontScale: 115,
    ghostMode: true,
    result: "pass",
    textMode: "light",
    title: "어두운 작업 배경",
  },
  {
    background: "busy",
    caption: "여러 창이 겹친 배경에서 글자 굵기와 크기를 올린 상태",
    fontScale: 130,
    ghostMode: true,
    result: "watch",
    textMode: "auto",
    title: "복잡한 화면 배경",
  },
];

export function WidgetBackgroundReadabilityPanel({
  className,
  scenarios,
  title = "데스크탑 배경 가독성",
  ...props
}: WidgetBackgroundReadabilityPanelProps) {
  const passingCount = scenarios.filter((scenario) => scenario.result === "pass").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Monitor size={16} strokeWidth={2.1} />}>Tauri 위젯 검수</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              위젯은 데스크탑 위에 남는 개인 영역이므로 배경이 바뀌어도 업무 내용이 먼저 읽혀야 합니다. 고스트
              모드에서는 최소 글자 크기와 굵기를 올려 표시합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>통과 시나리오</span>
          <strong>
            {passingCount}/{scenarios.length}
          </strong>
          <StatusBadge tone={passingCount === scenarios.length ? "success" : "pending"}>가독성 점검</StatusBadge>
        </div>
      </header>

      <section className={styles.scenarioGrid} aria-label="배경별 위젯 가독성">
        {scenarios.map((scenario) => {
          const background = backgroundMeta[scenario.background];
          const result = resultMeta[scenario.result];
          const textMode = textModeMeta[scenario.textMode];

          return (
            <article className={cn(styles.scenarioCard, styles[scenario.background])} key={scenario.title}>
              <div className={styles.desktopScene}>
                <div className={styles.windowHint}>
                  <span />
                  <b>{background.label}</b>
                </div>
                <div className={cn(styles.widgetPreview, scenario.ghostMode && styles.ghost)}>
                  <div className={styles.widgetHeader}>
                    <strong>TODO 버블</strong>
                    {scenario.ghostMode ? (
                      <EyeOff size={14} strokeWidth={2.1} aria-label="고스트 모드" />
                    ) : (
                      <Eye size={14} strokeWidth={2.1} aria-label="일반 표시" />
                    )}
                  </div>
                  <p>계약서 수정 조항 회신</p>
                  <b>오늘 18:00</b>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.caption}</p>
                </div>
                <div className={styles.badgeRow}>
                  <StatusBadge tone={background.tone}>{background.label}</StatusBadge>
                  <StatusBadge tone={textMode.tone}>{textMode.label}</StatusBadge>
                  <StatusBadge tone={result.tone}>{result.label}</StatusBadge>
                </div>
                <dl className={styles.metricGrid}>
                  <div>
                    <dt>글자 크기</dt>
                    <dd>{scenario.fontScale}%</dd>
                  </div>
                  <div>
                    <dt>고스트</dt>
                    <dd>{scenario.ghostMode ? "켜짐" : "꺼짐"}</dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="가독성 기준">
        <article>
          <Type size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>작은 창 최소 기준</strong>
            <p>작은 버블의 주요 글자는 13px 아래로 내리지 않고, 고스트 모드에서는 한 단계 굵게 표시합니다.</p>
          </div>
        </article>
        <article>
          <ZoomIn size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>글자 크기 단계</strong>
            <p>90, 100, 115, 130 단계로 미리 보고, 위젯과 대시보드가 같은 사용자 표시 설정을 따릅니다.</p>
          </div>
        </article>
        <article>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>작업 방해 줄이기</strong>
            <p>고스트 모드는 입력 통과를 돕지만, 핵심 업무 문구가 배경에 묻히면 표시 옵션을 다시 고릅니다.</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<EyeOff size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          고스트 미리보기
        </Button>
        <Button icon={<Type size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          글자 크기 조정
        </Button>
      </footer>
    </GlassPanel>
  );
}
