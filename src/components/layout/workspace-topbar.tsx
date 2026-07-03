"use client";

import { Bell, ChevronDown, FolderKanban, Search, UserRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./workspace-topbar.module.css";

export type WorkspaceTopbarProject = {
  description: string;
  name: string;
  statusLabel: string;
};

export type WorkspaceTopbarUser = {
  avatarUrl?: string | null;
  displayName: string;
  email: string;
  initials: string;
};

export type WorkspaceTopbarProps = HTMLAttributes<HTMLElement> & {
  notificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenProjectSwitcher?: () => void;
  project: WorkspaceTopbarProject;
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  surfaceLabel?: string;
  user: WorkspaceTopbarUser;
};

export function WorkspaceTopbar({
  className,
  notificationCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onOpenProjectSwitcher,
  project,
  searchEnabled = false,
  searchPlaceholder,
  surfaceLabel,
  user,
  ...props
}: WorkspaceTopbarProps) {
  const { t } = useI18n();
  const visibleNotificationCount = Math.min(notificationCount, 99);
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("layout.topbar.searchPlaceholder");
  const resolvedSurfaceLabel = surfaceLabel ?? t("layout.topbar.surface");

  return (
    <header className={cn(styles.topbar, !searchEnabled && styles.topbarNoSearch, className)} {...props}>
      {onOpenProjectSwitcher ? (
        <button
          aria-label={t("layout.topbar.projectSelectAria", { name: project.name })}
          className={styles.projectButton}
          onClick={onOpenProjectSwitcher}
          type="button"
        >
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderKanban size={18} strokeWidth={2.1} />
          </span>
          <span className={styles.projectText}>
            <strong>{project.name}</strong>
            <span>{project.description}</span>
          </span>
          {project.statusLabel ? <StatusBadge tone="room">{project.statusLabel}</StatusBadge> : null}
          <ChevronDown size={16} strokeWidth={2.1} aria-hidden="true" />
        </button>
      ) : (
        <div aria-label={t("layout.topbar.projectCurrentAria", { name: project.name })} className={styles.projectButton} role="group">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderKanban size={18} strokeWidth={2.1} />
          </span>
          <span className={styles.projectText}>
            <strong>{project.name}</strong>
            <span>{project.description}</span>
          </span>
          {project.statusLabel ? <StatusBadge tone="room">{project.statusLabel}</StatusBadge> : null}
        </div>
      )}

      {searchEnabled ? (
        <label className={styles.searchBox}>
          <Search size={17} strokeWidth={2.1} aria-hidden="true" />
          <span className={styles.visuallyHidden}>{t("layout.topbar.searchHidden")}</span>
          <input placeholder={resolvedSearchPlaceholder} type="search" />
          <kbd>⌘K</kbd>
        </label>
      ) : null}

      <div className={styles.actions}>
        {resolvedSurfaceLabel ? <Chip className={styles.surfaceChip}>{resolvedSurfaceLabel}</Chip> : null}
        <Button
          aria-label={t("layout.topbar.notificationsAria", { count: notificationCount })}
          className={styles.iconButton}
          onClick={onOpenNotifications}
          size="sm"
          variant="quiet"
        >
          <Bell size={16} strokeWidth={2.1} aria-hidden="true" />
          {notificationCount > 0 ? <span className={styles.badge}>{visibleNotificationCount}</span> : null}
        </Button>
        <button aria-label={t("layout.topbar.profileAria", { name: user.displayName })} className={styles.profileButton} onClick={onOpenProfile} type="button">
          <span className={styles.avatar} aria-hidden="true">
            {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : user.initials}
          </span>
          <span className={styles.profileText}>
            <strong>{user.displayName}</strong>
            <span>{user.email}</span>
          </span>
          <UserRound size={16} strokeWidth={2.1} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
