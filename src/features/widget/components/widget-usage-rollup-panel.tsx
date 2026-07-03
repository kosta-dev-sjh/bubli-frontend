"use client";

import { BarChart3, CheckCircle2, EyeOff, Layers3, MousePointerClick, Pin, RotateCw, Smartphone } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type BubbleUsage = {
  id: string;
  bubble: MessageKey;
  status: "active" | "pinned" | "hidden";
  openCount: number;
  visibleMinutes: number;
  confirmedCount: number;
};

const usages: BubbleUsage[] = [
  {
    id: "todo",
    bubble: "widget.bubble.todo",
    confirmedCount: 5,
    openCount: 18,
    status: "active",
    visibleMinutes: 42,
  },
  {
    id: "resource",
    bubble: "widget.bubble.resource",
    confirmedCount: 2,
    openCount: 9,
    status: "pinned",
    visibleMinutes: 16,
  },
  {
    id: "notification",
    bubble: "widget.bubble.notification",
    confirmedCount: 7,
    openCount: 12,
    status: "hidden",
    visibleMinutes: 8,
  },
];

const statusMeta: Record<BubbleUsage["status"], { label: MessageKey; tone: "success" | "memo" | "neutral" }> = {
  active: { label: "widget.rollup.status.active", tone: "success" },
  hidden: { label: "widget.rollup.status.hidden", tone: "neutral" },
  pinned: { label: "widget.rollup.status.pinned", tone: "memo" },
};

function UsageRow({ item }: { item: BubbleUsage }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];
  const bubble = t(item.bubble);

  return (
    <article className="widget-rollup-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Layers3 size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="widget-rollup-row__meta">
          <StatusBadge tone={status.tone}>{t(status.label)}</StatusBadge>
          <span>{t("widget.rollup.openCount", { count: item.openCount })}</span>
          <span>{t("widget.rollup.visibleMinutes", { count: item.visibleMinutes })}</span>
        </div>
        <h3>{bubble}</h3>
        <p>{t("widget.rollup.confirmedCount", { count: item.confirmedCount })}</p>
      </div>
      <ProgressBar label={t("widget.rollup.usageShare", { bubble })} value={Math.min(100, item.openCount * 4)} />
    </article>
  );
}

export function WidgetUsageRollupPanel() {
  const { t } = useI18n();
  return (
    <section className="widget-rollup" aria-label={t("widget.rollup.sectionAria")}>
      <GlassPanel className="widget-rollup__hero">
        <div>
          <Chip icon={<BarChart3 size={14} />} selected>
            {t("widget.rollup.chip")}
          </Chip>
          <h2>{t("widget.rollup.heroTitle")}</h2>
          <p>{t("widget.rollup.heroBody")}</p>
        </div>
        <div className="widget-rollup__summary">
          <StatusBadge tone="timer">{t("widget.rollup.todayBadge")}</StatusBadge>
          <strong>{t("widget.storage.totalMinutes", { count: 87 })}</strong>
          <span>{t("widget.rollup.visibleTime")}</span>
          <ProgressBar label={t("widget.rollup.syncProgress")} value={76} />
        </div>
      </GlassPanel>

      <div className="widget-rollup__grid">
        <GlassPanel className="widget-rollup__list">
          <div className="widget-rollup__list-top">
            <div>
              <h3>{t("widget.rollup.byBubbleTitle")}</h3>
              <p>{t("widget.rollup.byBubbleBody")}</p>
            </div>
            <Chip>{t("widget.rollup.byDevice")}</Chip>
          </div>
          <div className="widget-rollup__items">
            {usages.map((item) => (
              <UsageRow item={item} key={item.id} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="widget-rollup__state">
          <h3>{t("widget.rollup.stateTitle")}</h3>
          <div>
            <CheckCircle2 size={17} strokeWidth={2.1} />
            <p>{t("widget.rollup.stateConfirmed")}</p>
          </div>
          <div>
            <Pin size={17} strokeWidth={2.1} />
            <p>{t("widget.rollup.statePinned")}</p>
          </div>
          <div>
            <EyeOff size={17} strokeWidth={2.1} />
            <p>{t("widget.rollup.stateSame")}</p>
          </div>
          <div>
            <RotateCw size={17} strokeWidth={2.1} />
            <p>{t("widget.rollup.stateOffline")}</p>
          </div>
        </GlassPanel>
      </div>

      <div className="widget-rollup__policy">
        <GlassPanel>
          <MousePointerClick size={18} strokeWidth={2.1} />
          <h3>{t("widget.rollup.detailTitle")}</h3>
          <p>{t("widget.rollup.detailBody")}</p>
        </GlassPanel>
        <GlassPanel>
          <Smartphone size={18} strokeWidth={2.1} />
          <h3>{t("widget.rollup.deviceSumTitle")}</h3>
          <p>{t("widget.rollup.deviceSumBody")}</p>
        </GlassPanel>
        <GlassPanel>
          <BarChart3 size={18} strokeWidth={2.1} />
          <h3>{t("widget.rollup.dailyTitle")}</h3>
          <p>{t("widget.rollup.dailyBody")}</p>
        </GlassPanel>
      </div>
    </section>
  );
}
