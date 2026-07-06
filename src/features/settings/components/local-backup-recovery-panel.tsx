"use client";

import { Archive, DatabaseBackup, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  backupLocalSqlite,
  checkLocalSqliteIntegrity,
  listLocalSqliteBackups,
  restoreLocalSqliteBackup,
} from "@/lib/local/local-cache-client";
import { useI18n } from "@/lib/i18n";
import type { Locale, MessageKey, TranslateVars } from "@/lib/i18n";
import type { LocalBackupManifestEntry, LocalBackupManifestResult, SqliteIntegrityResult } from "@/lib/tauri/commands";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type BackupItem = {
  backupId: string;
  createdAt: string;
  fileName: string;
  size: string;
  status: "valid" | "latest" | "old";
};

type LocalBackupRecoveryPanelProps = {
  autoLoad?: boolean;
  initialIntegrity?: SqliteIntegrityResult | null;
  initialManifest?: LocalBackupManifestResult | null;
};

const statusMeta: Record<BackupItem["status"], { labelKey: MessageKey; tone: "success" | "approved" | "neutral" }> = {
  latest: { labelKey: "settings.lbr.status.latest", tone: "approved" },
  old: { labelKey: "settings.lbr.status.old", tone: "neutral" },
  valid: { labelKey: "settings.lbr.status.valid", tone: "success" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)}${units[unitIndex]}`;
}

function formatDateTime(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function toBackupItem(entry: LocalBackupManifestEntry, latestBackupId: string | null | undefined, index: number): BackupItem {
  return {
    backupId: entry.backupId,
    createdAt: entry.createdAt,
    fileName: entry.fileName,
    size: formatBytes(entry.sizeBytes),
    status: latestBackupId === entry.backupId ? "latest" : index > 4 ? "old" : "valid",
  };
}

function BackupRow({
  busy,
  item,
  locale,
  onRestore,
  t,
}: {
  busy: boolean;
  item: BackupItem;
  locale: Locale;
  onRestore: (backupId: string) => void;
  t: TranslateFn;
}) {
  const status = statusMeta[item.status];

  return (
    <article className="local-backup-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Archive size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="local-backup-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{formatDateTime(item.createdAt, locale)}</span>
          <span>{item.size}</span>
        </div>
        <h3>{item.fileName}</h3>
      </div>
      <Button disabled={busy} onClick={() => onRestore(item.backupId)} size="sm" variant="quiet">
        {t("settings.lbr.restore")}
      </Button>
    </article>
  );
}

export function LocalBackupRecoveryPanel({ autoLoad = true, initialIntegrity = null, initialManifest = null }: LocalBackupRecoveryPanelProps) {
  const { locale, t } = useI18n();
  const [manifest, setManifest] = useState<LocalBackupManifestResult | null>(initialManifest);
  const [integrity, setIntegrity] = useState<SqliteIntegrityResult | null>(initialIntegrity);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [action, setAction] = useState<"backup" | "integrity" | "load" | "restore" | null>(autoLoad ? "load" : null);
  const backupItems = useMemo(
    () => manifest?.backups.map((entry, index) => toBackupItem(entry, manifest.latestBackupId, index)) ?? [],
    [manifest],
  );
  const backupBytes = useMemo(() => manifest?.backups.reduce((sum, entry) => sum + entry.sizeBytes, 0) ?? 0, [manifest]);
  const capacityValue = Math.min(100, Math.round((backupBytes / (100 * 1024 * 1024)) * 100));
  const healthTone = integrity === null ? "neutral" : integrity.ok ? "success" : "warning";
  const healthLabel = integrity === null ? t("settings.lbr.sizeUnknown") : integrity.ok ? t("settings.lbr.normal") : t("settings.lbr.needsRecovery");
  const databaseSize = integrity ? formatBytes(integrity.databaseSizeBytes + integrity.walSizeBytes) : t("settings.lbr.sizeUnknown");

  const loadLocalState = useCallback(async () => {
    setAction("load");
    setLoading(true);
    setNotice(null);

    const [manifestResult, integrityResult] = await Promise.all([Promise.resolve(listLocalSqliteBackups()), Promise.resolve(checkLocalSqliteIntegrity())]);
    const messages: string[] = [];

    if (manifestResult.status === "ready") {
      setManifest(manifestResult.data);
    } else {
      messages.push(manifestResult.message);
    }

    if (integrityResult.status === "ready") {
      setIntegrity(integrityResult.data);
    } else {
      messages.push(integrityResult.message);
    }

    setNotice(messages[0] ?? null);
    setLoading(false);
    setAction(null);
  }, []);

  useEffect(() => {
    if (!autoLoad) return;

    const timeoutId = window.setTimeout(() => {
      void loadLocalState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoLoad, loadLocalState]);

  const createBackup = async () => {
    setAction("backup");
    setNotice(null);
    const result = await Promise.resolve(backupLocalSqlite());
    if (result.status === "ready") {
      await loadLocalState();
      setNotice(t("settings.lbr.backupCreated", { fileName: result.data.fileName }));
      return;
    }

    setNotice(result.message);
    setAction(null);
  };

  const checkIntegrity = async () => {
    setAction("integrity");
    setNotice(null);
    const result = await Promise.resolve(checkLocalSqliteIntegrity());
    if (result.status === "ready") {
      setIntegrity(result.data);
      setNotice(result.data.ok ? t("settings.lbr.integrityOk", { detail: result.data.quickCheck }) : t("settings.lbr.integrityBad", { detail: result.data.quickCheck }));
    } else {
      setNotice(result.message);
    }
    setAction(null);
  };

  const restoreBackup = async (backupId: string) => {
    setAction("restore");
    setNotice(null);
    const result = await Promise.resolve(restoreLocalSqliteBackup({ backupId }));
    if (result.status === "ready") {
      await loadLocalState();
      setNotice(result.data.requiresRestart ? t("settings.lbr.restoreRestart") : t("settings.lbr.restoreDone"));
      return;
    }

    setNotice(result.message);
    setAction(null);
  };

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
          <StatusBadge tone={healthTone}>{healthLabel}</StatusBadge>
          <strong>{manifest?.backups.length ?? 0}</strong>
          <span>{t("settings.lbr.storedCount")}</span>
          <ProgressBar label={t("settings.lbr.capacity")} value={capacityValue} />
          <p>{t("settings.lbr.databaseSize", { size: databaseSize })}</p>
        </div>
      </GlassPanel>

      <div className="local-backup__grid">
        <GlassPanel className="local-backup__list">
          <div className="local-backup__list-top">
            <div>
              <h3>{t("settings.lbr.listTitle")}</h3>
              <p>{t("settings.lbr.listDesc")}</p>
            </div>
            <Button disabled={action !== null} icon={<DatabaseBackup size={15} />} loading={action === "backup"} onClick={() => void createBackup()} size="sm" variant="primary">
              {action === "backup" ? t("settings.lbr.backingUp") : t("settings.lbr.backupNow")}
            </Button>
          </div>
          {notice ? <p className="local-backup__notice">{notice}</p> : null}
          <div className="local-backup__items">
            {loading ? <p className="local-backup__empty">{t("settings.lbr.loading")}</p> : null}
            {!loading && backupItems.length === 0 ? <p className="local-backup__empty">{t("settings.lbr.empty")}</p> : null}
            {!loading
              ? backupItems.map((item) => (
                  <BackupRow busy={action !== null} item={item} key={item.backupId} locale={locale} onRestore={(backupId) => void restoreBackup(backupId)} t={t} />
                ))
              : null}
          </div>
        </GlassPanel>

        <GlassPanel className="local-backup__recovery">
          <h3>{t("settings.lbr.recoveryTitle")}</h3>
          <Button disabled={action !== null} icon={<ShieldCheck size={15} />} loading={action === "integrity"} onClick={() => void checkIntegrity()} size="sm" variant="quiet">
            {t("settings.lbr.checkIntegrity")}
          </Button>
        </GlassPanel>
      </div>
    </section>
  );
}
