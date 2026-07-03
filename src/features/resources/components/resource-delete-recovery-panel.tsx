"use client";

import { Archive, FileWarning, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-delete-recovery-panel.module.css";

type DeleteRecoveryStatus = "deleteCandidate" | "archived" | "ready" | "blocked";
type DeleteRecoveryAction = "keep" | "archive" | "confirmDelete";

type DeleteRecoveryItem = {
  action: DeleteRecoveryAction;
  description: string;
  fileName: string;
  meta: string;
  status: DeleteRecoveryStatus;
};

export type ResourceDeleteRecoveryPanelProps = HTMLAttributes<HTMLElement> & {
  items: DeleteRecoveryItem[];
  pendingCount: number;
  title?: string;
};

const statusMeta: Record<DeleteRecoveryStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  deleteCandidate: { labelKey: "resources.delete.statusDeleteCandidate", tone: "warning" },
  archived: { labelKey: "resources.delete.statusArchived", tone: "neutral" },
  ready: { labelKey: "resources.delete.statusReady", tone: "success" },
  blocked: { labelKey: "resources.delete.statusBlocked", tone: "pending" },
};

const actionMeta: Record<DeleteRecoveryAction, { icon: ReactNode; labelKey: MessageKey }> = {
  keep: {
    icon: <Undo2 size={15} strokeWidth={2.1} />,
    labelKey: "resources.delete.actionKeep",
  },
  archive: {
    icon: <Archive size={15} strokeWidth={2.1} />,
    labelKey: "resources.delete.actionArchive",
  },
  confirmDelete: {
    icon: <Trash2 size={15} strokeWidth={2.1} />,
    labelKey: "resources.delete.actionConfirmDelete",
  },
};

export function ResourceDeleteRecoveryPanel({
  className,
  items,
  pendingCount,
  title,
  ...props
}: ResourceDeleteRecoveryPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.delete.defaultTitle");
  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileWarning size={14} strokeWidth={2.1} />}>{t("resources.delete.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.delete.description")}</p>
          </div>
        </div>
        <div className={styles.countCard}>
          <span>{t("resources.delete.countLabel")}</span>
          <strong>{t("resources.delete.countUnit", { count: pendingCount })}</strong>
        </div>
      </header>

      <section className={styles.ruleStrip} aria-label={t("resources.delete.ruleAria")}>
        <article>
          <span aria-hidden="true">
            <ShieldAlert size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.delete.ruleNoInstantTitle")}</h3>
            <p>{t("resources.delete.ruleNoInstantDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Undo2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.delete.ruleKeepTitle")}</h3>
            <p>{t("resources.delete.ruleKeepDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Archive size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.delete.ruleArchiveTitle")}</h3>
            <p>{t("resources.delete.ruleArchiveDesc")}</p>
          </div>
        </article>
      </section>

      <div className={styles.list} aria-label={t("resources.delete.listAria")}>
        {items.map((item) => {
          const status = statusMeta[item.status];
          const action = actionMeta[item.action];

          return (
            <article className={styles.item} key={`${item.fileName}-${item.meta}`}>
              <div className={styles.itemMain}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <FileWarning size={18} strokeWidth={2.1} />
                </span>
                <div className={styles.itemText}>
                  <h3>{item.fileName}</h3>
                  <p>{item.description}</p>
                  <span>{item.meta}</span>
                </div>
              </div>
              <div className={styles.itemSide}>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                <button className={styles.actionButton} type="button">
                  {action.icon}
                  {t(action.labelKey)}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <p>{t("resources.delete.footer")}</p>
      </footer>
    </GlassPanel>
  );
}
