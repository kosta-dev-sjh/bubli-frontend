"use client";

import {
  Bell,
  DatabaseZap,
  EyeOff,
  FolderSearch,
  HardDriveDownload,
  Languages,
  MonitorCog,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type TranslateFn = (key: MessageKey) => string;

type SettingRow = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  state: "on" | "off" | "ready" | "device" | "shared";
};

const preferenceRows: SettingRow[] = [
  { descriptionKey: "settings.sl.pref.langDesc", labelKey: "settings.sl.pref.langTitle", state: "ready" },
  { descriptionKey: "settings.sl.pref.themeDesc", labelKey: "settings.sl.pref.themeTitle", state: "ready" },
  { descriptionKey: "settings.sl.pref.fontDesc", labelKey: "settings.sl.pref.fontTitle", state: "ready" },
];

const notificationRows: SettingRow[] = [
  { descriptionKey: "settings.sl.notif.commDesc", labelKey: "settings.sl.notif.commTitle", state: "on" },
  { descriptionKey: "settings.sl.notif.agentDesc", labelKey: "settings.sl.notif.agentTitle", state: "on" },
  { descriptionKey: "settings.sl.notif.dailyDesc", labelKey: "settings.sl.notif.dailyTitle", state: "off" },
];

const widgetRows: SettingRow[] = [
  { descriptionKey: "settings.sl.widget.showDesc", labelKey: "settings.sl.widget.showTitle", state: "shared" },
  { descriptionKey: "settings.sl.widget.layoutDesc", labelKey: "settings.sl.widget.layoutTitle", state: "shared" },
  { descriptionKey: "settings.sl.widget.usageDesc", labelKey: "settings.sl.widget.usageTitle", state: "device" },
];

const localRows: SettingRow[] = [
  { descriptionKey: "settings.sl.local.folderDesc", labelKey: "settings.sl.local.folderTitle", state: "device" },
  { descriptionKey: "settings.sl.local.keepDesc", labelKey: "settings.sl.local.keepTitle", state: "device" },
  { descriptionKey: "settings.sl.local.pendingDesc", labelKey: "settings.sl.local.pendingTitle", state: "ready" },
];

const privacyRows: SettingRow[] = [
  { descriptionKey: "settings.sl.privacy.activityDesc", labelKey: "settings.sl.privacy.activityTitle", state: "off" },
  { descriptionKey: "settings.sl.privacy.limitDesc", labelKey: "settings.sl.privacy.limitTitle", state: "ready" },
  { descriptionKey: "settings.sl.privacy.shareDesc", labelKey: "settings.sl.privacy.shareTitle", state: "ready" },
];

const stateMeta: Record<SettingRow["state"], { labelKey: MessageKey; tone: "memo" | "neutral" | "success" | "approved" | "todo" }> = {
  device: { labelKey: "settings.sl.state.device", tone: "memo" },
  off: { labelKey: "settings.sl.state.off", tone: "neutral" },
  on: { labelKey: "settings.sl.state.on", tone: "success" },
  ready: { labelKey: "settings.sl.state.ready", tone: "approved" },
  shared: { labelKey: "settings.sl.state.shared", tone: "todo" },
};

function stateBadge(state: SettingRow["state"], t: TranslateFn) {
  const item = stateMeta[state];
  return <StatusBadge tone={item.tone}>{t(item.labelKey)}</StatusBadge>;
}

function SettingGroup({
  icon: Icon,
  rows,
  title,
  t,
}: {
  icon: typeof SlidersHorizontal;
  rows: SettingRow[];
  title: string;
  t: TranslateFn;
}) {
  return (
    <GlassPanel className="settings-group">
      <div className="settings-group__head">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={18} strokeWidth={2.1} />
        </span>
        <h3>{title}</h3>
      </div>
      <div className="settings-group__rows">
        {rows.map((row) => (
          <div className="settings-row" key={row.labelKey}>
            <div>
              <b>{t(row.labelKey)}</b>
              <span>{t(row.descriptionKey)}</span>
            </div>
            {stateBadge(row.state, t)}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

const summaryItems: Array<{ descriptionKey: MessageKey; icon: typeof SlidersHorizontal; titleKey: MessageKey }> = [
  {
    descriptionKey: "settings.sl.summary.chooseDesc",
    icon: SlidersHorizontal,
    titleKey: "settings.sl.summary.chooseTitle",
  },
  {
    descriptionKey: "settings.sl.summary.sharedDesc",
    icon: DatabaseZap,
    titleKey: "settings.sl.summary.sharedTitle",
  },
  {
    descriptionKey: "settings.sl.summary.deviceDesc",
    icon: HardDriveDownload,
    titleKey: "settings.sl.summary.deviceTitle",
  },
];

function SettingsSummaryStrip({ t }: { t: TranslateFn }) {
  return (
    <GlassPanel className="settings-summary" padded={false}>
      {summaryItems.map((item) => {
        const Icon = item.icon;
        return (
          <div className="settings-summary__item" key={item.titleKey}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Icon size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t(item.titleKey)}</h3>
              <p>{t(item.descriptionKey)}</p>
            </div>
          </div>
        );
      })}
    </GlassPanel>
  );
}

function LocalRecoveryPanel({ t }: { t: TranslateFn }) {
  return (
    <GlassPanel className="settings-recovery">
      <div>
        <Chip selected icon={<HardDriveDownload size={14} strokeWidth={2.1} />}>
          {t("settings.sl.recovery.chip")}
        </Chip>
        <h3>{t("settings.sl.recovery.title")}</h3>
        <p>{t("settings.sl.recovery.body")}</p>
      </div>
      <div className="settings-recovery__actions">
        <Button icon={<RotateCcw size={16} />} variant="quiet">
          {t("settings.sl.recovery.check")}
        </Button>
        <Button icon={<DatabaseZap size={16} />} variant="primary">
          {t("settings.sl.recovery.now")}
        </Button>
      </div>
    </GlassPanel>
  );
}

export function SettingsLocalPanel() {
  const { t } = useI18n();

  return (
    <section className="settings-local-panel" aria-label={t("settings.sl.panelAria")}>
      <SectionHeading
        eyebrow={t("settings.sl.headEyebrow")}
        title={t("settings.sl.headTitle")}
        description={t("settings.sl.headDesc")}
      />

      <SettingsSummaryStrip t={t} />

      <div className="settings-local-panel__grid">
        <SettingGroup icon={Languages} rows={preferenceRows} title={t("settings.sl.group.profile")} t={t} />
        <SettingGroup icon={Bell} rows={notificationRows} title={t("settings.sl.group.notif")} t={t} />
        <SettingGroup icon={MonitorCog} rows={widgetRows} title={t("settings.sl.group.widget")} t={t} />
        <SettingGroup icon={FolderSearch} rows={localRows} title={t("settings.sl.group.local")} t={t} />
        <SettingGroup icon={ShieldCheck} rows={privacyRows} title={t("settings.sl.group.privacy")} t={t} />
      </div>

      <div className="settings-local-panel__safety">
        <GlassPanel className="settings-permission">
          <span className="bubli-icon-tile" aria-hidden="true">
            <EyeOff size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("settings.sl.permTitle")}</h3>
            <p>{t("settings.sl.permBody")}</p>
            <div className="settings-permission__chips">
              <Chip>{t("settings.sl.permChip1")}</Chip>
              <Chip>{t("settings.sl.permChip2")}</Chip>
              <Chip>{t("settings.sl.permChip3")}</Chip>
            </div>
          </div>
        </GlassPanel>

        <LocalRecoveryPanel t={t} />
      </div>
    </section>
  );
}
