"use client";

import type { ReactNode } from "react";

import {
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./project-room-invite-flow.module.css";

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

type InviteMethod = {
  apiKey: MessageKey;
  descriptionKey: MessageKey;
  expiryKey: MessageKey;
  icon: ReactNode;
  id: string;
  scopeKeys: MessageKey[];
  status: InviteStatus;
  titleKey: MessageKey;
};

const methods: InviteMethod[] = [
  {
    apiKey: "room.inviteFlow.method1Api",
    descriptionKey: "room.inviteFlow.method1Description",
    expiryKey: "room.inviteFlow.method1Expiry",
    icon: <UsersRound size={18} strokeWidth={2.1} />,
    id: "friend-invite",
    scopeKeys: ["room.inviteFlow.method1Scope1", "room.inviteFlow.method1Scope2", "room.inviteFlow.method1Scope3"],
    status: "PENDING",
    titleKey: "room.inviteFlow.method1Title",
  },
];

const statusMetaKey: Record<InviteStatus, { labelKey: MessageKey; tone: "pending" | "success" | "warning" }> = {
  ACCEPTED: { labelKey: "room.inviteFlow.statusAccepted", tone: "success" },
  EXPIRED: { labelKey: "room.inviteFlow.statusExpired", tone: "warning" },
  PENDING: { labelKey: "room.inviteFlow.statusPending", tone: "pending" },
};

function InviteMethodCard({ method }: { method: InviteMethod }) {
  const { t } = useI18n();
  const status = statusMetaKey[method.status];

  return (
    <article className={styles.methodCard}>
      <div className={styles.methodHead}>
        <span className="bubli-icon-tile" aria-hidden="true">
          {method.icon}
        </span>
        <div>
          <div className={styles.meta}>
            <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            <span>{t(method.expiryKey)}</span>
          </div>
          <h3>{t(method.titleKey)}</h3>
          <p>{t(method.descriptionKey)}</p>
        </div>
      </div>
      <div className={styles.methodApi}>{t(method.apiKey)}</div>
      <div className={styles.scopeList}>
        {method.scopeKeys.map((scopeKey) => (
          <Chip key={scopeKey}>{t(scopeKey)}</Chip>
        ))}
      </div>
    </article>
  );
}

export function ProjectRoomInviteFlow() {
  const { t } = useI18n();
  return (
    <section className={styles.panel} aria-label={t("room.inviteFlow.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<UserPlus size={14} />} selected>
            {t("room.inviteFlow.chip")}
          </Chip>
          <h2>{t("room.inviteFlow.heading")}</h2>
          <p>{t("room.inviteFlow.description")}</p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="room">{t("room.inviteFlow.leaderBadge")}</StatusBadge>
          <strong>1</strong>
          <span>{t("room.inviteFlow.methodCount")}</span>
        </div>
      </GlassPanel>

      <div className={styles.methodGrid}>
        {methods.map((method) => (
          <InviteMethodCard key={method.id} method={method} />
        ))}
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.acceptPanel}>
          <h3>{t("room.inviteFlow.acceptTitle")}</h3>
          <div className={styles.timeline}>
            <article>
              <span aria-hidden="true">
                <KeyRound size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>{t("room.inviteFlow.step1Title")}</strong>
                <p>{t("room.inviteFlow.step1Body")}</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <UserCheck size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>{t("room.inviteFlow.step2Title")}</strong>
                <p>{t("room.inviteFlow.step2Body")}</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">
                <ShieldCheck size={16} strokeWidth={2.1} />
              </span>
              <div>
                <strong>{t("room.inviteFlow.step3Title")}</strong>
                <p>{t("room.inviteFlow.step3Body")}</p>
              </div>
            </article>
          </div>
        </GlassPanel>

        <GlassPanel className={styles.linkPanel}>
          <h3>{t("room.inviteFlow.limitTitle")}</h3>
          <p>{t("room.inviteFlow.limitBody")}</p>
          <div className={styles.linkAccess}>
            <Chip icon={<UsersRound size={14} />} selected>
              {t("room.inviteFlow.chipFriends")}
            </Chip>
            <Chip icon={<UserCheck size={14} />}>{t("room.inviteFlow.chipExisting")}</Chip>
            <Chip icon={<ShieldCheck size={14} />}>{t("room.inviteFlow.chipRecheck")}</Chip>
          </div>
          <Button icon={<UserPlus size={15} />} size="sm" variant="quiet">
            {t("room.inviteFlow.selectFriend")}
          </Button>
        </GlassPanel>
      </div>
    </section>
  );
}
