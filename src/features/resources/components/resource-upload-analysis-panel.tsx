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
import { useI18n, type MessageKey } from "@/lib/i18n";

import styles from "./resource-upload-analysis-panel.module.css";

type UploadStatus = "uploading" | "analyzing" | "ready";
type UploadFile = {
  analysis: number;
  fileName: string;
  meta: string;
  scope: "개인 자료" | "프로젝트룸 자료";
  status: UploadStatus;
};

const files: UploadFile[] = [
  {
    analysis: 66,
    fileName: "번역계약서_v2.pdf",
    meta: "PDF · 2.4MB · 파일 지문 확인",
    scope: "프로젝트룸 자료",
    status: "analyzing",
  },
  {
    analysis: 100,
    fileName: "요구사항_정리.md",
    meta: "Markdown · 84KB · 자료 등록 완료",
    scope: "프로젝트룸 자료",
    status: "ready",
  },
  {
    analysis: 42,
    fileName: "개인_참고메모.txt",
    meta: "TXT · 18KB · 업로드 진행 중",
    scope: "개인 자료",
    status: "uploading",
  },
];

const statusMeta: Record<UploadStatus, { labelKey: MessageKey; tone: "todo" | "agent" | "approved" }> = {
  analyzing: { labelKey: "resources.upload.analysis.status.analyzing", tone: "agent" },
  ready: { labelKey: "resources.upload.analysis.status.ready", tone: "approved" },
  uploading: { labelKey: "resources.upload.analysis.status.uploading", tone: "todo" },
};

function FileCard({ file }: { file: UploadFile }) {
  const { t } = useI18n();
  const status = statusMeta[file.status];
  const scopeLabel = t(
    file.scope === "개인 자료" ? "resources.upload.scopePersonal" : "resources.upload.scopeRoom",
  );

  return (
    <article className={styles.fileCard}>
      <div className={styles.fileTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileText size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            <StatusBadge tone={file.scope === "개인 자료" ? "personal" : "room"}>{scopeLabel}</StatusBadge>
          </div>
          <h3>{file.fileName}</h3>
          <p>{file.meta}</p>
        </div>
        <StatusBadge tone="neutral">{file.analysis}%</StatusBadge>
      </div>
      <ProgressBar label={t("resources.upload.analysis.progressLabel", { fileName: file.fileName })} value={file.analysis} />
      <div className={styles.meta}>
        <span>{t("resources.upload.analysis.cardMetaRegister")}</span>
        <span>{t("resources.upload.analysis.cardMetaCandidate")}</span>
      </div>
    </article>
  );
}

export function ResourceUploadAnalysisPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("resources.upload.analysis.aria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<HardDriveUpload size={14} />} selected>
            {t("resources.upload.analysis.chip")}
          </Chip>
          <h2>{t("resources.upload.analysis.title")}</h2>
          <p>{t("resources.upload.analysis.desc")}</p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="todo">{t("resources.upload.analysis.summaryBadge")}</StatusBadge>
          <strong>100MB</strong>
          <span>{t("resources.upload.analysis.summaryUnit")}</span>
          <ProgressBar label={t("resources.upload.analysis.summaryProgressLabel")} value={81} />
        </div>
      </GlassPanel>

      <div className={styles.flow}>
        <span>{t("resources.upload.analysis.flowSelectFile")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.analysis.flowCheck")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.analysis.flowRegister")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.analysis.flowAgent")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("resources.upload.analysis.flowCandidate")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.uploadCard}>
          <div className={styles.dropzone}>
            <div className={styles.dropzoneInner}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <UploadCloud size={18} strokeWidth={2.1} />
              </span>
              <h3>{t("resources.upload.analysis.dropzoneTitle")}</h3>
              <p>{t("resources.upload.analysis.dropzoneDesc")}</p>
              <div className={styles.chips}>
                <Chip>{t("resources.upload.scopePersonal")}</Chip>
                <Chip>{t("resources.upload.scopeRoom")}</Chip>
                <Chip>{t("resources.upload.analysis.chipProgress")}</Chip>
              </div>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <h3>{t("resources.upload.analysis.uploadStateTitle")}</h3>
            <p>{t("resources.upload.analysis.uploadStateDesc")}</p>
          </div>
          <div className={styles.fileList}>
            {files.map((file) => (
              <FileCard file={file} key={file.fileName} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rules}>
          <h3>{t("resources.upload.analysis.rulesTitle")}</h3>
          <div className={styles.ruleList}>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.analysis.rulePermissionCode")}</code>
              <h4>{t("resources.upload.analysis.rulePermissionTitle")}</h4>
              <p>{t("resources.upload.analysis.rulePermissionDesc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.analysis.ruleStorageCode")}</code>
              <h4>{t("resources.upload.analysis.ruleStorageTitle")}</h4>
              <p>{t("resources.upload.analysis.ruleStorageDesc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.analysis.ruleDedupeCode")}</code>
              <h4>{t("resources.upload.analysis.ruleDedupeTitle")}</h4>
              <p>{t("resources.upload.analysis.ruleDedupeDesc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("resources.upload.analysis.ruleAgentCode")}</code>
              <h4>{t("resources.upload.analysis.ruleAgentTitle")}</h4>
              <p>{t("resources.upload.analysis.ruleAgentDesc")}</p>
            </article>
          </div>
          <div className={styles.chips}>
            <Chip icon={<ShieldCheck size={14} />}>{t("resources.upload.analysis.chipInjection")}</Chip>
            <Chip icon={<LockKeyhole size={14} />}>{t("resources.upload.analysis.chipNoPublicLink")}</Chip>
            <Chip icon={<Bot size={14} />}>{t("resources.upload.analysis.chipCandidate")}</Chip>
            <Chip icon={<RefreshCw size={14} />}>{t("resources.upload.analysis.chipStatusEvent")}</Chip>
            <Chip icon={<FileArchive size={14} />}>{t("resources.upload.analysis.chipVersion")}</Chip>
            <Chip icon={<CheckCircle2 size={14} />}>{t("resources.upload.analysis.chipUserConfirm")}</Chip>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
