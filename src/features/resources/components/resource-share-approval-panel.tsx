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
import { useI18n, type MessageKey } from "@/lib/i18n";
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
  roleLabel: "프로젝트 리더" | "멤버";
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

const readinessCopy: Record<ShareReadiness, MessageKey> = {
  ALREADY_SHARED: "resources.share.readiness.ALREADY_SHARED",
  NEEDS_ROOM: "resources.share.readiness.NEEDS_ROOM",
  NO_PERMISSION: "resources.share.readiness.NO_PERMISSION",
  READY: "resources.share.readiness.READY",
};

const readinessTone: Record<ShareReadiness, StatusTone> = {
  ALREADY_SHARED: "approved",
  NEEDS_ROOM: "pending",
  NO_PERMISSION: "warning",
  READY: "room",
};

const auditStatusCopy: Record<ShareAuditStatus, MessageKey> = {
  BLOCKED: "resources.share.auditStatus.BLOCKED",
  PASSED: "resources.share.auditStatus.PASSED",
  PENDING: "resources.share.auditStatus.PENDING",
};

const auditStatusTone: Record<ShareAuditStatus, StatusTone> = {
  BLOCKED: "warning",
  PASSED: "approved",
  PENDING: "pending",
};

const defaultTargetRoom: ShareTargetRoom = {
  memberCountLabel: "멤버 4명",
  name: "신축 홈페이지 리뉴얼",
  roleLabel: "프로젝트 리더",
};

const defaultAuditItems: ShareAuditItem[] = [
  {
    description: "현재 자료는 owner 기준으로만 보이는 개인 자료입니다.",
    id: "personal-visibility",
    label: "개인 자료 기준 확인",
    status: "PASSED",
  },
  {
    description: "선택한 프로젝트룸에 ACTIVE 멤버 권한이 있는지 확인합니다.",
    id: "room-member",
    label: "프로젝트룸 접근 권한",
    status: "PASSED",
  },
  {
    description: "공유 이력을 남기고 roomId 기준으로 프로젝트룸 자료에 연결합니다.",
    id: "share-event",
    label: "공유 이력 기록",
    status: "PENDING",
  },
  {
    description: "공유 뒤 프로젝트룸 에이전트가 자료 후보 생성에 사용할 수 있습니다.",
    id: "agent-scope",
    label: "에이전트 접근 범위",
    status: "PENDING",
  },
];

export function ResourceShareApprovalPanel({
  auditItems = defaultAuditItems,
  className,
  onApproveShare,
  onCancel,
  onOpenResource,
  onSelectRoom,
  readiness = "READY",
  resourceTitle = "개인_계약검토_메모.md",
  targetRoom = defaultTargetRoom,
}: ResourceShareApprovalPanelProps) {
  const { t } = useI18n();
  const blocked = readiness === "NO_PERMISSION" || auditItems.some((item) => item.status === "BLOCKED");
  const needsRoom = readiness === "NEEDS_ROOM";
  const alreadyShared = readiness === "ALREADY_SHARED";

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<ShieldCheck size={14} />}>{t("resources.share.chip")}</Chip>
          <h2>{t("resources.share.title")}</h2>
          <p>{t("resources.share.description")}</p>
        </div>
        <StatusBadge tone={readinessTone[readiness]}>{t(readinessCopy[readiness])}</StatusBadge>
      </header>

      <section className={styles.flowCards} aria-label={t("resources.share.flowAria")}>
        <article className={styles.flowCard}>
          <span className={styles.flowIcon} aria-hidden="true">
            <FolderLock size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>{t("resources.share.currentStateLabel")}</span>
            <strong>{t("resources.share.currentStateValue")}</strong>
            <p>{resourceTitle}</p>
          </div>
          <Button icon={<FileText size={15} />} onClick={onOpenResource} size="sm" variant="ghost">
            {t("resources.share.openResource")}
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
            <span>{t("resources.share.targetLabel")}</span>
            <strong>{targetRoom.name}</strong>
            <p>
              {targetRoom.roleLabel} · {targetRoom.memberCountLabel}
            </p>
          </div>
          <Button icon={<UserCheck size={15} />} onClick={onSelectRoom} size="sm" variant="quiet">
            {t("resources.share.changeTarget")}
          </Button>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.auditPanel} aria-label={t("resources.share.auditAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <CheckCircle2 size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.share.auditHeading")}</h3>
              <p>{t("resources.share.auditDesc")}</p>
            </div>
          </div>

          <ul className={styles.auditList}>
            {auditItems.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
                <StatusBadge tone={auditStatusTone[item.status]}>{t(auditStatusCopy[item.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.policyPanel} aria-label={t("resources.share.policyAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <History size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.share.policyHeading")}</h3>
              <p>{t("resources.share.policyDesc")}</p>
            </div>
          </div>

          <div className={styles.policyStack}>
            <article>
              <UsersRound size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.share.policyBoardTitle")}</strong>
                <p>{t("resources.share.policyBoardDesc")}</p>
              </div>
            </article>
            <article>
              <Bot size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.share.policyAgentTitle")}</strong>
                <p>{t("resources.share.policyAgentDesc")}</p>
              </div>
            </article>
            <article>
              <Info size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.share.policyHistoryTitle")}</strong>
                <p>{t("resources.share.policyHistoryDesc")}</p>
              </div>
            </article>
          </div>

          <div className={styles.actions}>
            <Button onClick={onCancel} size="sm" variant="ghost">
              {t("common.cancel")}
            </Button>
            <Button
              disabled={blocked || needsRoom || alreadyShared}
              icon={<UsersRound size={15} />}
              onClick={onApproveShare}
              size="sm"
              variant="primary"
            >
              {t("resources.share.approve")}
            </Button>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
