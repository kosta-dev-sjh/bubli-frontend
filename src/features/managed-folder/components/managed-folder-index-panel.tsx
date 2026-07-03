"use client";

import { CheckCircle2, Database, FolderCheck, FolderOpen, HardDrive, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type FolderEvent = {
  title: string;
  path: string;
  status: "indexed" | "changed" | "pending";
  detailKey: MessageKey;
};

const folderEvents: FolderEvent[] = [
  {
    detailKey: "folder.index.detail.personalOnly",
    path: "~/Documents/Bubli/업무기준문서",
    status: "indexed",
    title: "업무 문서_최종본.pdf",
  },
  {
    detailKey: "folder.index.detail.reindexAfterChange",
    path: "~/Documents/Bubli/회의록",
    status: "changed",
    title: "회의록_0618.md",
  },
  {
    detailKey: "folder.index.detail.pendingAfterRecovery",
    path: "~/Documents/Bubli/참고자료",
    status: "pending",
    title: "용어집.xlsx",
  },
];

const statusMeta: Record<FolderEvent["status"], { labelKey: MessageKey; tone: "success" | "pending" | "warning" }> = {
  changed: { labelKey: "folder.status.changed", tone: "warning" },
  indexed: { labelKey: "folder.status.indexed", tone: "success" },
  pending: { labelKey: "folder.status.waiting", tone: "pending" },
};

function FolderEventRow({ item, t }: { item: FolderEvent; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className="managed-folder-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FolderOpen size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="managed-folder-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{item.path}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{t(item.detailKey)}</p>
      </div>
    </article>
  );
}

export function ManagedFolderIndexPanel() {
  const { t } = useI18n();

  return (
    <section className="managed-folder" aria-label={t("folder.index.aria")}>
      <GlassPanel className="managed-folder__hero">
        <div>
          <Chip icon={<HardDrive size={14} />} selected>
            {t("folder.index.chip")}
          </Chip>
          <h2>{t("folder.index.heroTitle")}</h2>
          <p>{t("folder.index.heroDesc")}</p>
        </div>
        <div className="managed-folder__summary">
          <StatusBadge tone="personal">{t("folder.index.summaryBadge")}</StatusBadge>
          <strong>128</strong>
          <span>{t("folder.index.summaryLabel")}</span>
          <ProgressBar label={t("folder.index.progressLabel")} value={82} />
        </div>
      </GlassPanel>

      <div className="managed-folder__grid">
        <GlassPanel className="managed-folder__list">
          <div className="managed-folder__list-top">
            <div>
              <h3>{t("folder.index.recentTitle")}</h3>
              <p>{t("folder.index.recentDesc")}</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="quiet">
              {t("folder.index.reindex")}
            </Button>
          </div>
          <div className="managed-folder__items">
            {folderEvents.map((item) => (
              <FolderEventRow item={item} key={`${item.path}-${item.title}`} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="managed-folder__policy">
          <h3>{t("folder.index.policyTitle")}</h3>
          <div>
            <FolderCheck size={17} strokeWidth={2.1} />
            <p>{t("folder.index.policySelected")}</p>
          </div>
          <div>
            <Database size={17} strokeWidth={2.1} />
            <p>{t("folder.index.policyFast")}</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("folder.index.policyPersonal")}</p>
          </div>
          <div>
            <UploadCloud size={17} strokeWidth={2.1} />
            <p>{t("folder.index.policyShare")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="managed-folder__flow">
        <Chip selected>{t("folder.index.flowSelect")}</Chip>
        <CheckCircle2 size={16} strokeWidth={2.1} />
        <Chip>{t("folder.index.flowDetect")}</Chip>
        <CheckCircle2 size={16} strokeWidth={2.1} />
        <Chip>{t("folder.index.flowPersonal")}</Chip>
        <CheckCircle2 size={16} strokeWidth={2.1} />
        <Chip selected>{t("folder.index.flowApprove")}</Chip>
      </GlassPanel>
    </section>
  );
}
