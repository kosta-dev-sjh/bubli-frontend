import {
  Clock3,
  Download,
  FileText,
  ListTree,
  MessageCircle,
  Mic2,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./guest-session-expiry-panel.module.css";

type GuestPermissionKind = "CHAT" | "VOICE" | "RESOURCE" | "WBS" | "MEMBER_LIST" | "DOWNLOAD";
type GuestPermissionStatus = "ALLOWED" | "BLOCKED";

type GuestPermission = {
  description: string;
  kind: GuestPermissionKind;
  status: GuestPermissionStatus;
  title: string;
};

type GuestSessionRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type GuestSessionExpiryPanelProps = HTMLAttributes<HTMLElement> & {
  expiresAtLabel: string;
  guestName: string;
  permissions: GuestPermission[];
  remainingPercent: number;
  roomName: string;
  rules: GuestSessionRule[];
  title?: string;
};

const permissionIcons: Record<GuestPermissionKind, typeof MessageCircle> = {
  CHAT: MessageCircle,
  DOWNLOAD: Download,
  MEMBER_LIST: UsersRound,
  RESOURCE: FileText,
  VOICE: Mic2,
  WBS: ListTree,
};

const permissionMeta: Record<GuestPermissionStatus, { label: string; tone: StatusTone }> = {
  ALLOWED: { label: "허용", tone: "approved" },
  BLOCKED: { label: "제한", tone: "warning" },
};

export const defaultGuestPermissions: GuestPermission[] = [
  {
    description: "초대 링크로 들어온 프로젝트룸 채팅에 메시지를 보낼 수 있습니다.",
    kind: "CHAT",
    status: "ALLOWED",
    title: "채팅 참여",
  },
  {
    description: "API 서버에서 발급받은 보이스 토큰으로 정해진 세션에만 입장합니다.",
    kind: "VOICE",
    status: "ALLOWED",
    title: "보이스 참여",
  },
  {
    description: "자료보드의 개인 자료와 프로젝트룸 자료는 볼 수 없습니다.",
    kind: "RESOURCE",
    status: "BLOCKED",
    title: "자료 접근",
  },
  {
    description: "WBS/작업판, TODO, 일정은 프로젝트룸 참여 권한이 있을 때만 열립니다.",
    kind: "WBS",
    status: "BLOCKED",
    title: "WBS/작업판",
  },
  {
    description: "멤버 목록과 역할 정보는 게스트 화면에 표시하지 않습니다.",
    kind: "MEMBER_LIST",
    status: "BLOCKED",
    title: "멤버 정보",
  },
  {
    description: "파일 내려받기는 프로젝트룸 참여 권한과 자료 권한 확인 후에만 가능합니다.",
    kind: "DOWNLOAD",
    status: "BLOCKED",
    title: "파일 다운로드",
  },
];

export const defaultGuestSessionRules: GuestSessionRule[] = [
  {
    description: "게스트는 프로젝트룸 정식 참여자가 아니라 채팅과 보이스에만 잠깐 들어오는 임시 참여자입니다.",
    label: "임시 참여",
    tone: "personal",
  },
  {
    description: "만료 시간이 지나면 새 토큰을 받아야 하며, 기존 연결은 다시 확인합니다.",
    label: "시간 제한",
    tone: "pending",
  },
  {
    description: "자료, WBS, 일정, 멤버 정보는 게스트 권한으로 열리지 않습니다.",
    label: "접근 분리",
    tone: "warning",
  },
];

export function GuestSessionExpiryPanel({
  className,
  expiresAtLabel,
  guestName,
  permissions,
  remainingPercent,
  roomName,
  rules,
  title = "게스트 참여 상태",
  ...props
}: GuestSessionExpiryPanelProps) {
  const allowedCount = permissions.filter((permission) => permission.status === "ALLOWED").length;
  const safePercent = Math.max(0, Math.min(remainingPercent, 100));

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UserRound size={16} strokeWidth={2.1} />}>guest_sessions</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              게스트는 프로젝트룸 안에서 채팅과 보이스에만 잠깐 참여합니다. 자료, WBS, 일정, 멤버 정보는 프로젝트룸
              멤버 권한이 있을 때만 열립니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>허용된 기능</span>
          <strong>{allowedCount}개</strong>
          <StatusBadge tone={safePercent <= 25 ? "warning" : "pending"}>{expiresAtLabel}</StatusBadge>
        </div>
      </header>

      <section className={styles.sessionCard} aria-label="게스트 세션 만료 정보">
        <span className={styles.iconTile}>
          <Clock3 size={18} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div className={styles.sessionContent}>
          <div className={styles.sessionTop}>
            <div>
              <strong>{guestName}</strong>
              <p>{roomName} 임시 참여 중</p>
            </div>
            <StatusBadge tone="personal">게스트</StatusBadge>
          </div>
          <ProgressBar value={safePercent} />
        </div>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          권한 확인
        </Button>
      </section>

      <section className={styles.permissionGrid} aria-label="게스트 접근 범위">
        {permissions.map((permission) => {
          const PermissionIcon = permissionIcons[permission.kind];
          const meta = permissionMeta[permission.status];

          return (
            <article
              className={cn(styles.permissionCard, permission.status === "BLOCKED" && styles.blockedCard)}
              key={permission.kind}
            >
              <div className={styles.permissionTop}>
                <span className={styles.iconTile}>
                  <PermissionIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div>
                  <strong>{permission.title}</strong>
                  <p>{permission.description}</p>
                </div>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="게스트 세션 정책">
        {rules.map((rule) => (
          <article key={rule.label}>
            <ShieldAlert size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
