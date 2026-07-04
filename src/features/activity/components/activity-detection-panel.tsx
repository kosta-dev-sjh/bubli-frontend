"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AppWindow, Clock3, Database, EyeOff, ListChecks, ShieldCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { activityApi } from "../api/activityApi";
import type { ActivityLogResponse } from "@/types/api/activity";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ActivitySource = {
  appName: string;
  windowTitle: string;
  duration: string;
  projectHint: string;
  status: "tracking" | "suggested" | "synced";
};

const statusCopy: Record<ActivitySource["status"], { labelKey: MessageKey; tone: "timer" | "pending" | "approved" }> = {
  suggested: { labelKey: "activity.detection.status.suggested", tone: "pending" },
  synced: { labelKey: "activity.detection.status.synced", tone: "approved" },
  tracking: { labelKey: "activity.detection.status.tracking", tone: "timer" },
};

type ActivityDetectionPanelProps = {
  autoLoad?: boolean;
  initialActivities?: ActivityLogResponse[];
};

function getActivitySeconds(activity: ActivityLogResponse) {
  if (typeof activity.durationSeconds === "number" && activity.durationSeconds >= 0) {
    return activity.durationSeconds;
  }

  const started = new Date(activity.startedAt).getTime();
  const ended = activity.endedAt ? new Date(activity.endedAt).getTime() : NaN;
  if (Number.isNaN(started) || Number.isNaN(ended) || ended <= started) return 0;

  return Math.floor((ended - started) / 1000);
}

function formatDuration(t: TranslateFn, seconds: number) {
  if (seconds <= 0) return t("settings.activity.timeUnknown");

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return t("settings.activity.hourMinute", { hours, minutes });
  }

  return t("settings.activity.minute", { minutes: totalMinutes });
}

function toActivitySource(t: TranslateFn, activity: ActivityLogResponse): ActivitySource {
  const active = !activity.endedAt;
  const linkedToRoom = Boolean(activity.roomId);

  return {
    appName: activity.appName?.trim() || t("dashboard.activity.appFallback"),
    duration: formatDuration(t, getActivitySeconds(activity)),
    projectHint: linkedToRoom ? t("activity.detection.roomLinked") : t("activity.detection.noRoom"),
    status: active ? "tracking" : linkedToRoom ? "suggested" : "synced",
    windowTitle: activity.windowTitle?.trim() || t("activity.detection.windowFallback"),
  };
}

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

export function ActivityDetectionPanel({ autoLoad = true, initialActivities = [] }: ActivityDetectionPanelProps = {}) {
  const { t } = useI18n();
  const [activities, setActivities] = useState<ActivityLogResponse[]>(() => initialActivities);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    if (!autoLoad) return;

    let active = true;

    activityApi
      .getToday()
      .then((response) => {
        if (!active) return;
        setActivities(response);
      })
      .catch(() => {
        if (!active) return;
        setHasLoadError(true);
        setActivities([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [autoLoad]);

  const activitySources = useMemo(
    () =>
      [...activities]
        .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
        .slice(0, 5)
        .map((activity) => toActivitySource(t, activity)),
    [activities, t],
  );
  const appCount = useMemo(
    () => new Set(activities.map((activity) => activity.appName?.trim()).filter(Boolean)).size,
    [activities],
  );
  const measuredCount = activities.filter((activity) => getActivitySeconds(activity) > 0).length;
  const todayRate = activities.length > 0 ? Math.round((measuredCount / activities.length) * 100) : 0;

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
          <StatusBadge tone={hasLoadError ? "warning" : "approved"}>
            {hasLoadError ? t("activity.detection.loadFailed") : t("activity.detection.consented")}
          </StatusBadge>
          <strong>{t("activity.detection.appCount", { count: appCount })}</strong>
          <span>{t("activity.detection.todayTarget")}</span>
          <ProgressBar indeterminate={isLoading} label={t("activity.detection.todayRate")} value={todayRate} />
        </div>
      </GlassPanel>

      <div className="activity-detection__grid">
        <GlassPanel className="activity-detection__panel">
          <div className="activity-detection__panel-header">
            <div>
              <h3>{t("activity.detection.recent")}</h3>
              <p>{t("activity.detection.recentDesc")}</p>
            </div>
            <Chip icon={<Clock3 size={14} />}>{t("activity.detection.today")}</Chip>
          </div>

          <div className="activity-detection__list">
            {activitySources.length > 0 ? (
              activitySources.map((source) => (
                <ActivitySourceRow key={`${source.appName}-${source.windowTitle}-${source.duration}`} source={source} />
              ))
            ) : (
              <p>{isLoading ? t("activity.detection.loading") : t("activity.detection.empty")}</p>
            )}
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
