"use client";

import {
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  FolderLock,
  KeyRound,
  ShieldCheck,
  UserX,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-download-access-panel.module.css";

export type DownloadAccessScope = "PERSONAL" | "ROOM_SHARED";
export type DownloadAccessStatus = "READY" | "CHECKING" | "DENIED" | "EXPIRED";
export type DownloadCheckStatus = "PASSED" | "PENDING" | "BLOCKED";

export type DownloadCheckItem = {
  description: string;
  id: string;
  label: string;
  status: DownloadCheckStatus;
};

export type DownloadFileMeta = {
  checksumLabel: string;
  fileName: string;
  mimeLabel: string;
  sizeLabel: string;
  updatedLabel: string;
};

export type ResourceDownloadAccessPanelProps = {
  accessScope?: DownloadAccessScope;
  checks?: DownloadCheckItem[];
  className?: string;
  expiresLabel?: string;
  file?: DownloadFileMeta;
  onDownload?: () => void;
  onRefreshUrl?: () => void;
  status?: DownloadAccessStatus;
};

const accessCopyKey: Record<DownloadAccessStatus, MessageKey> = {
  CHECKING: "resources.access.dl.statusChecking",
  DENIED: "resources.access.dl.statusDenied",
  EXPIRED: "resources.access.dl.statusExpired",
  READY: "resources.access.dl.statusReady",
};

const accessTone: Record<DownloadAccessStatus, StatusTone> = {
  CHECKING: "pending",
  DENIED: "warning",
  EXPIRED: "pending",
  READY: "approved",
};

const checkStatusCopyKey: Record<DownloadCheckStatus, MessageKey> = {
  BLOCKED: "resources.access.dl.checkBlocked",
  PASSED: "resources.access.dl.checkPassed",
  PENDING: "resources.access.dl.checkPending",
};

const checkStatusTone: Record<DownloadCheckStatus, StatusTone> = {
  BLOCKED: "warning",
  PASSED: "approved",
  PENDING: "pending",
};

type TranslateFn = (key: MessageKey) => string;

function buildDefaultFile(t: TranslateFn): DownloadFileMeta {
  return {
    checksumLabel: t("resources.access.dl.defaultChecksum"),
    fileName: t("resources.access.dl.defaultFileName"),
    mimeLabel: "PDF",
    sizeLabel: "2.4 MB",
    updatedLabel: "2026-06-18 15:20",
  };
}

function buildDefaultChecks(t: TranslateFn): DownloadCheckItem[] {
  return [
    {
      description: t("resources.access.dl.checkAuthDesc"),
      id: "auth",
      label: t("resources.access.dl.checkAuthLabel"),
      status: "PASSED",
    },
    {
      description: t("resources.access.dl.checkScopeDesc"),
      id: "resource-scope",
      label: t("resources.access.dl.checkScopeLabel"),
      status: "PASSED",
    },
    {
      description: t("resources.access.dl.checkUrlDesc"),
      id: "download-url",
      label: t("resources.access.dl.checkUrlLabel"),
      status: "PASSED",
    },
  ];
}

export function ResourceDownloadAccessPanel({
  accessScope = "ROOM_SHARED",
  checks,
  className,
  expiresLabel,
  file,
  onDownload,
  onRefreshUrl,
  status = "READY",
}: ResourceDownloadAccessPanelProps) {
  const { t } = useI18n();
  const resolvedChecks = checks ?? buildDefaultChecks(t);
  const resolvedFile = file ?? buildDefaultFile(t);
  const resolvedExpiresLabel = expiresLabel ?? t("resources.access.dl.expiresLabel");
  const ScopeIcon = accessScope === "ROOM_SHARED" ? UsersRound : FolderLock;
  const blocked = status === "DENIED" || resolvedChecks.some((check) => check.status === "BLOCKED");
  const needsRefresh = status === "EXPIRED";

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Download size={14} />}>{t("resources.access.dl.chip")}</Chip>
          <h2>{t("resources.access.dl.title")}</h2>
          <p>{t("resources.access.dl.desc")}</p>
        </div>
        <StatusBadge tone={accessTone[status]}>{t(accessCopyKey[status])}</StatusBadge>
      </header>

      <section className={styles.fileCard} aria-label={t("resources.access.dl.fileAria")}>
        <span className={styles.fileIcon} aria-hidden="true">
          <FileText size={21} strokeWidth={2.1} />
        </span>
        <div className={styles.fileText}>
          <span>{accessScope === "ROOM_SHARED" ? t("resources.access.dl.scopeRoom") : t("resources.access.dl.scopePersonal")}</span>
          <strong>{resolvedFile.fileName}</strong>
          <p>
            {resolvedFile.mimeLabel} · {resolvedFile.sizeLabel} · {resolvedFile.updatedLabel}
          </p>
        </div>
        <Button icon={<FileCheck2 size={15} />} onClick={onRefreshUrl} size="sm" variant="quiet">
          {t("resources.access.dl.recheck")}
        </Button>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.checkPanel} aria-label={t("resources.access.dl.checkPanelAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.access.dl.preCheckTitle")}</h3>
              <p>{t("resources.access.dl.preCheckDesc")}</p>
            </div>
          </div>

          <ul className={styles.checkList}>
            {resolvedChecks.map((check) => (
              <li key={check.id}>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.description}</p>
                </div>
                <StatusBadge tone={checkStatusTone[check.status]}>{t(checkStatusCopyKey[check.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.policyPanel} aria-label={t("resources.access.dl.securityAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <ScopeIcon size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.access.dl.accessTitle")}</h3>
              <p>{t("resources.access.dl.accessDesc")}</p>
            </div>
          </div>

          <div className={styles.policyStack}>
            <article>
              <KeyRound size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.access.dl.shortUrlTitle")}</strong>
                <p>{t("resources.access.dl.shortUrlDesc", { expires: resolvedExpiresLabel })}</p>
              </div>
            </article>
            <article>
              <FileArchive size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.access.dl.metaTitle")}</strong>
                <p>{t("resources.access.dl.metaDesc", { checksum: resolvedFile.checksumLabel })}</p>
              </div>
            </article>
            <article>
              <UserX size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.access.dl.nonMemberTitle")}</strong>
                <p>{t("resources.access.dl.nonMemberDesc")}</p>
              </div>
            </article>
          </div>

          <div className={styles.actions}>
            {needsRefresh ? (
              <Button icon={<Clock3 size={15} />} onClick={onRefreshUrl} size="sm" variant="quiet">
                {t("resources.access.dl.refreshUrl")}
              </Button>
            ) : null}
            <Button disabled={blocked || needsRefresh} icon={<Download size={15} />} onClick={onDownload} size="sm" variant="primary">
              {t("resources.access.dl.download")}
            </Button>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
