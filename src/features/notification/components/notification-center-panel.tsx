"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellRing, CheckCircle2, EyeOff, FileText, MessageCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { notifyDataChanged, useDataRefresh } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { notificationApi } from "../api/notificationApi";
import { formatNotificationContent } from "../format-notification";
import type { NotificationResponse, NotificationStatus } from "@/types/api/notification";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type NotificationKind = "agent" | "communication" | "resource" | "system";
type NotificationState = "unread" | "read" | "dismissed";

type NotificationItem = {
  description: string;
  id: string;
  kind: NotificationKind;
  originLabel: string;
  projectRoom: string;
  state: NotificationState;
  title: string;
  time: string;
};

const kindMeta: Record<NotificationKind, { icon: typeof Bell; labelKey: MessageKey; tone: "agent" | "communication" | "memo" | "warning" }> = {
  agent: { icon: Sparkles, labelKey: "notification.kind.agent", tone: "agent" },
  communication: { icon: MessageCircle, labelKey: "notification.kind.communication", tone: "communication" },
  resource: { icon: FileText, labelKey: "notification.kind.resource", tone: "memo" },
  system: { icon: Bell, labelKey: "notification.kind.system", tone: "warning" },
};

const stateCopy: Record<NotificationState, { labelKey: MessageKey; tone: "neutral" | "pending" | "success" }> = {
  dismissed: { labelKey: "notification.state.dismissed", tone: "neutral" },
  read: { labelKey: "notification.state.read", tone: "success" },
  unread: { labelKey: "notification.state.unread", tone: "pending" },
};

type NotificationCenterPanelProps = {
  autoLoad?: boolean;
  initialNotifications?: NotificationResponse[];
};
const NOTIFICATION_CENTER_EVENT_SOURCE = "notification-center";

function toNotificationKind(sourceType: NotificationResponse["sourceType"]): NotificationKind {
  if (sourceType === "AGENT") return "agent";
  if (sourceType === "MESSAGE" || sourceType === "COMMENT") return "communication";
  if (sourceType === "RESOURCE") return "resource";
  return "system";
}

function toNotificationState(status: NotificationStatus): NotificationState {
  if (status === "READ") return "read";
  if (status === "ARCHIVED") return "dismissed";
  return "unread";
}

function toNotificationItem(t: TranslateFn, notification: NotificationResponse): NotificationItem {
  const createdAt = new Date(notification.createdAt);
  const time = Number.isNaN(createdAt.getTime()) ? t("notification.center.timeFallback") : createdAt.toLocaleString();
  const sourceType = notification.sourceType ?? "SYSTEM";
  const formatted = formatNotificationContent(t, notification);

  return {
    description: formatted.body || t("notification.center.bodyFallback"),
    id: notification.id,
    kind: toNotificationKind(notification.sourceType),
    originLabel: notification.sourceId?.trim() || t("notification.center.sourceType", { type: sourceType }),
    projectRoom: t("notification.center.serverQueue"),
    state: toNotificationState(notification.status),
    time,
    title: formatted.title || t("notification.center.titleFallback"),
  };
}

function NotificationRow({
  item,
  onArchive,
  onMarkRead,
  pendingAction,
}: {
  item: NotificationItem;
  onArchive: (item: NotificationItem) => void;
  onMarkRead: (item: NotificationItem) => void;
  pendingAction: "archive" | "read" | null;
}) {
  const { t } = useI18n();
  const meta = kindMeta[item.kind];
  const state = stateCopy[item.state];
  const Icon = meta.icon;
  const archived = item.state === "dismissed";
  const read = item.state === "read" || archived;

  return (
    <article className="notification-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={17} strokeWidth={2.1} />
      </span>
      <div className="notification-row__body">
        <div className="notification-row__head">
          <div>
            <div className="notification-row__meta">
              <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
              <span>{item.projectRoom}</span>
              <span>{item.time}</span>
            </div>
            <h3>{item.title}</h3>
          </div>
          <StatusBadge tone={state.tone}>{t(state.labelKey)}</StatusBadge>
        </div>
        <p>{item.description}</p>
        <footer className="notification-row__footer">
          <span>{t("notification.center.linkedItem", { label: item.originLabel })}</span>
          <div>
            <Button
              disabled={read}
              icon={<CheckCircle2 size={14} />}
              loading={pendingAction === "read"}
              onClick={() => onMarkRead(item)}
              size="sm"
              variant="ghost"
            >
              {t("notification.center.markRead")}
            </Button>
            <Button
              disabled={archived}
              icon={<EyeOff size={14} />}
              loading={pendingAction === "archive"}
              onClick={() => onArchive(item)}
              size="sm"
              variant="quiet"
            >
              {t("notification.center.archive")}
            </Button>
          </div>
        </footer>
      </div>
    </article>
  );
}

export function NotificationCenterPanel({ autoLoad = true, initialNotifications = [] }: NotificationCenterPanelProps = {}) {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationResponse[]>(() => initialNotifications);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ action: "archive" | "read"; id: string } | null>(null);

  useEffect(() => {
    if (!autoLoad) return;

    let active = true;

    notificationApi
      .list({ size: 20 })
      .then((response) => {
        if (!active) return;
        setNotifications(response.items);
      })
      .catch(() => {
        if (!active) return;
        setHasLoadError(true);
        setNotifications([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [autoLoad]);

  const refreshNotifications = useCallback(() => {
    if (!autoLoad) return;

    void notificationApi
      .list({ size: 20 })
      .then((response) => {
        setNotifications(response.items);
        setHasLoadError(false);
      })
      .catch(() => undefined);
  }, [autoLoad]);

  useDataRefresh({
    domains: ["notification"],
    ignoreSource: NOTIFICATION_CENTER_EVENT_SOURCE,
    onRefresh: refreshNotifications,
  });

  const notificationItems = useMemo(
    () =>
      [...notifications]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .map((notification) => toNotificationItem(t, notification)),
    [notifications, t],
  );
  const unreadCount = notifications.filter((item) => item.status === "UNREAD").length;
  const replaceNotification = useCallback((id: string, nextStatus: NotificationStatus) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              readAt: nextStatus === "READ" ? new Date().toISOString() : notification.readAt,
              status: nextStatus,
            }
          : notification,
      ),
    );
  }, []);
  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const handleMarkRead = useCallback(
    async (item: NotificationItem) => {
      if (item.state !== "unread") return;

      setPendingItem({ action: "read", id: item.id });
      replaceNotification(item.id, "READ");

      if (!autoLoad) {
        setPendingItem(null);
        return;
      }

      try {
        await notificationApi.markRead(item.id);
        notifyDataChanged("notification", { source: NOTIFICATION_CENTER_EVENT_SOURCE });
      } catch {
        replaceNotification(item.id, "UNREAD");
      } finally {
        setPendingItem(null);
      }
    },
    [autoLoad, replaceNotification],
  );

  const handleArchive = useCallback(
    async (item: NotificationItem) => {
      if (item.state === "dismissed") return;

      const previous = notifications.find((notification) => notification.id === item.id);
      setPendingItem({ action: "archive", id: item.id });
      removeNotification(item.id);

      if (!autoLoad) {
        setPendingItem(null);
        return;
      }

      try {
        await notificationApi.archive(item.id);
        notifyDataChanged("notification", { source: NOTIFICATION_CENTER_EVENT_SOURCE });
      } catch {
        if (previous) setNotifications((current) => [previous, ...current]);
      } finally {
        setPendingItem(null);
      }
    },
    [autoLoad, notifications, removeNotification],
  );

  return (
    <section className="notification-center" aria-label={t("notification.center.sectionAria")}>
      <GlassPanel className="notification-center__hero">
        <div className="notification-center__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <BellRing size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("notification.center.chip")}</Chip>
            <h2>{t("notification.center.heroTitle")}</h2>
            <p>{t("notification.center.heroDesc")}</p>
          </div>
        </div>
        <div className="notification-center__summary" aria-label={t("notification.center.summaryAria")}>
          <strong>{unreadCount}</strong>
          <span>{t("notification.center.newToCheck")}</span>
          <p>{hasLoadError ? t("notification.center.loadFailed") : t("notification.center.summaryDesc")}</p>
        </div>
      </GlassPanel>

      <div className="notification-center__grid">
        <GlassPanel className="notification-center__list">
          <div className="notification-center__toolbar">
            <h3>{t("notification.center.today")}</h3>
            <div>
              <Chip selected>{t("notification.center.filterAll")}</Chip>
              <Chip>{t("notification.center.filterUnread")}</Chip>
            </div>
          </div>
          <div className="notification-center__items">
            {notificationItems.length > 0 ? (
              notificationItems.map((item) => (
                <NotificationRow
                  item={item}
                  key={item.id}
                  onArchive={handleArchive}
                  onMarkRead={handleMarkRead}
                  pendingAction={pendingItem?.id === item.id ? pendingItem.action : null}
                />
              ))
            ) : (
              <p>{isLoading ? t("notification.center.loading") : t("notification.center.empty")}</p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="notification-center__policy">
          <h3>{t("notification.center.policyTitle")}</h3>
          <dl>
            <div>
              <dt>{t("notification.center.policy.origin")}</dt>
              <dd>{t("notification.center.policy.originDesc")}</dd>
            </div>
            <div>
              <dt>{t("notification.center.policy.userState")}</dt>
              <dd>{t("notification.center.policy.userStateDesc")}</dd>
            </div>
            <div>
              <dt>{t("notification.center.policy.desktop")}</dt>
              <dd>{t("notification.center.policy.desktopDesc")}</dd>
            </div>
          </dl>
        </GlassPanel>
      </div>
    </section>
  );
}
