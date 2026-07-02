"use client";

import { Bell, CheckCircle2, Clock3, LayoutGrid, MessageCircle, Pin, ShieldCheck, Sparkles, ToggleRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type BubbleSetting = {
  id: string;
  name: MessageKey;
  source: MessageKey;
  state: "enabled" | "pinned" | "hidden";
  detail: MessageKey;
};

const bubbleSettings: BubbleSetting[] = [
  {
    id: "todo",
    detail: "widget.settings.todo.detail",
    name: "widget.bubble.todo",
    source: "widget.settings.todo.source",
    state: "enabled",
  },
  {
    id: "agent",
    detail: "widget.settings.agent.detail",
    name: "widget.bubble.agent",
    source: "widget.settings.agent.source",
    state: "pinned",
  },
  {
    id: "chat",
    detail: "widget.settings.chat.detail",
    name: "widget.bubble.chat",
    source: "widget.settings.chat.source",
    state: "enabled",
  },
  {
    id: "timer",
    detail: "widget.settings.timer.detail",
    name: "widget.bubble.timer",
    source: "widget.settings.timer.source",
    state: "hidden",
  },
];

const stateMeta: Record<BubbleSetting["state"], { label: MessageKey; tone: "success" | "pending" | "personal" }> = {
  enabled: { label: "widget.settings.state.enabled", tone: "success" },
  hidden: { label: "widget.settings.state.hidden", tone: "personal" },
  pinned: { label: "widget.settings.state.pinned", tone: "pending" },
};

function BubbleSettingRow({ bubble }: { bubble: BubbleSetting }) {
  const { t } = useI18n();
  const state = stateMeta[bubble.state];

  return (
    <article className="widget-settings-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        {bubble.state === "pinned" ? <Pin size={16} strokeWidth={2.1} /> : <LayoutGrid size={16} strokeWidth={2.1} />}
      </span>
      <div>
        <div className="widget-settings-row__meta">
          <StatusBadge tone={state.tone}>{t(state.label)}</StatusBadge>
          <span>{t(bubble.source)}</span>
        </div>
        <h3>{t(bubble.name)}</h3>
        <p>{t(bubble.detail)}</p>
      </div>
      <Button icon={<ToggleRight size={15} />} size="sm" variant={bubble.state === "hidden" ? "quiet" : "primary"}>
        {t("widget.settings.settingButton")}
      </Button>
    </article>
  );
}

export function WidgetSettingsPanel() {
  const { t } = useI18n();
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
          <StatusBadge tone="success">{t("widget.settings.synced")}</StatusBadge>
          <strong>{t("widget.dock.badgeCount", { count: 6 })}</strong>
          <span>{t("widget.settings.activeBubbles")}</span>
          <ProgressBar label={t("widget.settings.saveState")} value={86} />
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
            {bubbleSettings.map((bubble) => (
              <BubbleSettingRow bubble={bubble} key={bubble.id} />
            ))}
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
