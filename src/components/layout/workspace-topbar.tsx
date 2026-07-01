import { Bell, ChevronDown, FolderKanban, Search, UserRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./workspace-topbar.module.css";

export type WorkspaceTopbarProject = {
  description: string;
  name: string;
  statusLabel: string;
};

export type WorkspaceTopbarUser = {
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
  searchPlaceholder = "자료, TODO, 채팅 검색",
  surfaceLabel = "회원 웹 앱",
  user,
  ...props
}: WorkspaceTopbarProps) {
  const visibleNotificationCount = Math.min(notificationCount, 99);

  return (
    <header className={cn(styles.topbar, !searchEnabled && styles.topbarNoSearch, className)} {...props}>
      {onOpenProjectSwitcher ? (
        <button
          aria-label={`${project.name} 프로젝트룸 선택`}
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
        <div aria-label={`${project.name} 현재 위치`} className={styles.projectButton} role="group">
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
          <span className={styles.visuallyHidden}>검색</span>
          <input placeholder={searchPlaceholder} type="search" />
          <kbd>⌘K</kbd>
        </label>
      ) : null}

      <div className={styles.actions}>
        {surfaceLabel ? <Chip className={styles.surfaceChip}>{surfaceLabel}</Chip> : null}
        <Button
          aria-label={`알림 ${notificationCount}개 열기`}
          className={styles.iconButton}
          onClick={onOpenNotifications}
          size="sm"
          variant="quiet"
        >
          <Bell size={16} strokeWidth={2.1} aria-hidden="true" />
          {notificationCount > 0 ? <span className={styles.badge}>{visibleNotificationCount}</span> : null}
        </Button>
        <button aria-label={`${user.displayName} 프로필 열기`} className={styles.profileButton} onClick={onOpenProfile} type="button">
          <span className={styles.avatar} aria-hidden="true">
            {user.initials}
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
