"use client";

import {
  CheckCircle2,
  Clock3,
  Database,
  Download,
  HardDrive,
  LockKeyhole,
  ShieldAlert,
  Trash2,
  UserRoundX,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./data-deletion-request-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type DeletionScope = "SERVER_PERSONAL" | "LOCAL_TAURI" | "ROOM_PARTICIPATION" | "ACCOUNT_CLOSE";
type DeletionStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";

type DeletionOption = {
  descriptionKey: MessageKey;
  effectKey: MessageKey;
  scope: DeletionScope;
  status: DeletionStatus;
  titleKey: MessageKey;
};

type DeletionCheck = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  tone: StatusTone;
};

export type DataDeletionRequestPanelProps = HTMLAttributes<HTMLElement> & {
  checks: DeletionCheck[];
  options: DeletionOption[];
  title?: string;
};

const scopeIcons: Record<DeletionScope, typeof Database> = {
  ACCOUNT_CLOSE: UserRoundX,
  LOCAL_TAURI: HardDrive,
  ROOM_PARTICIPATION: LockKeyhole,
  SERVER_PERSONAL: Database,
};

const statusMeta: Record<DeletionStatus, { actionKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  BLOCKED: { actionKey: "settings.ddr.status.blocked.action", labelKey: "settings.ddr.status.blocked.label", tone: "warning" },
  NEEDS_REVIEW: { actionKey: "settings.ddr.status.review.action", labelKey: "settings.ddr.status.review.label", tone: "pending" },
  READY: { actionKey: "settings.ddr.status.ready.action", labelKey: "settings.ddr.status.ready.label", tone: "approved" },
};

export const defaultDeletionOptions: DeletionOption[] = [
  {
    descriptionKey: "settings.ddr.opt.server.desc",
    effectKey: "settings.ddr.opt.server.effect",
    scope: "SERVER_PERSONAL",
    status: "READY",
    titleKey: "settings.ddr.opt.server.title",
  },
  {
    descriptionKey: "settings.ddr.opt.local.desc",
    effectKey: "settings.ddr.opt.local.effect",
    scope: "LOCAL_TAURI",
    status: "READY",
    titleKey: "settings.ddr.opt.local.title",
  },
  {
    descriptionKey: "settings.ddr.opt.room.desc",
    effectKey: "settings.ddr.opt.room.effect",
    scope: "ROOM_PARTICIPATION",
    status: "NEEDS_REVIEW",
    titleKey: "settings.ddr.opt.room.title",
  },
  {
    descriptionKey: "settings.ddr.opt.account.desc",
    effectKey: "settings.ddr.opt.account.effect",
    scope: "ACCOUNT_CLOSE",
    status: "BLOCKED",
    titleKey: "settings.ddr.opt.account.title",
  },
];

export const defaultDeletionChecks: DeletionCheck[] = [
  {
    descriptionKey: "settings.ddr.check.collab.desc",
    labelKey: "settings.ddr.check.collab.label",
    tone: "room",
  },
  {
    descriptionKey: "settings.ddr.check.local.desc",
    labelKey: "settings.ddr.check.local.label",
    tone: "personal",
  },
  {
    descriptionKey: "settings.ddr.check.recovery.desc",
    labelKey: "settings.ddr.check.recovery.label",
    tone: "approved",
  },
];

export function DataDeletionRequestPanel({
  checks,
  className,
  options,
  title,
  ...props
}: DataDeletionRequestPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("settings.ddr.title");
  const readyCount = options.filter((option) => option.status === "READY").length;
  const reviewCount = options.filter((option) => option.status !== "READY").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ShieldAlert size={16} strokeWidth={2.1} />}>{t("settings.ddr.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("settings.ddr.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("settings.ddr.readyCount")}</span>
          <strong>{t("settings.ddr.countUnit", { count: readyCount })}</strong>
          <StatusBadge tone={reviewCount > 0 ? "warning" : "success"}>{t("settings.ddr.reviewCount", { count: reviewCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.noticeRow} aria-label={t("settings.ddr.beforeAria")}>
        <article className={styles.noticeCard}>
          <span className={styles.iconTile}>
            <Download size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("settings.ddr.exportTitle")}</strong>
            <p>{t("settings.ddr.exportBody")}</p>
          </div>
        </article>
        <article className={styles.noticeCard}>
          <span className={styles.iconTile}>
            <Clock3 size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("settings.ddr.statusTitle")}</strong>
            <p>{t("settings.ddr.statusBody")}</p>
          </div>
        </article>
      </section>

      <section className={styles.optionGrid} aria-label={t("settings.ddr.optionAria")}>
        {options.map((option) => {
          const ScopeIcon = scopeIcons[option.scope];
          const status = statusMeta[option.status];
          const blocked = option.status === "BLOCKED";

          return (
            <article className={cn(styles.optionCard, blocked && styles.blockedCard)} key={option.scope}>
              <div className={styles.optionTop}>
                <span className={styles.iconTile}>
                  <ScopeIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.optionTitle}>
                  <strong>{t(option.titleKey)}</strong>
                  <span>{t(option.effectKey)}</span>
                </div>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              </div>
              <p>{t(option.descriptionKey)}</p>
              <footer className={styles.optionFooter}>
                <span>{option.scope.toLowerCase()}</span>
                <Button disabled={blocked} icon={<Trash2 size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
                  {t(status.actionKey)}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.checkGrid} aria-label={t("settings.ddr.checkAria")}>
        {checks.map((check) => (
          <article key={check.labelKey}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={check.tone}>{t(check.labelKey)}</StatusBadge>
              <p>{t(check.descriptionKey)}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
