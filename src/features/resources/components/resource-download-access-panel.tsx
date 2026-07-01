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
import { useI18n, type MessageKey } from "@/lib/i18n";
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

const accessCopy: Record<DownloadAccessStatus, MessageKey> = {
  CHECKING: "resources.download.access.CHECKING",
  DENIED: "resources.download.access.DENIED",
  EXPIRED: "resources.download.access.EXPIRED",
  READY: "resources.download.access.READY",
};

const accessTone: Record<DownloadAccessStatus, StatusTone> = {
  CHECKING: "pending",
  DENIED: "warning",
  EXPIRED: "pending",
  READY: "approved",
};

const checkStatusCopy: Record<DownloadCheckStatus, MessageKey> = {
  BLOCKED: "resources.download.checkStatus.BLOCKED",
  PASSED: "resources.download.checkStatus.PASSED",
  PENDING: "resources.download.checkStatus.PENDING",
};

const checkStatusTone: Record<DownloadCheckStatus, StatusTone> = {
  BLOCKED: "warning",
  PASSED: "approved",
  PENDING: "pending",
};

const defaultFile: DownloadFileMeta = {
  checksumLabel: "파일 지문 확인됨",
  fileName: "번역계약서_v2.pdf",
  mimeLabel: "PDF",
  sizeLabel: "2.4 MB",
  updatedLabel: "2026-06-18 15:20",
};

const defaultChecks: DownloadCheckItem[] = [
  {
    description: "로그인한 사용자인지 확인합니다.",
    id: "auth",
    label: "회원 인증",
    status: "PASSED",
  },
  {
    description: "개인 자료는 올린 사람 기준, 프로젝트룸 자료는 멤버 권한 기준으로 확인합니다.",
    id: "resource-scope",
    label: "자료 접근 권한",
    status: "PASSED",
  },
  {
    description: "파일 저장소 경로가 아니라 서버 권한 기준으로 다운로드 주소를 발급합니다.",
    id: "download-url",
    label: "다운로드 주소 발급",
    status: "PASSED",
  },
];

export function ResourceDownloadAccessPanel({
  accessScope = "ROOM_SHARED",
  checks = defaultChecks,
  className,
  expiresLabel = "10분 뒤 만료",
  file = defaultFile,
  onDownload,
  onRefreshUrl,
  status = "READY",
}: ResourceDownloadAccessPanelProps) {
  const { t } = useI18n();
  const ScopeIcon = accessScope === "ROOM_SHARED" ? UsersRound : FolderLock;
  const blocked = status === "DENIED" || checks.some((check) => check.status === "BLOCKED");
  const needsRefresh = status === "EXPIRED";

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Download size={14} />}>{t("resources.download.chip")}</Chip>
          <h2>{t("resources.download.title")}</h2>
          <p>{t("resources.download.description")}</p>
        </div>
        <StatusBadge tone={accessTone[status]}>{t(accessCopy[status])}</StatusBadge>
      </header>

      <section className={styles.fileCard} aria-label={t("resources.download.fileAria")}>
        <span className={styles.fileIcon} aria-hidden="true">
          <FileText size={21} strokeWidth={2.1} />
        </span>
        <div className={styles.fileText}>
          <span>{accessScope === "ROOM_SHARED" ? t("resources.download.scopeRoom") : t("resources.download.scopePersonal")}</span>
          <strong>{file.fileName}</strong>
          <p>
            {file.mimeLabel} · {file.sizeLabel} · {file.updatedLabel}
          </p>
        </div>
        <Button icon={<FileCheck2 size={15} />} onClick={onRefreshUrl} size="sm" variant="quiet">
          {t("resources.download.recheck")}
        </Button>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.checkPanel} aria-label={t("resources.download.checkAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.download.checkHeading")}</h3>
              <p>{t("resources.download.checkDesc")}</p>
            </div>
          </div>

          <ul className={styles.checkList}>
            {checks.map((check) => (
              <li key={check.id}>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.description}</p>
                </div>
                <StatusBadge tone={checkStatusTone[check.status]}>{t(checkStatusCopy[check.status])}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.policyPanel} aria-label={t("resources.download.policyAria")}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <ScopeIcon size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.download.policyHeading")}</h3>
              <p>{t("resources.download.policyDesc")}</p>
            </div>
          </div>

          <div className={styles.policyStack}>
            <article>
              <KeyRound size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.download.policyShortTitle")}</strong>
                <p>{t("resources.download.policyShortDesc", { expires: expiresLabel })}</p>
              </div>
            </article>
            <article>
              <FileArchive size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.download.policyMetaTitle")}</strong>
                <p>{t("resources.download.policyMetaDesc", { checksum: file.checksumLabel })}</p>
              </div>
            </article>
            <article>
              <UserX size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.download.policyNonMemberTitle")}</strong>
                <p>{t("resources.download.policyNonMemberDesc")}</p>
              </div>
            </article>
          </div>

          <div className={styles.actions}>
            {needsRefresh ? (
              <Button icon={<Clock3 size={15} />} onClick={onRefreshUrl} size="sm" variant="quiet">
                {t("resources.download.refreshUrl")}
              </Button>
            ) : null}
            <Button disabled={blocked || needsRefresh} icon={<Download size={15} />} onClick={onDownload} size="sm" variant="primary">
              {t("resources.board.download")}
            </Button>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
