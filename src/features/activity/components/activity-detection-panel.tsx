"use client";

import { Activity, AppWindow, Clock3, Database, EyeOff, ListChecks, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDeoverlappedActivityDurationSeconds } from "@/lib/activity/activity-duration";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { ActivityAutoCaptureStatus } from "@/lib/local/activity-auto-capture";
import type { ActivityLogResponse } from "@/types/api/activity";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ActivitySource = {
  id: string;
  appName: string;
  fullWindowTitle: string;
  windowTitle: string;
  duration: string;
  projectHint: string;
  status: "tracking" | "suggested" | "local";
};

type ActivitySourceGroup = {
  appName: string;
  durationSeconds: number;
  id: string;
  latestCreatedAt: number;
  logs: ActivityLogResponse[];
  roomId?: string | null;
  startedAt?: string | null;
  windowTitle?: string | null;
};

type ActivityProjectRoom = {
  id: string;
  name?: string | null;
};

type ActivityDetectionPanelProps = {
  activityLogs?: ActivityLogResponse[] | null;
  autoCaptureStatus?: ActivityAutoCaptureStatus;
  consentGranted?: boolean;
  deletingActivityId?: string | null;
  desktopRuntime?: boolean;
  loading?: "record" | "refresh" | null;
  onDeleteActivity?: (activityLogId: string) => void;
  onRecordActivity?: () => void;
  onRefreshActivity?: () => void;
  projectRooms?: ActivityProjectRoom[];
};

const WINDOW_TITLE_DISPLAY_MAX_LENGTH = 56;

function formatActivityDuration(t: TranslateFn, seconds?: number | null) {
  if (!seconds || seconds <= 0) return t("activity.detection.durationUnknown");

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return t("activity.detection.durationHoursMinutes", { hours, minutes });
  if (hours > 0) return t("activity.detection.durationHours", { hours });
  return t("activity.detection.durationMinutes", { minutes });
}

function formatActivityStartedAt(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timestampOf(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function groupActivityLogs(activityLogs: ActivityLogResponse[]) {
  const groups = new Map<string, ActivitySourceGroup>();

  for (const activity of activityLogs) {
    const appName = activity.appName?.trim() || "";
    const windowTitle = activity.windowTitle?.trim() || "";
    const roomId = activity.roomId ?? null;
    const key = `${appName}\u0000${windowTitle}\u0000${roomId ?? ""}`;
    const createdAt = timestampOf(activity.createdAt);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        appName,
        durationSeconds: 0,
        id: activity.id,
        latestCreatedAt: createdAt,
        logs: [activity],
        roomId,
        startedAt: activity.startedAt,
        windowTitle,
      });
      continue;
    }

    existing.logs.push(activity);
    if (timestampOf(activity.startedAt) < timestampOf(existing.startedAt)) {
      existing.startedAt = activity.startedAt;
    }
    if (createdAt > existing.latestCreatedAt) {
      existing.id = activity.id;
      existing.latestCreatedAt = createdAt;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      durationSeconds: getDeoverlappedActivityDurationSeconds(group.logs),
    }))
    .sort((left, right) => right.latestCreatedAt - left.latestCreatedAt);
}

function shortRoomId(roomId: string) {
  return roomId.split("-")[0] || roomId.slice(0, 8);
}

function formatProjectHint(t: TranslateFn, roomId: string | null | undefined, projectRoomsById: Map<string, string>) {
  if (!roomId) return t("activity.detection.personalScope");

  const roomName = projectRoomsById.get(roomId) ?? shortRoomId(roomId);
  return t("activity.detection.roomScope", { room: roomName });
}

function formatWindowTitleForDisplay(windowTitle: string) {
  if (windowTitle.length <= WINDOW_TITLE_DISPLAY_MAX_LENGTH) return windowTitle;
  return `${windowTitle.slice(0, WINDOW_TITLE_DISPLAY_MAX_LENGTH).trimEnd()}...`;
}

function buildActivitySources(
  t: TranslateFn,
  activityLogs: ActivityLogResponse[],
  projectRoomsById: Map<string, string>,
): ActivitySource[] {
  return groupActivityLogs(activityLogs).map((activity, index) => {
    const startedAt = formatActivityStartedAt(activity.startedAt);
    const duration = formatActivityDuration(t, activity.durationSeconds);
    const windowTitle = activity.windowTitle || t("activity.detection.windowUnknown");

    return {
      appName: activity.appName || t("settings.privacy.noAppName"),
      duration: startedAt ? `${startedAt} - ${duration}` : duration,
      fullWindowTitle: windowTitle,
      id: activity.id,
      projectHint: formatProjectHint(t, activity.roomId, projectRoomsById),
      status: index === 0 ? "tracking" : activity.roomId ? "suggested" : "local",
      windowTitle: formatWindowTitleForDisplay(windowTitle),
    };
  });
}

const statusCopy: Record<ActivitySource["status"], { labelKey: MessageKey; tone: "timer" | "pending" | "personal" }> = {
  local: { labelKey: "activity.detection.status.local", tone: "personal" },
  suggested: { labelKey: "activity.detection.status.suggested", tone: "pending" },
  tracking: { labelKey: "activity.detection.status.tracking", tone: "timer" },
};

function autoCaptureTone(status?: ActivityAutoCaptureStatus): "approved" | "warning" | "pending" {
  if (!status?.running || status.lastStatus === "stopped") return "warning";
  if (status.lastStatus === "failed" || status.lastStatus === "blocked") return "warning";
  if (status.lastStatus === "capturing" || status.lastStatus === "waiting") return "pending";
  return "approved";
}

function autoCaptureLabelKey(status?: ActivityAutoCaptureStatus): MessageKey {
  if (!status?.running || status.lastStatus === "stopped") return "activity.detection.autoCapture.stopped";
  if (status.lastStatus === "capturing") return "activity.detection.autoCapture.capturing";
  if (status.lastStatus === "recorded") return "activity.detection.autoCapture.recorded";
  if (status.lastStatus === "waiting") return "activity.detection.autoCapture.waiting";
  if (status.lastStatus === "blocked") return "activity.detection.autoCapture.blocked";
  if (status.lastStatus === "failed") return "activity.detection.autoCapture.failed";
  return "activity.detection.autoCapture.idle";
}

function autoCaptureDetail(t: TranslateFn, status?: ActivityAutoCaptureStatus) {
  if (!status) return t("activity.detection.autoCapture.noStatus");
  if (status.lastErrorMessage) return status.lastErrorMessage;
  if (status.lastAppName) {
    return status.lastWindowTitle
      ? t("activity.detection.autoCapture.lastWindow", { app: status.lastAppName, window: status.lastWindowTitle })
      : t("activity.detection.autoCapture.lastApp", { app: status.lastAppName });
  }
  if (status.lastMessage) return status.lastMessage;
  if (status.lastAttemptAt) return t("activity.detection.autoCapture.lastAttempt");
  return t("activity.detection.autoCapture.noStatus");
}

function ActivitySourceRow({
  deletingActivityId,
  onDeleteActivity,
  source,
}: {
  deletingActivityId?: string | null;
  onDeleteActivity?: (activityLogId: string) => void;
  source: ActivitySource;
}) {
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
        <p title={source.fullWindowTitle}>{source.windowTitle}</p>
        <div className="activity-source-row__footer">
          <Chip icon={<ListChecks size={14} />}>{source.projectHint}</Chip>
          {onDeleteActivity ? (
            <Button
              disabled={deletingActivityId === source.id}
              loading={deletingActivityId === source.id}
              onClick={() => onDeleteActivity(source.id)}
              size="sm"
              type="button"
              variant="quiet"
            >
              {t("common.delete")}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ActivityDetectionPanel({
  activityLogs = [],
  autoCaptureStatus,
  consentGranted = false,
  deletingActivityId = null,
  desktopRuntime = false,
  loading = null,
  onDeleteActivity,
  onRecordActivity,
  onRefreshActivity,
  projectRooms = [],
}: ActivityDetectionPanelProps) {
  const { t } = useI18n();
  const safeActivityLogs = activityLogs ?? [];
  const projectRoomsById = new Map(
    projectRooms
      .map((room) => [room.id, room.name?.trim() || room.id] as const)
      .filter(([roomId]) => roomId.trim().length > 0),
  );
  const activitySources = buildActivitySources(t, safeActivityLogs, projectRoomsById);
  const appCount = new Set(safeActivityLogs.map((activity) => activity.appName).filter(Boolean)).size;
  const progressValue = safeActivityLogs.length > 0 ? Math.min(100, Math.round((safeActivityLogs.length / 8) * 100)) : 0;
  const recordDisabled = !desktopRuntime || !onRecordActivity;
  const refreshDisabled = !consentGranted || !onRefreshActivity;

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
          <StatusBadge tone={consentGranted ? "approved" : "warning"}>
            {consentGranted ? t("activity.detection.consented") : t("activity.detection.notConsented")}
          </StatusBadge>
          <div className="activity-detection__auto-capture">
            <StatusBadge tone={autoCaptureTone(autoCaptureStatus)}>{t(autoCaptureLabelKey(autoCaptureStatus))}</StatusBadge>
            <span>{autoCaptureDetail(t, autoCaptureStatus)}</span>
          </div>
          <strong>{t("activity.detection.appCount", { count: appCount })}</strong>
          <span>{desktopRuntime ? t("activity.detection.todayTarget") : t("activity.detection.desktopRequired")}</span>
          <ProgressBar label={t("activity.detection.todayRate")} value={progressValue} />
        </div>
      </GlassPanel>

      <div className="activity-detection__grid">
        <GlassPanel className="activity-detection__panel">
          <div className="activity-detection__panel-header">
            <div>
              <h3>{t("activity.detection.recent")}</h3>
              <p>{t("activity.detection.recentDesc")}</p>
            </div>
            <div className="activity-detection__actions">
              <Chip icon={<Clock3 size={14} />}>{t("activity.detection.recent3h")}</Chip>
              <Button
                disabled={recordDisabled}
                loading={loading === "record"}
                onClick={onRecordActivity}
                size="sm"
                type="button"
                variant="quiet"
              >
                {t("activity.detection.record")}
              </Button>
              <Button
                disabled={refreshDisabled}
                icon={<RefreshCw size={14} />}
                loading={loading === "refresh"}
                onClick={onRefreshActivity}
                size="sm"
                type="button"
                variant="secondary"
              >
                {t("activity.detection.refresh")}
              </Button>
            </div>
          </div>

          <div className="activity-detection__list">
            {activitySources.length > 0 ? (
              activitySources.map((source) => (
                <ActivitySourceRow
                  deletingActivityId={deletingActivityId}
                  key={source.id}
                  onDeleteActivity={onDeleteActivity}
                  source={source}
                />
              ))
            ) : (
              <p className="activity-detection__empty">{t("activity.detection.empty")}</p>
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
