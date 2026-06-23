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

const roleMeta: Record<ProjectRoomSwitcherRole, { label: string; tone: StatusTone }> = {
  leader: { label: "프로젝트 리더", tone: "approved" },
  member: { label: "멤버", tone: "room" },
};

const statusMeta: Record<
  ProjectRoomSwitcherStatus,
  { icon: ReactNode; label: string; tone: StatusTone }
> = {
  active: {
    icon: <UsersRound size={15} strokeWidth={2.1} />,
    label: "함께 진행 중",
    tone: "success",
  },
  needsReview: {
    icon: <Bell size={15} strokeWidth={2.1} />,
    label: "확인 필요",
    tone: "warning",
  },
  solo: {
    icon: <ShieldCheck size={15} strokeWidth={2.1} />,
    label: "혼자 사용 중",
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
  const role = roleMeta[item.role];
  const status = statusMeta[item.status];

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
        <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
        <StatusBadge tone={status.tone}>
          <span className={styles.inlineStatus}>
            {status.icon}
            {status.label}
          </span>
        </StatusBadge>
      </div>

      <ProgressBar label={`${item.name} 진행률`} value={item.progress} />

      <div className={styles.roomMeta}>
        <span>
          <CheckCircle2 size={14} strokeWidth={2.1} aria-hidden="true" />
          내 TODO {item.myTodoCount}개
        </span>
        <span>
          <CalendarClock size={14} strokeWidth={2.1} aria-hidden="true" />
          {item.nextDueLabel}
        </span>
        <span>
          <Bell size={14} strokeWidth={2.1} aria-hidden="true" />
          확인 {item.alertCount}개
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
  title = "프로젝트룸 선택",
  ...props
}: ProjectRoomSwitcherPanelProps) {
  const leaderCount = items.filter((item) => item.role === "leader").length;
  const reviewCount = items.reduce((total, item) => total + item.alertCount, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderKanban size={14} strokeWidth={2.1} />} selected>
            프로젝트룸
          </Chip>
          <div>
            <h2>{title}</h2>
            <p>
              대시보드는 사용자 기준으로 모아 보고, 프로젝트룸은 자료와 작업판을 확인할 때 선택해서
              들어갑니다.
            </p>
          </div>
        </div>
        <Button icon={<UserRoundPlus size={15} strokeWidth={2.1} />} onClick={onCreateRoom} variant="primary">
          새 프로젝트룸
        </Button>
      </header>

      <div className={styles.summary}>
        <article>
          <span>참여 중</span>
          <strong>{items.length}개</strong>
        </article>
        <article>
          <span>내가 이끄는 항목</span>
          <strong>{leaderCount}개</strong>
        </article>
        <article>
          <span>확인 필요</span>
          <strong>{reviewCount}개</strong>
        </article>
      </div>

      <label className={styles.search}>
        <Search size={17} strokeWidth={2.1} aria-hidden="true" />
        <span className={styles.visuallyHidden}>프로젝트룸 검색</span>
        <input defaultValue={searchValue} placeholder="프로젝트룸, 클라이언트, 납품물 검색" type="search" />
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
        <p>
          목록에는 사용자가 접근할 수 있는 프로젝트룸만 표시합니다. 자료, WBS, TODO, 채팅은 선택한
          프로젝트룸의 권한을 다시 확인한 뒤 열립니다.
        </p>
      </footer>
    </GlassPanel>
  );
}
