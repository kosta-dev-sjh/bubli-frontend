"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileMinus2,
  FilePenLine,
  FilePlus2,
  FolderClock,
  HardDrive,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./managed-folder-change-review.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ChangeKind = "created" | "updated" | "deleted" | "conflict" | "limit";
type ChangeStatus = "LOCAL_ONLY" | "SYNC_PENDING" | "DELETE_CANDIDATE" | "CONFLICT" | "STORAGE_LIMIT_EXCEEDED";

type LocalChange = {
  fileName: string;
  folderName: string;
  kind: ChangeKind;
  noteKey: MessageKey;
  status: ChangeStatus;
  updatedAtKey: MessageKey;
};

const changes: LocalChange[] = [
  {
    fileName: "회의록_0622.md",
    folderName: "Bubli/웹사이트 리뉴얼",
    kind: "created",
    noteKey: "folder.review.note.created",
    status: "SYNC_PENDING",
    updatedAtKey: "folder.review.time.justNow",
  },
  {
    fileName: "업무기준문서_v3.pdf",
    folderName: "Bubli/업무 기준 문서 정리",
    kind: "updated",
    noteKey: "folder.review.note.updated",
    status: "CONFLICT",
    updatedAtKey: "folder.review.time.min8",
  },
  {
    fileName: "이전_견적서.xlsx",
    folderName: "Bubli/정기 운영 업무",
    kind: "deleted",
    noteKey: "folder.review.note.deleted",
    status: "DELETE_CANDIDATE",
    updatedAtKey: "folder.review.time.min21",
  },
  {
    fileName: "디자인_참고_이미지.zip",
    folderName: "Bubli/브랜드 소개서",
    kind: "limit",
    noteKey: "folder.review.note.limit",
    status: "STORAGE_LIMIT_EXCEEDED",
    updatedAtKey: "folder.review.time.min36",
  },
];

const statusMeta: Record<ChangeStatus, { labelKey: MessageKey; tone: "pending" | "warning" | "personal" }> = {
  CONFLICT: { labelKey: "folder.status.conflict", tone: "warning" },
  DELETE_CANDIDATE: { labelKey: "folder.status.deleteCandidate", tone: "warning" },
  LOCAL_ONLY: { labelKey: "folder.status.localOnly", tone: "personal" },
  STORAGE_LIMIT_EXCEEDED: { labelKey: "folder.status.storageLimitExceeded", tone: "warning" },
  SYNC_PENDING: { labelKey: "folder.status.syncPending", tone: "pending" },
};

const kindIcon: Record<ChangeKind, React.ReactNode> = {
  conflict: <AlertTriangle size={17} strokeWidth={2.1} />,
  created: <FilePlus2 size={17} strokeWidth={2.1} />,
  deleted: <FileMinus2 size={17} strokeWidth={2.1} />,
  limit: <HardDrive size={17} strokeWidth={2.1} />,
  updated: <FilePenLine size={17} strokeWidth={2.1} />,
};

function ChangeRow({ item, t }: { item: LocalChange; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className={styles.changeRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {kindIcon[item.kind]}
      </span>
      <div className={styles.changeBody}>
        <div className={styles.changeMeta}>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(item.updatedAtKey)}</span>
          <span>{item.folderName}</span>
        </div>
        <h3>{item.fileName}</h3>
        <p>{t(item.noteKey)}</p>
      </div>
      <div className={styles.rowActions}>
        {item.status === "DELETE_CANDIDATE" ? (
          <>
            <Button icon={<RotateCcw size={14} />} size="sm" variant="quiet">
              {t("folder.review.actionRestore")}
            </Button>
            <Button icon={<CheckCircle2 size={14} />} size="sm" variant="primary">
              {t("folder.review.actionDeleteApply")}
            </Button>
          </>
        ) : null}
        {item.status === "CONFLICT" ? (
          <>
            <Button icon={<FilePenLine size={14} />} size="sm" variant="quiet">
              {t("folder.review.actionCompare")}
            </Button>
            <Button icon={<UploadCloud size={14} />} size="sm" variant="primary">
              {t("folder.review.actionSelectApply")}
            </Button>
          </>
        ) : null}
        {item.status === "SYNC_PENDING" ? (
          <Button icon={<UploadCloud size={14} />} size="sm" variant="primary">
            {t("folder.review.actionApply")}
          </Button>
        ) : null}
        {item.status === "STORAGE_LIMIT_EXCEEDED" ? (
          <Button icon={<HardDrive size={14} />} size="sm" variant="quiet">
            {t("folder.review.actionViewQuota")}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function ManagedFolderChangeReview() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("folder.review.aria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<FolderClock size={14} />} selected>
            {t("folder.review.chip")}
          </Chip>
          <h2>{t("folder.review.heroTitle")}</h2>
          <p>{t("folder.review.heroDesc")}</p>
        </div>
        <div className={styles.summary}>
          <strong>4</strong>
          <span>{t("folder.review.summaryLabel")}</span>
          <StatusBadge tone="personal">{t("folder.review.summaryBadge")}</StatusBadge>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label={t("folder.review.flowAria")}>
        <span>{t("folder.review.flowDetect")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("folder.review.flowCandidate")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("folder.review.flowConfirm")}</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>{t("folder.review.flowApply")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.listPanel}>
          <div className={styles.toolbar}>
            <div>
              <h3>{t("folder.review.detectedTitle")}</h3>
              <p>{t("folder.review.detectedDesc")}</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="quiet">
              {t("folder.review.rescan")}
            </Button>
          </div>
          <div className={styles.list}>
            {changes.map((item) => (
              <ChangeRow item={item} key={`${item.folderName}-${item.fileName}`} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyPanel}>
          <h3>{t("folder.review.policyTitle")}</h3>
          <article>
            <HardDrive size={17} strokeWidth={2.1} />
            <p>{t("folder.review.policyIndex")}</p>
          </article>
          <article>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("folder.review.policyShare")}</p>
          </article>
          <article>
            <Database size={17} strokeWidth={2.1} />
            <p>{t("folder.review.policyQuota")}</p>
          </article>
          <article>
            <AlertTriangle size={17} strokeWidth={2.1} />
            <p>{t("folder.review.policyConflict")}</p>
          </article>
        </GlassPanel>
      </div>
    </section>
  );
}
