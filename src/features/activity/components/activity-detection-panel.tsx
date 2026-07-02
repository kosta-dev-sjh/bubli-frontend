"use client";

import { Activity, AppWindow, Clock3, Database, EyeOff, ListChecks, ShieldCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ActivitySource = {
  appName: string;
  windowTitle: string;
  duration: string;
  projectHint: string;
  status: "tracking" | "suggested" | "local";
};

function buildActivitySources(t: TranslateFn): ActivitySource[] {
  return [
    {
      appName: "Visual Studio Code",
      duration: t("activity.detection.sample.vscode.duration"),
      projectHint: t("activity.detection.sample.vscode.hint"),
      status: "tracking",
      windowTitle: "activity-detection-panel.tsx",
    },
    {
      appName: "Chrome",
      duration: t("activity.detection.sample.chrome.duration"),
      projectHint: t("activity.detection.sample.chrome.hint"),
      status: "suggested",
      windowTitle: "LiveKit docs",
    },
    {
      appName: "Notion",
      duration: t("activity.detection.sample.notion.duration"),
      projectHint: t("activity.detection.sample.notion.hint"),
      status: "local",
      windowTitle: t("activity.detection.sample.notion.window"),
    },
  ];
}

const statusCopy: Record<ActivitySource["status"], { labelKey: MessageKey; tone: "timer" | "pending" | "personal" }> = {
  local: { labelKey: "activity.detection.status.local", tone: "personal" },
  suggested: { labelKey: "activity.detection.status.suggested", tone: "pending" },
  tracking: { labelKey: "activity.detection.status.tracking", tone: "timer" },
};

function ActivitySourceRow({ source }: { source: ActivitySource }) {
  const { t } = useI18n();
  const status = statusCopy[source.status];

  return (
    <article className="activity-source-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <AppWindow size={17} strokeWidth={2.1} />
      </span>
      <div>
        <div className="activity-source-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{source.duration}</span>
        </div>
        <h3>{source.appName}</h3>
        <p>{source.windowTitle}</p>
        <Chip icon={<ListChecks size={14} />}>{source.projectHint}</Chip>
      </div>
    </article>
  );
}

export function ActivityDetectionPanel() {
  const { t } = useI18n();
  const activitySources = buildActivitySources(t);

  return (
    <section className="activity-detection" aria-label={t("activity.detection.sectionAria")}>
      <GlassPanel className="activity-detection__hero">
        <div className="activity-detection__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Activity size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("activity.detection.chip")}</Chip>
            <h2>{t("activity.detection.heroTitle")}</h2>
            <p>{t("activity.detection.heroDesc")}</p>
          </div>
        </div>
        <div className="activity-detection__consent">
          <StatusBadge tone="approved">{t("activity.detection.consented")}</StatusBadge>
          <strong>{t("activity.detection.appCount", { count: 3 })}</strong>
          <span>{t("activity.detection.todayTarget")}</span>
          <ProgressBar label={t("activity.detection.todayRate")} value={74} />
        </div>
      </GlassPanel>

      <div className="activity-detection__grid">
        <GlassPanel className="activity-detection__panel">
          <div className="activity-detection__panel-header">
            <div>
              <h3>{t("activity.detection.recent")}</h3>
              <p>{t("activity.detection.recentDesc")}</p>
            </div>
            <Chip icon={<Clock3 size={14} />}>{t("activity.detection.recent3h")}</Chip>
          </div>

          <div className="activity-detection__list">
            {activitySources.map((source) => (
              <ActivitySourceRow key={`${source.appName}-${source.windowTitle}`} source={source} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="activity-detection__policy">
          <h3>{t("activity.detection.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("activity.detection.policyConsent")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>{t("activity.detection.policyLocal")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <EyeOff size={16} strokeWidth={2.1} />
            </span>
            <p>{t("activity.detection.policyExcluded")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
