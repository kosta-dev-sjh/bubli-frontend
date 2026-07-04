"use client";

import { BarChart3, CheckCircle2, EyeOff, Layers3, MousePointerClick, Pin, RotateCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { widgetApi } from "@/features/widget/api/widgetApi";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import type { WidgetBubbleSettingResponse, WidgetBubbleType, WidgetTodayUsageSummaryResponse } from "@/types/api/widget";

type BubbleUsage = {
  bubbleLabel: string;
  id: string;
  interactionCount: number;
  openCount: number;
  sharePercent: number;
  status: "active" | "pinned" | "hidden";
  visibleMinutes: number;
};

const statusMeta: Record<BubbleUsage["status"], { label: MessageKey; tone: "success" | "memo" | "neutral" }> = {
  active: { label: "widget.rollup.status.active", tone: "success" },
  hidden: { label: "widget.rollup.status.hidden", tone: "neutral" },
  pinned: { label: "widget.rollup.status.pinned", tone: "memo" },
};

const bubbleLabelKeys: Record<WidgetBubbleType, MessageKey> = {
  AGENT: "widget.bubble.agent",
  ALERT: "widget.bubble.notification",
  CHAT: "widget.bubble.chat",
  MEMO: "widget.bubble.memo",
  RESOURCE: "widget.bubble.resource",
  SCHEDULE: "widget.bubble.schedule",
  TIMER: "widget.bubble.timer",
  TODO: "widget.bubble.todo",
};

type WidgetUsageRollupPanelProps = {
  autoLoad?: boolean;
  bubbleSettings?: WidgetBubbleSettingResponse[];
  usageSummary?: WidgetTodayUsageSummaryResponse | null;
};

function UsageRow({ item }: { item: BubbleUsage }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];

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
        <h3>{item.bubbleLabel}</h3>
        <p>{t("widget.storage.interactionCount", { count: item.interactionCount })}</p>
      </div>
      <ProgressBar label={t("widget.rollup.usageShare", { bubble: item.bubbleLabel })} value={item.sharePercent} />
    </article>
  );
}

export function WidgetUsageRollupPanel({ autoLoad = true, bubbleSettings, usageSummary: controlledUsageSummary }: WidgetUsageRollupPanelProps) {
  const { t } = useI18n();
  const [usageSummary, setUsageSummary] = useState<WidgetTodayUsageSummaryResponse | null>(null);
  const [settings, setSettings] = useState<WidgetBubbleSettingResponse[]>([]);

  const refreshUsage = useCallback(async () => {
    const [usageResult, settingsResult] = await Promise.allSettled([
      widgetApi.getTodayUsageRollups(),
      widgetApi.getBubbles(),
    ]);

    return {
      settings: settingsResult.status === "fulfilled" ? settingsResult.value : [],
      usageSummary: usageResult.status === "fulfilled" ? usageResult.value : null,
    };
  }, []);

  useEffect(() => {
    if (!autoLoad || controlledUsageSummary !== undefined || bubbleSettings !== undefined) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void refreshUsage().then((result) => {
        if (cancelled) return;
        setUsageSummary(result.usageSummary);
        setSettings(result.settings);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [autoLoad, bubbleSettings, controlledUsageSummary, refreshUsage]);

  const effectiveSettings = bubbleSettings ?? settings;
  const effectiveUsageSummary = controlledUsageSummary !== undefined ? controlledUsageSummary : usageSummary;
  const settingsById = useMemo(() => new Map(effectiveSettings.map((setting) => [setting.id, setting])), [effectiveSettings]);
  const usages = useMemo<BubbleUsage[]>(() => {
    const rows = effectiveUsageSummary?.byDevice ?? [];
    const totalEvents = (effectiveUsageSummary?.totalOpenCount ?? 0) + (effectiveUsageSummary?.totalInteractionCount ?? 0);
    const grouped = new Map<string, { interactionCount: number; openCount: number; visibleSeconds: number }>();

    for (const row of rows) {
      const current = grouped.get(row.bubbleSettingId) ?? { interactionCount: 0, openCount: 0, visibleSeconds: 0 };
      current.interactionCount += row.interactionCount;
      current.openCount += row.openCount;
      current.visibleSeconds += row.visibleSeconds;
      grouped.set(row.bubbleSettingId, current);
    }

    return [...grouped.entries()].map(([bubbleSettingId, row]) => {
      const setting = settingsById.get(bubbleSettingId);
      const bubbleLabel = setting
        ? t(bubbleLabelKeys[setting.bubbleType])
        : t("widget.bubble.suffix", { label: bubbleSettingId });
      const eventCount = row.openCount + row.interactionCount;

      return {
        bubbleLabel,
        id: bubbleSettingId,
        interactionCount: row.interactionCount,
        openCount: row.openCount,
        sharePercent: totalEvents > 0 ? Math.min(100, Math.round((eventCount / totalEvents) * 100)) : 0,
        status: setting?.enabled === false || setting?.minimized ? "hidden" : "active",
        visibleMinutes: Math.round(row.visibleSeconds / 60),
      };
    });
  }, [effectiveUsageSummary, settingsById, t]);
  const totalMinutes = Math.round((effectiveUsageSummary?.totalVisibleSeconds ?? 0) / 60);
  const totalEvents = (effectiveUsageSummary?.totalOpenCount ?? 0) + (effectiveUsageSummary?.totalInteractionCount ?? 0);
  const syncProgress = totalEvents > 0 ? 100 : 0;

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
          <strong>{t("widget.storage.totalMinutes", { count: totalMinutes })}</strong>
          <span>{t("widget.rollup.visibleTime")}</span>
          <ProgressBar label={t("widget.rollup.syncProgress")} value={syncProgress} />
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
            {usages.length > 0 ? usages.map((item) => <UsageRow item={item} key={item.id} />) : null}
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
