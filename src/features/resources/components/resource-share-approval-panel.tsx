"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  FolderLock,
  History,
  Info,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-share-approval-panel.module.css";

export type ShareReadiness = "READY" | "NEEDS_ROOM" | "NO_PERMISSION" | "ALREADY_SHARED";
export type ShareAuditStatus = "PASSED" | "PENDING" | "BLOCKED";

export type ShareAuditItem = {
  description: string;
  id: string;
  label: string;
  status: ShareAuditStatus;
};

export type ShareTargetRoom = {
  memberCountLabel: string;
  name: string;
  roleLabel: string;
};

export type ResourceShareApprovalPanelProps = {
  auditItems?: ShareAuditItem[];
  className?: string;
  onApproveShare?: () => void;
  onCancel?: () => void;
  onOpenResource?: () => void;
  onSelectRoom?: () => void;
  readiness?: ShareReadiness;
  resourceTitle?: string;
  targetRoom?: ShareTargetRoom;
};

const readinessCopyKey: Record<ShareReadiness, MessageKey> = {
  ALREADY_SHARED: "resources.share2.readyAlreadyShared",
  NEEDS_ROOM: "resources.share2.readyNeedsRoom",
  NO_PERMISSION: "resources.share2.readyNoPermission",
  READY: "resources.share2.readyReady",
};

const readinessTone: Record<ShareReadiness, StatusTone> = {
  ALREADY_SHARED: "approved",
  NEEDS_ROOM: "pending",
  NO_PERMISSION: "warning",
  READY: "room",
};

const auditStatusCopyKey: Record<ShareAuditStatus, MessageKey> = {
  BLOCKED: "resources.share2.auditBlocked",
  PASSED: "resources.share2.auditPassed",
  PENDING: "resources.share2.auditPending",
};

const auditStatusTone: Record<ShareAuditStatus, StatusTone> = {
  BLOCKED: "warning",
  PASSED: "approved",
  PENDING: "pending",
};

type TranslateFn = (key: MessageKey) => string;

function buildDefaultTargetRoom(t: TranslateFn): ShareTargetRoom {
  return {
    memberCountLabel: t("resources.share2.defaultRoomMembers"),
    name: t("resources.share2.defaultRoomName"),
    roleLabel: t("resources.share2.roleLeader"),
  };
}

function buildDefaultAuditItems(t: TranslateFn): ShareAuditItem[] {
  return [
    {
      description: t("resources.share2.auditPersonalDesc"),
      id: "personal-visibility",
      label: t("resources.share2.auditPersonalLabel"),
      status: "PASSED",
    },
    {
      description: t("resources.share2.auditRoomDesc"),
      id: "room-member",
      label: t("resources.share2.auditRoomLabel"),
      status: "PASSED",
    },
    {
      description: t("resources.share2.auditEventDesc"),
      id: "share-event",
      label: t("resources.share2.auditEventLabel"),
      status: "PENDING",
    },
    {
      description: t("resources.share2.auditAgentDesc"),
      id: "agent-scope",
      label: t("resources.share2.auditAgentLabel"),
      status: "PENDING",
    },
  ];
}

export function ResourceShareApprovalPanel({
  auditItems,
  className,
  onApproveShare,
  onCancel,
  onOpenResource,
  onSelectRoom,
  readiness = "READY",
  resourceTitle,
  targetRoom,
}: ResourceShareApprovalPanelProps) {
  const { t } = useI18n();
  const resolvedAuditItems = auditItems ?? buildDefaultAuditItems(t);
  const resolvedResourceTitle = resourceTitle ?? t("resources.share2.defaultResourceTitle");
  const resolvedTargetRoom = targetRoom ?? buildDefaultTargetRoom(t);
  const blocked = readiness === "NO_PERMISSION" || resolvedAuditItems.some((item) => item.status === "BLOCKED");
  const needsRoom = readiness === "NEEDS_ROOM";
  const alreadyShared = readiness === "ALREADY_SHARED";

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<ShieldCheck size={14} />}>{t("resources.share2.chip")}</Chip>
          <h2>{t("resources.share2.title")}</h2>
          <p>{t("resources.share2.desc")}</p>
        </div>
        <StatusBadge tone={readinessTone[readiness]}>{t(readinessCopyKey[readiness])}</StatusBadge>
      </header>

      <section className={styles.flowCards} aria-label={t("resources.share2.flowAria")}>
        <article className={styles.flowCard}>
          <span className={styles.flowIcon} aria-hidden="true">
            <FolderLock size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>{t("resources.share2.currentState")}</span>
            <strong>{t("resources.share2.currentPersonal")}</strong>
            <p>{resolvedResourceTitle}</p>
          </div>
          <Button icon={<FileText size={15} />} onClick={onOpenResource} size="sm" variant="ghost">
            {t("resources.share2.openResource")}
          </Button>
        </article>

        <span className={styles.flowArrow} aria-hidden="true">
          <ArrowRight size={20} strokeWidth={2.2} />
        </span>

        <article className={cn(styles.flowCard, styles.roomCard)}>
          <span className={styles.flowIcon} aria-hidden="true">
            <UsersRound size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>{t("resources.share2.shareTarget")}</span>
            <strong>{resolvedTargetRoom.name}</strong>
            <p>
              {resolvedTargetRoom.roleLabel} · {resolvedTargetRoom.memberCountLabel}
            </p>
          </div>
          <Button icon={<UserCheck size={15} />} onClick={onSelectRoom} size="sm" variant="quiet">
            {t("resources.share2.changeTarget")}
          </Button>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.auditPanel} aria-label={t("resources.share2.auditAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <CheckCircle2 size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.share2.auditTitle")}</h3>
              <p>{t("resources.share2.auditDesc")}</p>
            </div>
          </div>

          <ul className={styles.auditList}>
            {resolvedAuditItems.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
                <StatusBadge tone={auditStatusTone[item.status]}>{t(auditStatusCopyKey[item.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.policyPanel} aria-label={t("resources.share2.policyAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <History size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.share2.policyTitle")}</h3>
              <p>{t("resources.share2.policyDesc")}</p>
            </div>
          </div>

          <div className={styles.policyStack}>
            <article>
              <UsersRound size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.share2.policyBoardTitle")}</strong>
                <p>{t("resources.share2.policyBoardDesc")}</p>
              </div>
            </article>
            <article>
              <Bot size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.share2.policyAgentTitle")}</strong>
                <p>{t("resources.share2.policyAgentDesc")}</p>
              </div>
            </article>
            <article>
              <Info size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.share2.policyHistoryTitle")}</strong>
                <p>{t("resources.share2.policyHistoryDesc")}</p>
              </div>
            </article>
          </div>

          <div className={styles.actions}>
            <Button onClick={onCancel} size="sm" variant="ghost">
              {t("resources.share2.cancel")}
            </Button>
            <Button
              disabled={blocked || needsRoom || alreadyShared}
              icon={<UsersRound size={15} />}
              onClick={onApproveShare}
              size="sm"
              variant="primary"
            >
              {t("resources.share2.approve")}
            </Button>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
