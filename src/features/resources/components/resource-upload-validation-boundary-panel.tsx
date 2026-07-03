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
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-upload-validation-boundary-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

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
    labelKey: "resources.upload.valStatusBlocked",
    tone: "warning",
  },
  checking: {
    icon: <FileClock size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.valStatusChecking",
    tone: "pending",
  },
  ready: {
    icon: <CheckCircle2 size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.valStatusReady",
    tone: "success",
  },
  reused: {
    icon: <Fingerprint size={15} strokeWidth={2.1} />,
    labelKey: "resources.upload.valStatusReused",
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
    descriptionKey: "resources.upload.valRuleFormatDesc",
    icon: <FileCheck2 size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.valRuleFormatLabel",
    value: "",
    valueKey: "resources.upload.valRuleFormatValue",
  },
  {
    descriptionKey: "resources.upload.valRuleSizeDesc",
    icon: <Gauge size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.valRuleSizeLabel",
    value: "100MB",
  },
  {
    descriptionKey: "resources.upload.valRuleFingerDesc",
    icon: <Fingerprint size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.valRuleFingerLabel",
    value: "",
    valueKey: "resources.upload.valRuleFingerValue",
  },
  {
    descriptionKey: "resources.upload.valRuleBoundaryDesc",
    icon: <DatabaseZap size={18} strokeWidth={2.1} />,
    labelKey: "resources.upload.valRuleBoundaryLabel",
    value: "",
    valueKey: "resources.upload.valRuleBoundaryValue",
  },
];

function ValidationItemRow({ item, t }: { item: ResourceUploadValidationItem; t: TranslateFn }) {
  const meta = statusMeta[item.status];
  const isPersonal = item.targetLabel === "개인 자료";
  const scopeTone: StatusTone = isPersonal ? "personal" : "room";
  const targetLabel = isPersonal ? t("resources.upload.fileScopePersonal") : t("resources.upload.fileScopeRoom");

  return (
    <article className={styles.itemRow}>
      <div className={styles.itemMain}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileSearch size={17} strokeWidth={2.1} />
        </span>
        <div className={styles.itemText}>
          <div className={styles.itemTitleLine}>
            <h3>{item.fileName}</h3>
            <StatusBadge tone={scopeTone}>{targetLabel}</StatusBadge>
          </div>
          <p>{item.reason}</p>
        </div>
      </div>
      <div className={styles.itemChecks} aria-label={t("resources.upload.valItemChecksAria", { fileName: item.fileName })}>
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
  const panelTitle = title ?? t("resources.upload.valDefaultTitle");
  const readyPercent =
    summary.checkedFileCount > 0
      ? Math.round((summary.readyFileCount / summary.checkedFileCount) * 100)
      : 0;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UploadCloud size={14} strokeWidth={2.1} />} selected>
            {t("resources.upload.valChip")}
          </Chip>
          <div>
            <h2>{panelTitle}</h2>
            <p>
              {t("resources.upload.valDesc")}
            </p>
          </div>
        </div>
        <div className={styles.summaryCard} aria-label={t("resources.upload.valSummaryAria")}>
          <strong>{readyPercent}%</strong>
          <span>{t("resources.upload.valReady")}</span>
          <ProgressBar label={t("resources.upload.valReadyBar")} value={readyPercent} />
        </div>
      </header>

      <div className={styles.metrics} aria-label={t("resources.upload.valMetricsAria")}>
        <div>
          <span>{t("resources.upload.valMetricChecked")}</span>
          <strong>{t("resources.upload.valMetricCheckedUnit", { count: summary.checkedFileCount })}</strong>
        </div>
        <div>
          <span>{t("resources.upload.valMetricAllowed")}</span>
          <strong>{t("resources.upload.valMetricAllowedUnit", { count: summary.allowedFormatCount })}</strong>
        </div>
        <div>
          <span>{t("resources.upload.valMetricSingle")}</span>
          <strong>{summary.maxFileSizeLabel}</strong>
        </div>
        <div>
          <span>{t("resources.upload.valMetricStart")}</span>
          <strong>{t("resources.upload.valMetricStartValue")}</strong>
        </div>
      </div>

      <section className={styles.flow} aria-label={t("resources.upload.valFlowAria")}>
        <div>{t("resources.upload.valFlowDevice")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.valFlowServer")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.valFlowRegister")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.valFlowOrganize")}</div>
        <span aria-hidden="true" />
        <div>{t("resources.upload.valFlowConfirm")}</div>
      </section>

      <section className={styles.ruleGrid} aria-label={t("resources.upload.valRulesAria")}>
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

      <section className={styles.itemList} aria-label={t("resources.upload.valItemsAria")}>
        {items.map((item) => (
          <ValidationItemRow item={item} key={`${item.targetLabel}-${item.fileName}`} t={t} />
        ))}
      </section>

      <footer className={styles.notice}>
        <LockKeyhole size={18} strokeWidth={2.1} aria-hidden="true" />
        <p>
          {t("resources.upload.valNotice")}
        </p>
      </footer>
    </GlassPanel>
  );
}
