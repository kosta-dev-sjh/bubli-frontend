"use client";

import { AlertTriangle, Archive, CheckCircle2, CloudOff, DatabaseBackup, HardDrive, RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type TranslateFn = (key: MessageKey) => string;

type BackupItem = {
  titleKey: MessageKey;
  createdAtKey: MessageKey;
  size: string;
  status: "valid" | "latest" | "old";
};

const backups: BackupItem[] = [
  {
    createdAtKey: "settings.lbr.backup.autoAt",
    size: "18.4MB",
    status: "latest",
    titleKey: "settings.lbr.backup.auto",
  },
  {
    createdAtKey: "settings.lbr.backup.dailyAt",
    size: "17.9MB",
    status: "valid",
    titleKey: "settings.lbr.backup.daily",
  },
  {
    createdAtKey: "settings.lbr.backup.updateAt",
    size: "16.1MB",
    status: "old",
    titleKey: "settings.lbr.backup.update",
  },
];

const statusMeta: Record<BackupItem["status"], { labelKey: MessageKey; tone: "success" | "approved" | "neutral" }> = {
  latest: { labelKey: "settings.lbr.status.latest", tone: "approved" },
  old: { labelKey: "settings.lbr.status.old", tone: "neutral" },
  valid: { labelKey: "settings.lbr.status.valid", tone: "success" },
};

function BackupRow({ item, t }: { item: BackupItem; t: TranslateFn }) {
  const status = statusMeta[item.status];

  return (
    <article className="local-backup-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Archive size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="local-backup-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{t(item.createdAtKey)}</span>
          <span>{item.size}</span>
        </div>
        <h3>{t(item.titleKey)}</h3>
      </div>
      <Button size="sm" variant="quiet">
        {t("settings.lbr.rowConfirm")}
      </Button>
    </article>
  );
}

export function LocalBackupRecoveryPanel() {
  const { t } = useI18n();

  return (
    <section className="local-backup" aria-label={t("settings.lbr.panelAria")}>
      <GlassPanel className="local-backup__hero">
        <div>
          <Chip icon={<DatabaseBackup size={14} />} selected>
            {t("settings.lbr.chip")}
          </Chip>
          <h2>{t("settings.lbr.heroTitle")}</h2>
          <p>{t("settings.lbr.heroBody")}</p>
        </div>
        <div className="local-backup__summary">
          <StatusBadge tone="success">{t("settings.lbr.normal")}</StatusBadge>
          <strong>7</strong>
          <span>{t("settings.lbr.storedCount")}</span>
          <ProgressBar label={t("settings.lbr.capacity")} value={54} />
        </div>
      </GlassPanel>

      <div className="local-backup__grid">
        <GlassPanel className="local-backup__list">
          <div className="local-backup__list-top">
            <div>
              <h3>{t("settings.lbr.listTitle")}</h3>
              <p>{t("settings.lbr.listDesc")}</p>
            </div>
            <Button icon={<DatabaseBackup size={15} />} size="sm" variant="primary">
              {t("settings.lbr.backupNow")}
            </Button>
          </div>
          <div className="local-backup__items">
            {backups.map((item) => (
              <BackupRow item={item} key={item.titleKey} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="local-backup__recovery">
          <h3>{t("settings.lbr.recoveryTitle")}</h3>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("settings.lbr.recovery1")}</p>
          </div>
          <div>
            <HardDrive size={17} strokeWidth={2.1} />
            <p>{t("settings.lbr.recovery2")}</p>
          </div>
          <div>
            <CloudOff size={17} strokeWidth={2.1} />
            <p>{t("settings.lbr.recovery3")}</p>
          </div>
          <div>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>{t("settings.lbr.recovery4")}</p>
          </div>
        </GlassPanel>
      </div>

      <div className="local-backup__policy">
        <GlassPanel>
          <CheckCircle2 size={18} strokeWidth={2.1} />
          <h3>{t("settings.lbr.serverTitle")}</h3>
          <p>{t("settings.lbr.serverBody")}</p>
        </GlassPanel>
        <GlassPanel>
          <AlertTriangle size={18} strokeWidth={2.1} />
          <h3>{t("settings.lbr.localTitle")}</h3>
          <p>{t("settings.lbr.localBody")}</p>
        </GlassPanel>
      </div>
    </section>
  );
}
