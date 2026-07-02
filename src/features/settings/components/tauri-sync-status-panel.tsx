"use client";

import { AlertCircle, CheckCircle2, Database, HardDrive, RefreshCw, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type SyncQueueItem = {
  labelKey: MessageKey;
  sourceKey: MessageKey;
  targetKey: MessageKey;
  status: "queued" | "retrying" | "synced";
  count: number;
};

const queueItems: SyncQueueItem[] = [
  {
    count: 4,
    labelKey: "settings.tss.timer.label",
    sourceKey: "settings.tss.timer.source",
    status: "queued",
    targetKey: "settings.tss.timer.target",
  },
  {
    count: 2,
    labelKey: "settings.tss.widget.label",
    sourceKey: "settings.tss.widget.source",
    status: "retrying",
    targetKey: "settings.tss.widget.target",
  },
  {
    count: 0,
    labelKey: "settings.tss.recent.label",
    sourceKey: "settings.tss.recent.source",
    status: "synced",
    targetKey: "settings.tss.recent.target",
  },
];

const statusMeta: Record<SyncQueueItem["status"], { labelKey: MessageKey; tone: "warning" | "pending" | "success" }> = {
  queued: { labelKey: "settings.tss.status.queued", tone: "pending" },
  retrying: { labelKey: "settings.tss.status.retrying", tone: "warning" },
  synced: { labelKey: "settings.tss.status.synced", tone: "success" },
};

function SyncQueueRow({ item, t }: { item: SyncQueueItem; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className="tauri-sync-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <UploadCloud size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="tauri-sync-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t("settings.tss.count", { count: item.count })}</span>
        </div>
        <h3>{t(item.labelKey)}</h3>
        <p>
          {t(item.sourceKey)} → {t(item.targetKey)}
        </p>
      </div>
    </article>
  );
}

export function TauriSyncStatusPanel() {
  const { t } = useI18n();

  return (
    <section className="tauri-sync" aria-label={t("settings.tss.panelAria")}>
      <GlassPanel className="tauri-sync__hero">
        <div className="tauri-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <HardDrive size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("settings.tss.chip")}</Chip>
            <h2>{t("settings.tss.heroTitle")}</h2>
            <p>{t("settings.tss.heroBody")}</p>
          </div>
        </div>
        <div className="tauri-sync__health">
          <StatusBadge tone="warning">{t("settings.tss.syncPending")}</StatusBadge>
          <strong>{t("settings.tss.sixCount")}</strong>
          <span>{t("settings.tss.unsent")}</span>
          <ProgressBar label={t("settings.tss.syncState")} value={78} />
        </div>
      </GlassPanel>

      <div className="tauri-sync__grid">
        <GlassPanel className="tauri-sync__panel">
          <div className="tauri-sync__panel-header">
            <div>
              <h3>{t("settings.tss.queueTitle")}</h3>
              <p>{t("settings.tss.queueDesc")}</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="primary">
              {t("settings.tss.resync")}
            </Button>
          </div>

          <div className="tauri-sync__list">
            {queueItems.map((item) => (
              <SyncQueueRow item={item} key={item.labelKey} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="tauri-sync__policy">
          <h3>{t("settings.tss.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy1")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <RotateCcw size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy2")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <AlertCircle size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy3")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("settings.tss.policy4")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="tauri-sync__footer">
        <span className="bubli-icon-tile" aria-hidden="true">
          <CheckCircle2 size={16} strokeWidth={2.1} />
        </span>
        <p>{t("settings.tss.footer")}</p>
      </GlassPanel>
    </section>
  );
}
