import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  Database,
  Eye,
  Layers3,
  MonitorSmartphone,
  RefreshCcw,
  Server,
  Settings2,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-storage-policy-panel.module.css";

export type WidgetStorageLayer = "SERVER_ORIGINAL" | "SERVER_STATE" | "LOCAL_CACHE" | "LOCAL_EVENT" | "LOCAL_ROLLUP";

export type WidgetStorageItem = {
  description: MessageKey;
  id: string;
  label: MessageKey;
  layer: WidgetStorageLayer;
  tags: MessageKey[];
};

export type WidgetRollupDevice = {
  bubbleType: string;
  deviceLabel: MessageKey | string;
  interactionCount: number;
  openCount: number;
  rollupKey: string;
  status: "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "FAILED";
  visibleMinutes: number;
};

type WidgetStoragePolicyPanelProps = HTMLAttributes<HTMLElement> & {
  devices?: WidgetRollupDevice[];
  onFlushOutbox?: () => void;
  onOpenSettings?: () => void;
  onRollupUsage?: () => void;
  rollupProgress?: number;
  summaryDateLabel?: string;
};

// enum→tone 매핑(layerTone/statusTone)은 유지하고, 라벨만 t()로 번역한다.
const layerCopy: Record<WidgetStorageLayer, MessageKey> = {
  LOCAL_CACHE: "widget.storage.layer.localCache",
  LOCAL_EVENT: "widget.storage.layer.localEvent",
  LOCAL_ROLLUP: "widget.storage.layer.localRollup",
  SERVER_ORIGINAL: "widget.storage.layer.serverOriginal",
  SERVER_STATE: "widget.storage.layer.serverState",
};

const layerTone: Record<WidgetStorageLayer, StatusTone> = {
  LOCAL_CACHE: "personal",
  LOCAL_EVENT: "pending",
  LOCAL_ROLLUP: "timer",
  SERVER_ORIGINAL: "room",
  SERVER_STATE: "success",
};

const statusCopy: Record<WidgetRollupDevice["status"], MessageKey> = {
  FAILED: "widget.storage.status.failed",
  LOCAL_ONLY: "widget.storage.status.localOnly",
  SYNCED: "widget.storage.status.synced",
  SYNC_PENDING: "widget.storage.status.syncPending",
};

const statusTone: Record<WidgetRollupDevice["status"], StatusTone> = {
  FAILED: "warning",
  LOCAL_ONLY: "personal",
  SYNCED: "success",
  SYNC_PENDING: "pending",
};

const defaultItems: WidgetStorageItem[] = [
  {
    description: "widget.storage.item.settings.description",
    id: "settings",
    label: "widget.storage.item.settings.label",
    layer: "SERVER_STATE",
    tags: ["widget.storage.item.settings.tag1", "widget.storage.item.settings.tag2", "widget.storage.item.settings.tag3"],
  },
  {
    description: "widget.storage.item.display.description",
    id: "display",
    label: "widget.storage.item.display.label",
    layer: "SERVER_ORIGINAL",
    tags: ["widget.storage.item.display.tag1", "widget.storage.item.display.tag2", "widget.storage.item.display.tag3", "widget.storage.item.display.tag4"],
  },
  {
    description: "widget.storage.item.itemState.description",
    id: "item-state",
    label: "widget.storage.item.itemState.label",
    layer: "SERVER_STATE",
    tags: ["widget.storage.item.itemState.tag1", "widget.storage.item.itemState.tag2", "widget.storage.item.itemState.tag3", "widget.storage.item.itemState.tag4"],
  },
  {
    description: "widget.storage.item.usageEvent.description",
    id: "usage-event",
    label: "widget.storage.item.usageEvent.label",
    layer: "LOCAL_EVENT",
    tags: ["widget.storage.item.usageEvent.tag1", "widget.storage.item.usageEvent.tag2", "widget.storage.item.usageEvent.tag3", "widget.storage.item.usageEvent.tag4"],
  },
  {
    description: "widget.storage.item.rollup.description",
    id: "rollup",
    label: "widget.storage.item.rollup.label",
    layer: "LOCAL_ROLLUP",
    tags: ["widget.storage.item.rollup.tag1", "widget.storage.item.rollup.tag2", "widget.storage.item.rollup.tag3", "widget.storage.item.rollup.tag4"],
  },
];

const defaultDevices: WidgetRollupDevice[] = [
  {
    bubbleType: "TODO",
    deviceLabel: "widget.storage.device.macbook",
    interactionCount: 18,
    openCount: 9,
    rollupKey: "today:todo:mac",
    status: "SYNCED",
    visibleMinutes: 74,
  },
  {
    bubbleType: "TIMER",
    deviceLabel: "widget.storage.device.imac",
    interactionCount: 6,
    openCount: 4,
    rollupKey: "today:timer:imac",
    status: "SYNC_PENDING",
    visibleMinutes: 42,
  },
  {
    bubbleType: "AGENT",
    deviceLabel: "widget.storage.device.macbook",
    interactionCount: 5,
    openCount: 3,
    rollupKey: "today:agent:mac",
    status: "LOCAL_ONLY",
    visibleMinutes: 16,
  },
];

export function WidgetStoragePolicyPanel({
  className,
  devices = defaultDevices,
  onFlushOutbox,
  onOpenSettings,
  onRollupUsage,
  rollupProgress = 72,
  summaryDateLabel,
  ...props
}: WidgetStoragePolicyPanelProps) {
  const { t } = useI18n();
  const resolvedDateLabel = summaryDateLabel ?? t("widget.storage.today");
  const pendingCount = devices.filter((device) => device.status === "SYNC_PENDING" || device.status === "FAILED").length;
  const totalVisibleMinutes = devices.reduce((sum, device) => sum + device.visibleMinutes, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <Layers3 size={22} />
          </span>
          <div>
            <StatusBadge tone="timer">{t("widget.storage.badge")}</StatusBadge>
            <h2>{t("widget.storage.title")}</h2>
            <p>{t("widget.storage.subtitle")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Settings2 size={15} />} onClick={onOpenSettings} size="sm" variant="quiet">
            {t("widget.storage.bubbleSettings")}
          </Button>
          <Button icon={<RefreshCcw size={15} />} onClick={onFlushOutbox} size="sm" variant="primary">
            {t("widget.storage.flushOutbox")}
          </Button>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <SummaryCard icon={<Server size={18} />} label={t("widget.storage.summaryServerLabel")} value={t("widget.storage.summaryServerValue")} />
        <SummaryCard icon={<Database size={18} />} label={t("widget.storage.summaryDeviceLabel")} value={t("widget.storage.summaryDeviceValue")} />
        <SummaryCard icon={<ArchiveRestore size={18} />} label={t("widget.storage.summaryDedupeLabel")} value={t("widget.storage.summaryDedupeValue")} />
      </div>

      <div className={styles.storageGrid} aria-label={t("widget.storage.gridAria")}>
        {defaultItems.map((item) => (
          <article className={styles.storageCard} key={item.id}>
            <div className={styles.cardHead}>
              <span aria-hidden="true">{itemIcon[item.id] ?? <Database size={17} />}</span>
              <StatusBadge tone={layerTone[item.layer]}>{t(layerCopy[item.layer])}</StatusBadge>
            </div>
            <h3>{t(item.label)}</h3>
            <p>{t(item.description)}</p>
            <div className={styles.tableList}>
              {item.tags.map((tag) => (
                <Chip key={tag}>{t(tag)}</Chip>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.rollupPanel}>
        <div className={styles.rollupHeader}>
          <div>
            <StatusBadge tone={pendingCount > 0 ? "pending" : "success"}>{t("widget.storage.pendingCount", { count: pendingCount })}</StatusBadge>
            <h3>{t("widget.storage.rollupTitle", { date: resolvedDateLabel })}</h3>
            <p>{t("widget.storage.rollupBody")}</p>
          </div>
          <div className={styles.rollupTotal}>
            <strong>{t("widget.storage.totalMinutes", { count: totalVisibleMinutes })}</strong>
            <span>{t("widget.storage.visibleTotal")}</span>
          </div>
        </div>
        <ProgressBar label={t("widget.storage.rollupProgress")} value={rollupProgress} />
        <div className={styles.deviceList} aria-label={t("widget.storage.deviceAria")}>
          {devices.map((device) => (
            <div className={styles.deviceItem} key={device.rollupKey}>
              <div>
                <strong>{t("widget.storage.deviceBubble", { type: device.bubbleType })}</strong>
                <span>{t(device.deviceLabel as MessageKey)}</span>
              </div>
              <div className={styles.deviceStats}>
                <Chip>{t("widget.storage.openCount", { count: device.openCount })}</Chip>
                <Chip>{t("widget.storage.interactionCount", { count: device.interactionCount })}</Chip>
                <Chip>{t("widget.storage.deviceMinutes", { count: device.visibleMinutes })}</Chip>
              </div>
              <StatusBadge tone={statusTone[device.status]}>{t(statusCopy[device.status])}</StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <footer className={styles.footer}>
        <div>
          <CheckCircle2 size={16} />
          {t("widget.storage.footerNote")}
        </div>
        <Button icon={<Activity size={14} />} onClick={onRollupUsage} size="sm" variant="ghost">
          {t("widget.storage.makeRollup")}
        </Button>
      </footer>
    </GlassPanel>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className={styles.summaryCard}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </article>
  );
}

const itemIcon: Record<string, ReactNode> = {
  display: <Eye size={17} />,
  "item-state": <CheckCircle2 size={17} />,
  rollup: <MonitorSmartphone size={17} />,
  settings: <Settings2 size={17} />,
  "usage-event": <Activity size={17} />,
};
