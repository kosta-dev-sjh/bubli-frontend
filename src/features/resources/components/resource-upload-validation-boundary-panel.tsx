"use client";

import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  FileCheck2,
  FileClock,
  FileSearch,
  Fingerprint,
  Gauge,
  LockKeyhole,
  UploadCloud,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-upload-validation-boundary-panel.module.css";

export type ResourceUploadValidationStatus = "ready" | "checking" | "blocked" | "reused";

export type ResourceUploadValidationItem = {
  checksumLabel: string;
  extensionLabel: string;
  fileName: string;
  mimeLabel: string;
  reason: string;
  sizeLabel: string;
  status: ResourceUploadValidationStatus;
  targetLabel: "개인 자료" | "프로젝트룸 자료";
};

export type ResourceUploadValidationSummary = {
  allowedFormatCount: number;
  checkedFileCount: number;
  maxFileSizeLabel: string;
  readyFileCount: number;
};

export type ResourceUploadValidationBoundaryPanelProps = HTMLAttributes<HTMLElement> & {
  items: ResourceUploadValidationItem[];
  summary: ResourceUploadValidationSummary;
  title?: string;
};

const statusMeta: Record<
  ResourceUploadValidationStatus,
  { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }
> = {
  blocked: {
    icon: <AlertTriangle size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.status.blocked",
    tone: "warning",
  },
  checking: {
    icon: <FileClock size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.status.checking",
    tone: "pending",
  },
  ready: {
    icon: <CheckCircle2 size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.status.ready",
    tone: "success",
  },
  reused: {
    icon: <Fingerprint size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.status.reused",
    tone: "agent",
  },
};

const ruleCards: Array<{
  descriptionKey: MessageKey;
  icon: ReactNode;
  labelKey: MessageKey;
  value: string;
  valueKey?: MessageKey;
}> = [
  {
    descriptionKey: "resources.upload.validation.ruleFormatDesc",
    icon: <FileCheck2 size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.ruleFormatLabel",
    value: "",
    valueKey: "resources.upload.validation.ruleFormatValue",
  },
  {
    descriptionKey: "resources.upload.validation.ruleSizeDesc",
    icon: <Gauge size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.ruleSizeLabel",
    value: "100MB",
  },
  {
    descriptionKey: "resources.upload.validation.ruleDedupeDesc",
    icon: <Fingerprint size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.ruleDedupeLabel",
    value: "",
    valueKey: "resources.upload.validation.ruleDedupeValue",
  },
  {
    descriptionKey: "resources.upload.validation.ruleBoundaryDesc",
    icon: <DatabaseZap size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.validation.ruleBoundaryLabel",
    value: "",
    valueKey: "resources.upload.validation.ruleBoundaryValue",
  },
];

function ValidationItemRow({ item }: { item: ResourceUploadValidationItem }) {
  const { t } = useI18n();
  const meta = statusMeta[item.status];
  const scopeTone: StatusTone = item.targetLabel === "개인 자료" ? "personal" : "room";
  const scopeLabel = t(
    item.targetLabel === "개인 자료" ? "resources.upload.scopePersonal" : "resources.upload.scopeRoom",
  );

  return (
    <article className={styles.itemRow}>
      <div className={styles.itemMain}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileSearch size={17} strokeWidth={2.1} />
        </span>
        <div className={styles.itemText}>
          <div className={styles.itemTitleLine}>
            <h3>{item.fileName}</h3>
            <StatusBadge tone={scopeTone}>{scopeLabel}</StatusBadge>
          </div>
          <p>{item.reason}</p>
        </div>
      </div>
      <div className={styles.itemChecks} aria-label={t("resources.upload.validation.itemChecksAria", { fileName: item.fileName })}>
        <span>{item.extensionLabel}</span>
        <span>{item.mimeLabel}</span>
        <span>{item.sizeLabel}</span>
        <span>{item.checksumLabel}</span>
      </div>
      <StatusBadge className={styles.statusBadge} tone={meta.tone}>
        <span className={styles.statusContent}>
          {meta.icon}
          {t(meta.labelKey)}
        </span>
      </StatusBadge>
    </article>
  );
}

export function ResourceUploadValidationBoundaryPanel({
  className,
  items,
  summary,
  title,
  ...props
}: ResourceUploadValidationBoundaryPanelProps) {
  const { t } = useI18n();
  const readyPercent =
    summary.checkedFileCount > 0
      ? Math.round((summary.readyFileCount / summary.checkedFileCount) * 100)
      : 0;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UploadCloud size={14} strokeWidth={2.1} />} selected>
            {t("resources.upload.validation.chip")}
          </Chip>
          <div>
            <h2>{title ?? t("resources.upload.validation.defaultTitle")}</h2>
            <p>{t("resources.upload.validation.intro")}</p>
          </div>
        </div>
        <div className={styles.summaryCard} aria-label={t("resources.upload.validation.summaryAria")}>
          <strong>{readyPercent}%</strong>
          <span>{t("resources.upload.validation.summaryReady")}</span>
          <ProgressBar label={t("resources.upload.validation.summaryProgressLabel")} value={readyPercent} />
        </div>
      </header>

      <div className={styles.metrics} aria-label={t("resources.upload.validation.metricsAria")}>
        <div>
          <span>{t("resources.upload.validation.metricChecked")}</span>
          <strong>{t("resources.upload.validation.metricCheckedValue", { count: summary.checkedFileCount })}</strong>
        </div>
        <div>
          <span>{t("resources.upload.validation.metricAllowed")}</span>
          <strong>{t("resources.upload.validation.metricAllowedValue", { count: summary.allowedFormatCount })}</strong>
        </div>
        <div>
          <span>{t("resources.upload.validation.metricSingle")}</span>
          <strong>{summary.maxFileSizeLabel}</strong>
        </div>
        <div>
          <span>{t("resources.upload.validation.metricStart")}</span>
          <strong>{t("resources.upload.validation.metricStartValue")}</strong>
        </div>
      </div>

      <section className={styles.flow} aria-label={t("resources.upload.validation.flowAria")}>
        <div>{t("resources.upload.validation.flowDeviceCheck")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.validation.flowServerUpload")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.validation.flowRegister")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.validation.flowAgent")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.validation.flowCandidate")}</div>
      </section>

      <section className={styles.ruleGrid} aria-label={t("resources.upload.validation.ruleGridAria")}>
        {ruleCards.map((rule) => (
          <article className={styles.ruleCard} key={rule.labelKey}>
            <span className={styles.ruleIcon} aria-hidden="true">
              {rule.icon}
            </span>
            <div>
              <div className={styles.ruleTop}>
                <h3>{t(rule.labelKey)}</h3>
                <code>{rule.valueKey ? t(rule.valueKey) : rule.value}</code>
              </div>
              <p>{t(rule.descriptionKey)}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.itemList} aria-label={t("resources.upload.validation.itemListAria")}>
        {items.map((item) => (
          <ValidationItemRow item={item} key={`${item.targetLabel}-${item.fileName}`} />
        ))}
      </section>

      <footer className={styles.notice}>
        <LockKeyhole size={18} strokeWidth={2.1} aria-hidden="true" />
        <p>{t("resources.upload.validation.notice")}</p>
      </footer>
    </GlassPanel>
  );
}
