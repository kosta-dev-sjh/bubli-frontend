"use client";

import { BellOff, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatNotificationContent, isNotificationInboxItem } from "@/features/notification/format-notification";
import type { NotificationResponse } from "@/types/api/notification";
import type { ProjectRoomInvitationResponse } from "@/types/api/projectRoom";

import styles from "./workspace-topbar.module.css";

export type TopbarNotificationsPanelProps = {
  acceptingInvitationId?: string | null;
  id?: string;
  invitations?: ProjectRoomInvitationResponse[];
  items: NotificationResponse[];
  onAcceptInvitation?: (invitation: ProjectRoomInvitationResponse) => void;
  onArchive: (notificationId: string) => void;
  onArchiveAll?: () => void;
  onMarkAllRead?: () => void;
  onMarkRead: (notificationId: string) => void;
  /** 알림 본문 클릭 → 출처(sourceType/sourceId)로 이동. 상위(app-shell)가 라우팅을 결정한다. */
  onOpen?: (notification: NotificationResponse) => void;
};

export function TopbarNotificationsPanel({
  acceptingInvitationId,
  id,
  invitations = [],
  items,
  onAcceptInvitation,
  onArchive,
  onArchiveAll,
  onMarkAllRead,
  onMarkRead,
  onOpen,
}: TopbarNotificationsPanelProps) {
  const { locale, t } = useI18n();
  const visibleItems = items.filter(isNotificationInboxItem);
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
        {/* 일괄 동작은 항상 헤더에 상주한다 — 미읽음이 없어도 "모두 지우기"는 쓸 수 있어야 한다. */}
        <span className={styles.notificationsHeadMeta}>
          {unreadCount > 0 ? t("layout.notifications.unreadCount", { count: unreadCount }) : null}
          {onMarkAllRead && unreadCount > 0 ? (
            <Button className={styles.notificationReadButton} onClick={onMarkAllRead} size="sm" variant="ghost">
              {t("layout.notifications.markAllRead")}
            </Button>
          ) : null}
          {onArchiveAll && visibleItems.length > 0 ? (
            <Button className={styles.notificationReadButton} onClick={onArchiveAll} size="sm" variant="ghost">
              {t("layout.notifications.archiveAll")}
            </Button>
          ) : null}
        </span>
      </header>
      {invitations.length ? (
        <div className={styles.invitesSection}>
          <span className={styles.invitesLabel}>{t("layout.invites.title")}</span>
          <ul className={styles.notificationsList}>
            {invitations.map((invitation) => (
              <li className={styles.notificationItem} data-unread="true" key={invitation.id}>
                <span className={styles.inviteIcon} aria-hidden="true">
                  <FolderKanban size={15} strokeWidth={2.1} />
                </span>
                <div className={styles.notificationBody}>
                  <strong>{invitation.roomName || t("layout.invites.roomFallback")}</strong>
                  <p>
                    {t("layout.invites.from", {
                      name: invitation.inviterName || invitation.inviterBubliId || t("layout.invites.inviterFallback"),
                    })}
                  </p>
                  <time dateTime={invitation.createdAt}>{formatTime(invitation.createdAt)}</time>
                </div>
                <div className={styles.notificationActions}>
                  <Button
                    aria-label={t("layout.invites.acceptAria", { room: invitation.roomName ?? "" })}
                    disabled={acceptingInvitationId !== null && acceptingInvitationId !== undefined}
                    loading={acceptingInvitationId === invitation.id}
                    onClick={() => onAcceptInvitation?.(invitation)}
                    size="sm"
                    variant="primary"
                  >
                    {t("layout.invites.accept")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {visibleItems.length ? (
        <ul className={styles.notificationsList}>
          {visibleItems.map((item) => {
            // sourceType이 있으면 "보러가기" 딥링크로 이동 가능한 알림이다(라우팅은 app-shell 담당).
            const openable = Boolean(onOpen && item.sourceType);
            // 백엔드 원시 잡 메타데이터("jobType=…, jobId=…")를 사람이 읽을 문구로 정리한다.
            const display = formatNotificationContent(t, item);
            const bodyContent = (
              <>
                <strong>{display.title}</strong>
                {display.body ? <p>{display.body}</p> : null}
                <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
              </>
            );

            return (
            <li
              className={styles.notificationItem}
              data-unread={item.status === "UNREAD" ? "true" : undefined}
              key={item.id}
            >
              {openable ? (
                <button
                  aria-label={t("layout.notifications.openAria", { title: display.title })}
                  className={cn(styles.notificationBody, styles.notificationOpenButton)}
                  onClick={() => onOpen?.(item)}
                  type="button"
                >
                  {bodyContent}
                </button>
              ) : (
                <div className={styles.notificationBody}>{bodyContent}</div>
              )}
              <div className={styles.notificationActions}>
                {item.status === "UNREAD" ? (
                  <Button
                    aria-label={t("layout.notifications.markReadAria", { title: display.title })}
                    className={styles.notificationReadButton}
                    onClick={() => onMarkRead(item.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("layout.notifications.markRead")}
                  </Button>
                ) : null}
                <Button
                  aria-label={t("layout.notifications.archiveAria", { title: display.title })}
                  className={styles.notificationReadButton}
                  onClick={() => onArchive(item.id)}
                  size="sm"
                  variant="ghost"
                >
                  {t("layout.notifications.archive")}
                </Button>
              </div>
            </li>
            );
          })}
        </ul>
      ) : !invitations.length ? (
        <p className={styles.notificationsEmpty}>
          <BellOff size={16} strokeWidth={2.1} aria-hidden="true" />
          {t("layout.notifications.empty")}
        </p>
      ) : null}
    </section>
  );
}
