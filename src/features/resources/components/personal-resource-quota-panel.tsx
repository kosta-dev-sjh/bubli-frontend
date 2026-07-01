"use client";

import { AlertTriangle, Archive, Cloud, Database, FolderSync, HardDrive, Search, ShieldCheck } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./personal-resource-quota-panel.module.css";

type LocalFileStatus = "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "STORAGE_LIMIT_EXCEEDED";

type StorageUsage = {
  limitLabel: string;
  percent: number;
  remainingLabel: string;
  usedLabel: string;
};

type LocalFileItem = {
  filename: string;
  pathLabel: string;
  sizeLabel: string;
  status: LocalFileStatus;
};

type QuotaRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type PersonalResourceQuotaPanelProps = HTMLAttributes<HTMLElement> & {
  files: LocalFileItem[];
  rules: QuotaRule[];
  title?: string;
  usage: StorageUsage;
};

const statusMeta: Record<LocalFileStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  LOCAL_ONLY: { labelKey: "resources.quota.status.LOCAL_ONLY", tone: "personal" },
  STORAGE_LIMIT_EXCEEDED: { labelKey: "resources.quota.status.STORAGE_LIMIT_EXCEEDED", tone: "warning" },
  SYNC_PENDING: { labelKey: "resources.quota.status.SYNC_PENDING", tone: "pending" },
  SYNCED: { labelKey: "resources.quota.status.SYNCED", tone: "success" },
};

export const defaultStorageUsage: StorageUsage = {
  limitLabel: "1GB",
  percent: 82,
  remainingLabel: "180MB 남음",
  usedLabel: "820MB 사용",
};

export const defaultQuotaFiles: LocalFileItem[] = [
  {
    filename: "자료보드_화면설계.md",
    pathLabel: "개인 관리 폴더",
    sizeLabel: "2.4MB",
    status: "SYNCED",
  },
  {
    filename: "회의록_검토메모.txt",
    pathLabel: "로컬 색인",
    sizeLabel: "880KB",
    status: "LOCAL_ONLY",
  },
  {
    filename: "번역계약서_참고자료.zip",
    pathLabel: "서버 반영 대기",
    sizeLabel: "120MB",
    status: "SYNC_PENDING",
  },
  {
    filename: "레퍼런스_전체_압축본.zip",
    pathLabel: "서버 반영 차단",
    sizeLabel: "260MB",
    status: "STORAGE_LIMIT_EXCEEDED",
  },
];

export const defaultQuotaRules: QuotaRule[] = [
  {
    description: "사용자가 지정한 폴더만 색인하고, 서버 전송 전에도 파일명 검색과 변경 확인은 가능합니다.",
    label: "로컬 색인 유지",
    tone: "personal",
  },
  {
    description: "용량 안에 있는 파일만 서버 개인 자료함에 반영합니다.",
    label: "서버 반영 제한",
    tone: "todo",
  },
  {
    description: "개인 자료함에 올라온 뒤에도 프로젝트룸 자료가 되려면 별도 공유 승인이 필요합니다.",
    label: "공유 승인 분리",
    tone: "room",
  },
];

export function PersonalResourceQuotaPanel({
  className,
  files,
  rules,
  title,
  usage,
  ...props
}: PersonalResourceQuotaPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.quota.defaultTitle");
  const overLimitCount = files.filter((file) => file.status === "STORAGE_LIMIT_EXCEEDED").length;
  const pendingCount = files.filter((file) => file.status === "SYNC_PENDING").length;
  const usageTone: StatusTone = usage.percent >= 90 ? "warning" : usage.percent >= 75 ? "pending" : "success";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<HardDrive size={16} strokeWidth={2.1} />}>{t("resources.quota.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.quota.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.quota.summaryLabel")}</span>
          <strong>{usage.limitLabel}</strong>
          <StatusBadge tone={usageTone}>{usage.percent}%</StatusBadge>
        </div>
      </header>

      <section className={styles.usageGrid} aria-label={t("resources.quota.usageAria")}>
        <article className={styles.usageCard}>
          <div className={styles.usageTop}>
            <span className={styles.usageIcon}>
              <Archive size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{usage.usedLabel}</strong>
              <p>{usage.remainingLabel}</p>
            </div>
            <StatusBadge tone={usageTone}>{usage.percent}%</StatusBadge>
          </div>
          <ProgressBar className={cn(styles.progress, usageTone === "warning" && styles.progressWarning)} value={usage.percent} />
          <div className={styles.usageMeta}>
            <span>{t("resources.quota.usageMetaLabel")}</span>
            <b>{usage.limitLabel}</b>
          </div>
        </article>

        <article className={styles.warningCard}>
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.quota.overLimitTitle", { count: overLimitCount })}</strong>
            <p>{t("resources.quota.overLimitDesc")}</p>
          </div>
        </article>

        <article className={styles.pendingCard}>
          <FolderSync size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.quota.pendingTitle", { count: pendingCount })}</strong>
            <p>{t("resources.quota.pendingDesc")}</p>
          </div>
        </article>
      </section>

      <section className={styles.fileGrid} aria-label={t("resources.quota.fileAria")}>
        <div className={styles.fileHeader}>
          <div>
            <strong>{t("resources.quota.fileListTitle")}</strong>
            <p>{t("resources.quota.fileListDesc")}</p>
          </div>
          <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("resources.quota.findLocal")}
          </Button>
        </div>
        <div className={styles.fileStack}>
          {files.map((file) => {
            const status = statusMeta[file.status];

            return (
              <article className={cn(styles.fileRow, file.status === "STORAGE_LIMIT_EXCEEDED" && styles.blocked)} key={file.filename}>
                <span className={styles.fileIcon}>
                  <Database size={16} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.fileCopy}>
                  <b>{file.filename}</b>
                  <span>{file.pathLabel}</span>
                </span>
                <span className={styles.fileSize}>{file.sizeLabel}</span>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label={t("resources.quota.ruleAria")}>
        {rules.map((rule) => (
          <article key={rule.label}>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
              <StatusBadge tone={rule.tone}>{t("resources.quota.rulePolicy")}</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Button icon={<Cloud size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("resources.quota.footerConfirm")}
        </Button>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("resources.quota.footerShare")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
