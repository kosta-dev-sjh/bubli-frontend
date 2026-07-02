import { CalendarClock, CheckCircle2, DoorOpen, UserPlus, UsersRound, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./project-room-invitation-response-panel.module.css";

type InvitationStatus = "pending" | "accepted" | "expired" | "canceled";

type InvitationAccess = {
  label: string;
  description: string;
};

export type ProjectRoomInvitationResponsePanelProps = HTMLAttributes<HTMLElement> & {
  accessPreview: InvitationAccess[];
  expiresLabel: string;
  inviterName: string;
  projectRoomName: string;
  roleLabel: "프로젝트 리더" | "멤버";
  status: InvitationStatus;
  title?: string;
};

const invitationMeta: { icon: ReactNode; labelKey: MessageKey; tone: StatusTone } = {
  icon: <UserPlus size={18} strokeWidth={2.1} />,
  labelKey: "room.invitation.method",
  tone: "personal",
};

const statusMetaKey: Record<InvitationStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  pending: { labelKey: "room.invitation.statusPending", tone: "pending" },
  accepted: { labelKey: "room.invitation.statusAccepted", tone: "success" },
  expired: { labelKey: "room.invitation.statusExpired", tone: "warning" },
  canceled: { labelKey: "room.invitation.statusCanceled", tone: "neutral" },
};

export function ProjectRoomInvitationResponsePanel({
  accessPreview,
  className,
  expiresLabel,
  inviterName,
  projectRoomName,
  roleLabel,
  status,
  title,
  ...props
}: ProjectRoomInvitationResponsePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("room.invitation.defaultTitle");
  const currentStatus = statusMetaKey[status];
  const invitationLabel = t(invitationMeta.labelKey);
  const canRespond = status === "pending";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={invitationMeta.icon}>{invitationLabel}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("room.invitation.description")}</p>
          </div>
        </div>
        <div className={styles.statusCard}>
          <span>{t("room.invitation.statusLabel")}</span>
          <strong>{t(currentStatus.labelKey)}</strong>
          <StatusBadge tone={currentStatus.tone}>{t(currentStatus.labelKey)}</StatusBadge>
        </div>
      </header>

      <section className={styles.inviteCard} aria-label={t("room.invitation.infoAria")}>
        <div className={styles.roomIntro}>
          <span className={styles.roomIcon} aria-hidden="true">
            <DoorOpen size={22} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{projectRoomName}</h3>
            <p>{t("room.invitation.invitedBy", { name: inviterName })}</p>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <article>
            <UsersRound size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>{t("room.invitation.roleLabel")}</span>
            <strong>{roleLabel}</strong>
          </article>
          <article>
            <CalendarClock size={16} strokeWidth={2.1} aria-hidden="true" />
            <span>{t("room.invitation.expiresLabel")}</span>
            <strong>{expiresLabel}</strong>
          </article>
          <article>
            {invitationMeta.icon}
            <span>{t("room.invitation.methodLabel")}</span>
            <strong>{invitationLabel}</strong>
          </article>
        </div>

        <div className={styles.accessGrid} aria-label={t("room.invitation.accessAria")}>
          {accessPreview.map((item) => (
            <article className={styles.accessCard} key={item.label}>
              <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.actions} aria-label={t("room.invitation.responseAria")}>
          <Button disabled={!canRespond} icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            {t("room.invitation.accept")}
          </Button>
          <Button disabled={!canRespond} icon={<XCircle size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            {t("room.invitation.decline")}
          </Button>
        </div>
      </section>
    </GlassPanel>
  );
}
