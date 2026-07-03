"use client";

import { BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NotificationResponse } from "@/types/api/notification";

import styles from "./workspace-topbar.module.css";

export type TopbarNotificationsPanelProps = {
  id?: string;
  items: NotificationResponse[];
  onMarkRead: (notificationId: string) => void;
};

export function TopbarNotificationsPanel({ id, items, onMarkRead }: TopbarNotificationsPanelProps) {
  const { locale, t } = useI18n();
  const visibleItems = items.filter((item) => item.status !== "ARCHIVED");
  const unreadCount = visibleItems.filter((item) => item.status === "UNREAD").length;

  function formatTime(isoValue: string) {
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return isoValue;
    return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <section
      aria-label={t("layout.notifications.aria")}
      className={cn(styles.menuPopover, styles.notificationsPopover)}
      id={id}
    >
      <header className={styles.notificationsHead}>
        <strong>{t("layout.notifications.title")}</strong>
        {unreadCount > 0 ? <span>{t("layout.notifications.unreadCount", { count: unreadCount })}</span> : null}
      </header>
      {visibleItems.length ? (
        <ul className={styles.notificationsList}>
          {visibleItems.map((item) => (
            <li
              className={styles.notificationItem}
              data-unread={item.status === "UNREAD" ? "true" : undefined}
              key={item.id}
            >
              <div className={styles.notificationBody}>
                <strong>{item.title}</strong>
                {item.body ? <p>{item.body}</p> : null}
                <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
              </div>
              {item.status === "UNREAD" ? (
                <Button
                  aria-label={t("layout.notifications.markReadAria", { title: item.title })}
                  className={styles.notificationReadButton}
                  onClick={() => onMarkRead(item.id)}
                  size="sm"
                  variant="ghost"
                >
                  {t("layout.notifications.markRead")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.notificationsEmpty}>
          <BellOff size={16} strokeWidth={2.1} aria-hidden="true" />
          {t("layout.notifications.empty")}
        </p>
      )}
    </section>
  );
}
