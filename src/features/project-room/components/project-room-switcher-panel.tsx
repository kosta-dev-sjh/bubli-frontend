import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FolderKanban,
  Search,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./project-room-switcher-panel.module.css";

export type ProjectRoomSwitcherRole = "leader" | "member";
export type ProjectRoomSwitcherStatus = "active" | "solo" | "needsReview";

export type ProjectRoomSwitcherItem = {
  alertCount: number;
  description: string;
  id: string;
  myTodoCount: number;
  name: string;
  nextDueLabel: string;
  progress: number;
  role: ProjectRoomSwitcherRole;
  status: ProjectRoomSwitcherStatus;
};

export type ProjectRoomSwitcherPanelProps = HTMLAttributes<HTMLElement> & {
  activeRoomId?: string;
  items: ProjectRoomSwitcherItem[];
  onCreateRoom?: () => void;
  onSelectRoom?: (roomId: string) => void;
  searchValue?: string;
  title?: string;
};

const roleMetaKey: Record<ProjectRoomSwitcherRole, { labelKey: MessageKey; tone: StatusTone }> = {
  leader: { labelKey: "room.switcher.roleLeader", tone: "approved" },
  member: { labelKey: "room.switcher.roleMember", tone: "room" },
};

const statusMetaKey: Record<
  ProjectRoomSwitcherStatus,
  { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }
> = {
  active: {
    icon: <UsersRound size={15} strokeWidth={2.1} />,
    labelKey: "room.switcher.statusActive",
    tone: "success",
  },
  needsReview: {
    icon: <Bell size={15} strokeWidth={2.1} />,
    labelKey: "room.switcher.statusNeedsReview",
    tone: "warning",
  },
  solo: {
    icon: <ShieldCheck size={15} strokeWidth={2.1} />,
    labelKey: "room.switcher.statusSolo",
    tone: "personal",
  },
};

function ProjectRoomCard({
  active,
  item,
  onSelectRoom,
}: {
  active: boolean;
  item: ProjectRoomSwitcherItem;
  onSelectRoom?: (roomId: string) => void;
}) {
  const { t } = useI18n();
  const role = roleMetaKey[item.role];
  const status = statusMetaKey[item.status];

  return (
    <button
      aria-current={active ? "true" : undefined}
      className={cn(styles.roomCard, active && styles.roomCardActive)}
      onClick={() => onSelectRoom?.(item.id)}
      type="button"
    >
      <div className={styles.roomTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FolderKanban size={18} strokeWidth={2.1} />
        </span>
        <div className={styles.roomTitle}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
        <ChevronRight size={16} strokeWidth={2.1} aria-hidden="true" />
      </div>

      <div className={styles.badges}>
        <StatusBadge tone={role.tone}>{t(role.labelKey)}</StatusBadge>
        <StatusBadge tone={status.tone}>
          <span className={styles.inlineStatus}>
            {status.icon}
            {t(status.labelKey)}
          </span>
        </StatusBadge>
      </div>

      <ProgressBar label={t("room.switcher.progressLabel", { name: item.name })} value={item.progress} />

      <div className={styles.roomMeta}>
        <span>
          <CheckCircle2 size={14} strokeWidth={2.1} aria-hidden="true" />
          {t("room.switcher.myTodo", { count: item.myTodoCount })}
        </span>
        <span>
          <CalendarClock size={14} strokeWidth={2.1} aria-hidden="true" />
          {item.nextDueLabel}
        </span>
        <span>
          <Bell size={14} strokeWidth={2.1} aria-hidden="true" />
          {t("room.switcher.alertCount", { count: item.alertCount })}
        </span>
      </div>
    </button>
  );
}

export function ProjectRoomSwitcherPanel({
  activeRoomId,
  className,
  items,
  onCreateRoom,
  onSelectRoom,
  searchValue = "",
  title,
  ...props
}: ProjectRoomSwitcherPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("room.switcher.defaultTitle");
  const leaderCount = items.filter((item) => item.role === "leader").length;
  const reviewCount = items.reduce((total, item) => total + item.alertCount, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderKanban size={14} strokeWidth={2.1} />} selected>
            {t("room.switcher.chip")}
          </Chip>
          <div>
            <h2>{resolvedTitle}</h2>
            <p>{t("room.switcher.description")}</p>
          </div>
        </div>
        <Button icon={<UserRoundPlus size={15} strokeWidth={2.1} />} onClick={onCreateRoom} variant="primary">
          {t("room.switcher.new")}
        </Button>
      </header>

      <div className={styles.summary}>
        <article>
          <span>{t("room.switcher.joined")}</span>
          <strong>{t("room.switcher.joinedCount", { count: items.length })}</strong>
        </article>
        <article>
          <span>{t("room.switcher.leading")}</span>
          <strong>{t("room.switcher.leadingCount", { count: leaderCount })}</strong>
        </article>
        <article>
          <span>{t("room.switcher.needsReview")}</span>
          <strong>{t("room.switcher.reviewCount", { count: reviewCount })}</strong>
        </article>
      </div>

      <label className={styles.search}>
        <Search size={17} strokeWidth={2.1} aria-hidden="true" />
        <span className={styles.visuallyHidden}>{t("room.switcher.searchLabel")}</span>
        <input defaultValue={searchValue} placeholder={t("room.switcher.searchPlaceholder")} type="search" />
      </label>

      <div className={styles.roomGrid}>
        {items.map((item) => (
          <ProjectRoomCard
            active={item.id === activeRoomId}
            item={item}
            key={item.id}
            onSelectRoom={onSelectRoom}
          />
        ))}
      </div>

      <footer className={styles.notice}>
        <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
        <p>{t("room.switcher.notice")}</p>
      </footer>
    </GlassPanel>
  );
}
