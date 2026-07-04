"use client";

import { Bell, ChevronDown, FolderKanban, Search, UserRound } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./workspace-topbar.module.css";

export const TOPBAR_NOTIFICATIONS_PANEL_ID = "topbar-notifications-panel";
export const TOPBAR_PROFILE_MENU_ID = "topbar-profile-menu";

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
  /** 열림 상태(제어형). notificationsPanel과 함께 쓴다. */
  notificationsOpen?: boolean;
  /** 종 버튼 아래에 붙는 알림 패널 노드. 열림 상태일 때만 넘긴다. */
  notificationsPanel?: ReactNode;
  /** 바깥 클릭·Escape로 열린 메뉴를 닫을 때 호출된다. */
  onCloseMenus?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenProjectSwitcher?: () => void;
  /** 프로필 버튼 아래에 붙는 드롭다운 메뉴 노드. 열림 상태일 때만 넘긴다. */
  profileMenu?: ReactNode;
  profileOpen?: boolean;
  project: WorkspaceTopbarProject;
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  surfaceLabel?: string;
  user: WorkspaceTopbarUser;
};

export function WorkspaceTopbar({
  className,
  notificationCount = 0,
  notificationsOpen = false,
  notificationsPanel,
  onCloseMenus,
  onOpenNotifications,
  onOpenProfile,
  onOpenProjectSwitcher,
  profileMenu,
  profileOpen = false,
  project,
  searchEnabled = false,
  searchPlaceholder,
  surfaceLabel,
  user,
  ...props
}: WorkspaceTopbarProps) {
  const { t } = useI18n();
  const notificationsAnchorRef = useRef<HTMLDivElement | null>(null);
  const profileAnchorRef = useRef<HTMLDivElement | null>(null);
  const visibleNotificationCount = Math.min(notificationCount, 99);
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("layout.topbar.searchPlaceholder");
  const resolvedSurfaceLabel = surfaceLabel ?? t("layout.topbar.surface");
  const anyMenuOpen = notificationsOpen || profileOpen;

  useEffect(() => {
    if (!anyMenuOpen || !onCloseMenus) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (notificationsAnchorRef.current?.contains(target)) return;
      if (profileAnchorRef.current?.contains(target)) return;
      onCloseMenus?.();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const anchor = notificationsOpen ? notificationsAnchorRef.current : profileAnchorRef.current;
      onCloseMenus?.();
      anchor?.querySelector("button")?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anyMenuOpen, notificationsOpen, onCloseMenus]);

  return (
    <header className={cn(styles.topbar, !searchEnabled && styles.topbarNoSearch, className)} {...props}>
      {onOpenProjectSwitcher ? (
        <button
          aria-label={t("layout.topbar.projectSelectAria", { name: project.name })}
          className={styles.projectButton}
          data-tour="room-switcher"
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
        <div className={styles.menuAnchor} ref={notificationsAnchorRef}>
          <Button
            aria-controls={notificationsOpen ? TOPBAR_NOTIFICATIONS_PANEL_ID : undefined}
            aria-expanded={onOpenNotifications ? notificationsOpen : undefined}
            aria-label={t("layout.topbar.notificationsAria", { count: notificationCount })}
            className={styles.iconButton}
            onClick={onOpenNotifications}
            size="sm"
            variant="quiet"
          >
            <Bell size={16} strokeWidth={2.1} aria-hidden="true" />
            {notificationCount > 0 ? <span className={styles.badge}>{visibleNotificationCount}</span> : null}
          </Button>
          {notificationsOpen ? notificationsPanel : null}
        </div>
        <div className={cn(styles.menuAnchor, styles.profileAnchor)} ref={profileAnchorRef}>
          <button
            aria-controls={profileOpen ? TOPBAR_PROFILE_MENU_ID : undefined}
            aria-expanded={onOpenProfile ? profileOpen : undefined}
            aria-haspopup={onOpenProfile ? "menu" : undefined}
            aria-label={t("layout.topbar.profileAria", { name: user.displayName })}
            className={styles.profileButton}
            onClick={onOpenProfile}
            type="button"
          >
            <span className={styles.avatar} aria-hidden="true">
              {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : user.initials}
            </span>
            <span className={styles.profileText}>
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </span>
            <UserRound size={16} strokeWidth={2.1} aria-hidden="true" />
          </button>
          {profileOpen ? profileMenu : null}
        </div>
      </div>
    </header>
  );
}
