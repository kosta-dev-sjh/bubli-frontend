"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileArchive,
  FileText,
  HardDriveUpload,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./resource-upload-analysis-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type UploadStatus = "uploading" | "analyzing" | "ready";
type UploadScope = "personal" | "room";
type UploadFile = {
  analysis: number;
  fileName: string;
  meta: string;
  scope: UploadScope;
  status: UploadStatus;
};

// Demo fixture: fileName/meta hold message keys resolved via t() at render.
const files: UploadFile[] = [
  {
    analysis: 66,
    fileName: "resources.upload.file1Name",
    meta: "resources.upload.file1Meta",
    scope: "room",
    status: "analyzing",
  },
  {
    analysis: 100,
    fileName: "resources.upload.file2Name",
    meta: "resources.upload.file2Meta",
    scope: "room",
    status: "ready",
  },
  {
    analysis: 42,
    fileName: "resources.upload.file3Name",
    meta: "resources.upload.file3Meta",
    scope: "personal",
    status: "uploading",
  },
];

const statusMetaKey: Record<UploadStatus, { labelKey: MessageKey; tone: "todo" | "agent" | "approved" }> = {
  analyzing: { labelKey: "resources.upload.fileStatusAnalyzing", tone: "agent" },
  ready: { labelKey: "resources.upload.fileStatusReady", tone: "approved" },
  uploading: { labelKey: "resources.upload.fileStatusUploading", tone: "todo" },
};

const scopeLabelKey: Record<UploadScope, MessageKey> = {
  personal: "resources.upload.fileScopePersonal",
  room: "resources.upload.fileScopeRoom",
};

function FileCard({ file, t }: { file: UploadFile; t: TranslateFn }) {
  const status = statusMetaKey[file.status];
  const fileName = t(file.fileName as MessageKey);

  return (
    <article className={styles.fileCard}>
      <div className={styles.fileTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileText size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            <StatusBadge tone={file.scope === "personal" ? "personal" : "room"}>{t(scopeLabelKey[file.scope])}</StatusBadge>
          </div>
          <h3>{fileName}</h3>
          <p>{t(file.meta as MessageKey)}</p>
        </div>
        <StatusBadge tone="neutral">{file.analysis}%</StatusBadge>
      </div>
      <ProgressBar label={t("resources.upload.progressBar", { fileName })} value={file.analysis} />
      <div className={styles.meta}>
        <span>{t("resources.upload.metaAfterUpload")}</span>
        <span>{t("resources.upload.metaCandidate")}</span>
      </div>
    </article>
  );
}

export function ResourceUploadAnalysisPanel() {
  const { t } = useI18n();
  return (
    <section className={styles.panel} aria-label={t("resources.upload.analysisAria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<HardDriveUpload size={14} />} selected>
            {t("resources.upload.chip")}
          </Chip>
          <h2>{t("resources.upload.heroTitle")}</h2>
          <p>
            {t("resources.upload.heroDesc")}
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="todo">{t("resources.upload.serverUpload")}</StatusBadge>
          <strong>100MB</strong>
          <span>{t("resources.upload.perFile")}</span>
          <ProgressBar label={t("resources.upload.readyBar")} value={81} />
        </div>
      </GlassPanel>

      <div className={styles.flow}>
        <span>{t("resources.upload.flowSelect")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.flowCheck")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.flowRegister")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.flowOrganize")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.flowConfirm")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.uploadCard}>
          <div className={styles.dropzone}>
            <div className={styles.dropzoneInner}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <UploadCloud size={18} strokeWidth={2.1} />
              </span>
              <h3>{t("resources.upload.dropTitle")}</h3>
              <p>{t("resources.upload.dropDesc")}</p>
              <div className={styles.chips}>
                <Chip>{t("resources.upload.chipPersonal")}</Chip>
                <Chip>{t("resources.upload.chipRoom")}</Chip>
                <Chip>{t("resources.upload.chipProgress")}</Chip>
              </div>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <h3>{t("resources.upload.statusTitle")}</h3>
            <p>{t("resources.upload.statusDesc")}</p>
          </div>
          <div className={styles.fileList}>
            {files.map((file) => (
              <FileCard file={file} key={file.fileName} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rules}>
          <h3>{t("resources.upload.rulesTitle")}</h3>
          <div className={styles.ruleList}>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.ruleAuthCode")}</code>
              <h4>{t("resources.upload.ruleAuthTitle")}</h4>
              <p>{t("resources.upload.ruleAuthDesc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.ruleStoreCode")}</code>
              <h4>{t("resources.upload.ruleStoreTitle")}</h4>
              <p>{t("resources.upload.ruleStoreDesc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.ruleFingerCode")}</code>
              <h4>{t("resources.upload.ruleFingerTitle")}</h4>
              <p>{t("resources.upload.ruleFingerDesc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.ruleAgentCode")}</code>
              <h4>{t("resources.upload.ruleAgentTitle")}</h4>
              <p>{t("resources.upload.ruleAgentDesc")}</p>
            </article>
          </div>
          <div className={styles.chips}>
            <Chip icon={<ShieldCheck size={14} />}>{t("resources.upload.chipInjection")}</Chip>
            <Chip icon={<LockKeyhole size={14} />}>{t("resources.upload.chipNoPublic")}</Chip>
            <Chip icon={<Bot size={14} />}>{t("resources.upload.chipCandidate")}</Chip>
            <Chip icon={<RefreshCw size={14} />}>{t("resources.upload.chipStatusEvent")}</Chip>
            <Chip icon={<FileArchive size={14} />}>{t("resources.upload.chipVersion")}</Chip>
            <Chip icon={<CheckCircle2 size={14} />}>{t("resources.upload.chipUserConfirm")}</Chip>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
