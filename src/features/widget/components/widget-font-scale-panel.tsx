import { CheckCircle2, EyeOff, Monitor, PanelTop, Type, ZoomIn } from "lucide-react";
import type { CSSProperties, HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-font-scale-panel.module.css";

type FontScale = 90 | 100 | 115 | 130;
type SurfaceKind = "dashboard" | "widget" | "ghost" | "settings";

type FontScaleOption = {
  description: string;
  label: string;
  recommendedFor: string;
  sampleSizeLabel: string;
  value: FontScale;
};

type AffectedSurface = {
  description: string;
  kind: SurfaceKind;
  label: string;
  source: "user_preferences" | "widget_preferences";
};

export type WidgetFontScalePanelProps = HTMLAttributes<HTMLElement> & {
  activeScale: FontScale;
  affectedSurfaces: AffectedSurface[];
  ghostModeBoost?: boolean;
  scaleOptions: FontScaleOption[];
  title?: string;
};

const surfaceMeta: Record<SurfaceKind, { icon: typeof Monitor; tone: StatusTone }> = {
  dashboard: { icon: PanelTop, tone: "personal" },
  ghost: { icon: EyeOff, tone: "pending" },
  settings: { icon: Type, tone: "neutral" },
  widget: { icon: Monitor, tone: "todo" },
};

export const defaultFontScaleOptions: FontScaleOption[] = [
  {
    description: "정보를 넓게 보고 싶은 사용자를 위한 축소 단계입니다. 위젯 최소 본문 기준은 유지합니다.",
    label: "넓게 보기",
    recommendedFor: "작은 노트북, 많은 항목",
    sampleSizeLabel: "90%",
    value: 90,
  },
  {
    description: "Bubli 기본 글자 크기입니다. 대시보드와 버블 위젯이 같은 사용자 설정을 따릅니다.",
    label: "기본",
    recommendedFor: "일반 작업 화면",
    sampleSizeLabel: "100%",
    value: 100,
  },
  {
    description: "장시간 작업이나 발표 화면에서 업무 문구를 더 빨리 읽기 위한 확대 단계입니다.",
    label: "편하게 보기",
    recommendedFor: "발표, 장시간 작업",
    sampleSizeLabel: "115%",
    value: 115,
  },
  {
    description: "시력이 약한 사용자나 원거리 화면 확인을 위한 큰 글자 단계입니다.",
    label: "크게 보기",
    recommendedFor: "원거리, 접근성",
    sampleSizeLabel: "130%",
    value: 130,
  },
];

export const defaultFontScaleSurfaces: AffectedSurface[] = [
  {
    description: "사용자 기준 업무 현황의 글자 밀도를 조정합니다.",
    kind: "dashboard",
    label: "대시보드",
    source: "user_preferences",
  },
  {
    description: "TODO, 알림, 타이머 같은 버블의 주요 문구 크기를 맞춥니다.",
    kind: "widget",
    label: "버블 위젯",
    source: "user_preferences",
  },
  {
    description: "투명 위젯에서는 최소 글자 크기와 굵기를 한 단계 올립니다.",
    kind: "ghost",
    label: "고스트 모드",
    source: "widget_preferences",
  },
  {
    description: "표시 밀도와 기본 프로젝트룸은 별도 설정으로 분리합니다.",
    kind: "settings",
    label: "사용자 설정",
    source: "user_preferences",
  },
];

export function WidgetFontScalePanel({
  activeScale,
  affectedSurfaces,
  className,
  ghostModeBoost = true,
  scaleOptions,
  title = "글자 크기 설정",
  ...props
}: WidgetFontScalePanelProps) {
  const activeOption = scaleOptions.find((option) => option.value === activeScale) ?? scaleOptions[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Type size={16} strokeWidth={2.1} />}>사용자 표시 설정</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              글자 크기는 `user_preferences.font_scale`에 저장되는 개인 설정입니다. 같은 사용자의 대시보드와 버블
              위젯에 함께 적용하고, 고스트 모드는 위젯 표시 옵션으로 따로 보정합니다.
            </p>
          </div>
        </div>
        <div className={styles.activeCard}>
          <span>현재 단계</span>
          <strong>{activeOption.sampleSizeLabel}</strong>
          <StatusBadge tone="personal">{activeOption.label}</StatusBadge>
        </div>
      </header>

      <section className={styles.scaleGrid} aria-label="글자 크기 단계">
        {scaleOptions.map((option) => {
          const selected = option.value === activeScale;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.scaleCard, selected && styles.selected)}
              key={option.value}
              type="button"
            >
              <span className={styles.scaleValue}>{option.sampleSizeLabel}</span>
              <span className={styles.scaleName}>
                {selected ? <CheckCircle2 size={15} strokeWidth={2.1} aria-hidden="true" /> : null}
                {option.label}
              </span>
              <span className={styles.scaleDescription}>{option.description}</span>
              <span className={styles.recommended}>{option.recommendedFor}</span>
            </button>
          );
        })}
      </section>

      <section className={styles.previewWrap} aria-label="글자 크기 미리보기">
        <article className={styles.previewCard} style={{ "--font-scale": activeScale / 100 } as CSSProperties}>
          <div className={styles.previewHeader}>
            <span>TODO 버블</span>
            <StatusBadge tone="todo">미리보기</StatusBadge>
          </div>
          <div className={styles.previewTask}>
            <strong>회의록 확인 항목 3개 검토</strong>
            <span>오늘 18:00 · K-Stay 프로젝트룸</span>
          </div>
          <p>작은 창에서도 주요 업무 문구는 12.5px 아래로 내려가지 않게 표시합니다.</p>
        </article>

        <article className={cn(styles.previewCard, styles.ghostPreview)}>
          <div className={styles.previewHeader}>
            <span>고스트 모드</span>
            <StatusBadge tone={ghostModeBoost ? "success" : "warning"}>
              {ghostModeBoost ? "굵기 보정" : "보정 꺼짐"}
            </StatusBadge>
          </div>
          <div className={styles.previewTask}>
            <strong>타이머 42:18 진행 중</strong>
            <span>배경 위에서 글자 우선 표시</span>
          </div>
          <p>고스트 모드는 배경을 거의 지우므로 글자 굵기와 그림자를 함께 올려 가독성을 지킵니다.</p>
        </article>
      </section>

      <section className={styles.surfaceGrid} aria-label="적용 화면과 저장 기준">
        {affectedSurfaces.map((surface) => {
          const meta = surfaceMeta[surface.kind];
          const Icon = meta.icon;

          return (
            <article className={styles.surfaceCard} key={`${surface.kind}-${surface.label}`}>
              <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <div className={styles.surfaceTitle}>
                  <strong>{surface.label}</strong>
                  <StatusBadge tone={meta.tone}>{surface.source}</StatusBadge>
                </div>
                <p>{surface.description}</p>
              </div>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <Button icon={<ZoomIn size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          적용 미리보기
        </Button>
        <Button icon={<Type size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          설정 저장
        </Button>
      </footer>
    </GlassPanel>
  );
}
