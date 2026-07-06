"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock3, LayoutGrid, MessageCircle, Pin, ShieldCheck, Sparkles, ToggleRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { widgetApi } from "../api/widgetApi";
import type { WidgetBubbleSettingResponse, WidgetBubbleType } from "@/types/api/widget";

type BubbleSettingView = WidgetBubbleSettingResponse & {
  detail: MessageKey;
  name: MessageKey;
  source: MessageKey;
  state: "enabled" | "minimized" | "hidden";
};

const bubbleMeta: Record<WidgetBubbleType, { detail: MessageKey; name: MessageKey; source: MessageKey }> = {
  AGENT: {
    detail: "widget.settings.agent.detail",
    name: "widget.bubble.agent",
    source: "widget.settings.agent.source",
  },
  ALERT: {
    detail: "widget.settings.configBody",
    name: "widget.bubble.notification",
    source: "widget.settings.policyAlert",
  },
  CHAT: {
    detail: "widget.settings.chat.detail",
    name: "widget.bubble.chat",
    source: "widget.settings.chat.source",
  },
  MEMO: {
    detail: "widget.settings.configBody",
    name: "widget.bubble.memo",
    source: "widget.settings.policyState",
  },
  RESOURCE: {
    detail: "widget.settings.configBody",
    name: "widget.bubble.resource",
    source: "widget.settings.policyPermission",
  },
  SCHEDULE: {
    detail: "widget.settings.configBody",
    name: "widget.bubble.schedule",
    source: "widget.settings.policyPermission",
  },
  TIMER: {
    detail: "widget.settings.timer.detail",
    name: "widget.bubble.timer",
    source: "widget.settings.timer.source",
  },
  TODO: {
    detail: "widget.settings.todo.detail",
    name: "widget.bubble.todo",
    source: "widget.settings.todo.source",
  },
};
const hiddenWidgetSettingBubbleTypes = new Set<WidgetBubbleType>(["RESOURCE"]);

const stateMeta: Record<BubbleSettingView["state"], { label: MessageKey; tone: "success" | "pending" | "personal" }> = {
  enabled: { label: "widget.settings.state.enabled", tone: "success" },
  hidden: { label: "widget.settings.state.hidden", tone: "personal" },
  minimized: { label: "widget.settings.state.minimized", tone: "pending" },
};

type WidgetSettingsPanelProps = {
  autoLoad?: boolean;
  initialBubbles?: WidgetBubbleSettingResponse[];
  onBubblesChange?: (bubbles: WidgetBubbleSettingResponse[]) => void;
};

function toBubbleView(bubble: WidgetBubbleSettingResponse): BubbleSettingView {
  const meta = bubbleMeta[bubble.bubbleType];
  return {
    ...bubble,
    ...meta,
    state: bubble.enabled ? (bubble.minimized ? "minimized" : "enabled") : "hidden",
  };
}

function BubbleSettingRow({
  bubble,
  isSaving,
  onToggle,
}: {
  bubble: BubbleSettingView;
  isSaving: boolean;
  onToggle: (bubble: BubbleSettingView) => void;
}) {
  const { t } = useI18n();
  const state = stateMeta[bubble.state];
  const actionLabel = bubble.enabled ? t("widget.settings.toggleOff") : t("widget.settings.toggleOn");

  return (
    <article className="widget-settings-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        {bubble.state === "minimized" ? <Pin size={16} strokeWidth={2.1} /> : <LayoutGrid size={16} strokeWidth={2.1} />}
      </span>
      <div>
        <div className="widget-settings-row__meta">
          <StatusBadge tone={state.tone}>{t(state.label)}</StatusBadge>
          <span>{t(bubble.source)}</span>
        </div>
        <h3>{t(bubble.name)}</h3>
        <p>{t(bubble.detail)}</p>
      </div>
      <Button
        aria-pressed={bubble.enabled}
        icon={<ToggleRight size={15} />}
        loading={isSaving}
        onClick={() => onToggle(bubble)}
        size="sm"
        variant={bubble.enabled ? "primary" : "quiet"}
      >
        {actionLabel}
      </Button>
    </article>
  );
}

export function WidgetSettingsPanel({ autoLoad = true, initialBubbles = [], onBubblesChange }: WidgetSettingsPanelProps = {}) {
  const { t } = useI18n();
  const [loadedBubbles, setLoadedBubbles] = useState<WidgetBubbleSettingResponse[]>(() => initialBubbles);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [savingBubbleId, setSavingBubbleId] = useState<string | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    if (!autoLoad) return;

    let active = true;

    widgetApi
      .getBubbles()
      .then((response) => {
        if (!active) return;
        setLoadedBubbles(response);
      })
      .catch(() => {
        if (!active) return;
        setHasLoadError(true);
        setLoadedBubbles([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [autoLoad]);

  const bubbleViews = useMemo(
    () => loadedBubbles.filter((bubble) => !hiddenWidgetSettingBubbleTypes.has(bubble.bubbleType)).map(toBubbleView),
    [loadedBubbles],
  );
  const activeBubbleCount = bubbleViews.filter((bubble) => bubble.enabled).length;
  const syncProgress = isLoading || savingBubbleId ? 100 : hasLoadError ? 0 : 100;

  const replaceBubbles = useCallback(
    (nextBubbles: WidgetBubbleSettingResponse[]) => {
      setLoadedBubbles(nextBubbles);
      onBubblesChange?.(nextBubbles);
    },
    [onBubblesChange],
  );

  const handleToggle = useCallback(
    async (bubble: BubbleSettingView) => {
      const nextEnabled = !bubble.enabled;
      const optimisticBubbles = loadedBubbles.map((item) => (item.id === bubble.id ? { ...item, enabled: nextEnabled } : item));
      replaceBubbles(optimisticBubbles);

      if (!autoLoad) return;

      setSavingBubbleId(bubble.id);
      try {
        const nextBubbles = await widgetApi.updateBubbles({
          bubbles: [{ bubbleType: bubble.bubbleType, enabled: nextEnabled, id: bubble.id }],
        });
        replaceBubbles(nextBubbles);
      } catch {
        replaceBubbles(loadedBubbles);
      } finally {
        setSavingBubbleId(null);
      }
    },
    [autoLoad, loadedBubbles, replaceBubbles],
  );

  return (
    <section className="widget-settings" aria-label={t("widget.settings.sectionAria")}>
      <GlassPanel className="widget-settings__hero">
        <div className="widget-settings__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <LayoutGrid size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("widget.settings.chip")}</Chip>
            <h2>{t("widget.settings.heroTitle")}</h2>
            <p>{t("widget.settings.heroBody")}</p>
          </div>
        </div>
        <div className="widget-settings__summary">
          <StatusBadge tone={hasLoadError ? "warning" : "success"}>
            {hasLoadError ? t("widget.settings.loadFailed") : t("widget.settings.synced")}
          </StatusBadge>
          <strong>{t("widget.dock.badgeCount", { count: activeBubbleCount })}</strong>
          <span>{t("widget.settings.activeBubbles")}</span>
          <ProgressBar indeterminate={isLoading || savingBubbleId !== null} label={t("widget.settings.saveState")} value={syncProgress} />
        </div>
      </GlassPanel>

      <div className="widget-settings__grid">
        <GlassPanel className="widget-settings__panel">
          <div className="widget-settings__panel-header">
            <div>
              <h3>{t("widget.settings.configTitle")}</h3>
              <p>{t("widget.settings.configBody")}</p>
            </div>
            <Chip icon={<Sparkles size={14} />}>{t("widget.settings.dashboardLink")}</Chip>
          </div>

          <div className="widget-settings__list">
            {bubbleViews.length > 0 ? (
              bubbleViews.map((bubble) => (
                <BubbleSettingRow bubble={bubble} isSaving={savingBubbleId === bubble.id} key={bubble.id} onToggle={handleToggle} />
              ))
            ) : (
              <p>{isLoading ? t("widget.settings.loading") : t("widget.settings.empty")}</p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="widget-settings__policy">
          <h3>{t("widget.settings.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("widget.settings.policyState")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Bell size={16} strokeWidth={2.1} />
            </span>
            <p>{t("widget.settings.policyAlert")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Clock3 size={16} strokeWidth={2.1} />
            </span>
            <p>{t("widget.settings.policyTimer")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <MessageCircle size={16} strokeWidth={2.1} />
            </span>
            <p>{t("widget.settings.policyEvent")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("widget.settings.policyPermission")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
