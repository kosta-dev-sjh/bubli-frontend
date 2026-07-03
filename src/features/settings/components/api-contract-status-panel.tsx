"use client";

import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  FileUp,
  KeyRound,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./api-contract-status-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type ContractStatus = "ready" | "needsBackendSample" | "watching";
type ContractId = "auth" | "upload" | "chat" | "ws" | "voice" | "agent" | "tauri";
type ContractArea = {
  checkKeys: MessageKey[];
  descKey: MessageKey;
  endpointKey: MessageKey;
  id: ContractId;
  labelKey: MessageKey;
  ownerKey: MessageKey;
  progress: number;
  status: ContractStatus;
};

const contracts: ContractArea[] = [
  {
    checkKeys: ["settings.acs.auth.check1", "settings.acs.auth.check2"],
    descKey: "settings.acs.auth.desc",
    endpointKey: "settings.acs.auth.endpoint",
    id: "auth",
    labelKey: "settings.acs.auth.label",
    ownerKey: "settings.acs.auth.owner",
    progress: 82,
    status: "needsBackendSample",
  },
  {
    checkKeys: ["settings.acs.upload.check1", "settings.acs.upload.check2", "settings.acs.upload.check3"],
    descKey: "settings.acs.upload.desc",
    endpointKey: "settings.acs.upload.endpoint",
    id: "upload",
    labelKey: "settings.acs.upload.label",
    ownerKey: "settings.acs.upload.owner",
    progress: 76,
    status: "watching",
  },
  {
    checkKeys: ["settings.acs.chat.check1", "settings.acs.chat.check2", "settings.acs.chat.check3"],
    descKey: "settings.acs.chat.desc",
    endpointKey: "settings.acs.chat.endpoint",
    id: "chat",
    labelKey: "settings.acs.chat.label",
    ownerKey: "settings.acs.chat.owner",
    progress: 88,
    status: "ready",
  },
  {
    checkKeys: ["settings.acs.ws.check1", "settings.acs.ws.check2"],
    descKey: "settings.acs.ws.desc",
    endpointKey: "settings.acs.ws.endpoint",
    id: "ws",
    labelKey: "settings.acs.ws.label",
    ownerKey: "settings.acs.ws.owner",
    progress: 72,
    status: "needsBackendSample",
  },
  {
    checkKeys: ["settings.acs.voice.check1", "settings.acs.voice.check2", "settings.acs.voice.check3"],
    descKey: "settings.acs.voice.desc",
    endpointKey: "settings.acs.voice.endpoint",
    id: "voice",
    labelKey: "settings.acs.voice.label",
    ownerKey: "settings.acs.voice.owner",
    progress: 79,
    status: "ready",
  },
  {
    checkKeys: ["settings.acs.agent.check1", "settings.acs.agent.check2", "settings.acs.agent.check3"],
    descKey: "settings.acs.agent.desc",
    endpointKey: "settings.acs.agent.endpoint",
    id: "agent",
    labelKey: "settings.acs.agent.label",
    ownerKey: "settings.acs.agent.owner",
    progress: 86,
    status: "ready",
  },
  {
    checkKeys: ["settings.acs.tauri.check1", "settings.acs.tauri.check2", "settings.acs.tauri.check3"],
    descKey: "settings.acs.tauri.desc",
    endpointKey: "settings.acs.tauri.endpoint",
    id: "tauri",
    labelKey: "settings.acs.tauri.label",
    ownerKey: "settings.acs.tauri.owner",
    progress: 68,
    status: "watching",
  },
];

const statusMeta: Record<ContractStatus, { labelKey: MessageKey; tone: "approved" | "warning" | "pending" }> = {
  needsBackendSample: { labelKey: "settings.acs.status.needsSample", tone: "warning" },
  ready: { labelKey: "settings.acs.status.ready", tone: "approved" },
  watching: { labelKey: "settings.acs.status.watching", tone: "pending" },
};

const iconMap: Record<ContractId, typeof KeyRound> = {
  agent: Bot,
  auth: KeyRound,
  chat: MessageSquareText,
  tauri: Database,
  upload: FileUp,
  voice: RadioTower,
  ws: Bell,
};

function ContractCard({ item, t }: { item: ContractArea; t: TranslateFn }) {
  const status = statusMeta[item.status];
  const Icon = iconMap[item.id] ?? ShieldCheck;
  const label = t(item.labelKey);

  return (
    <article className={styles.contractCard}>
      <div className={styles.cardTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            <StatusBadge tone="neutral">{t(item.ownerKey)}</StatusBadge>
          </div>
          <h3>{label}</h3>
          <p>{t(item.descKey)}</p>
        </div>
        <StatusBadge tone="agent">{t(item.endpointKey)}</StatusBadge>
      </div>
      <div className={styles.chips}>
        {item.checkKeys.map((checkKey) => (
          <Chip icon={<CheckCircle2 size={14} />} key={checkKey}>
            {t(checkKey)}
          </Chip>
        ))}
      </div>
      <ProgressBar label={t("settings.acs.progressReflected", { label })} value={item.progress} />
    </article>
  );
}

export function ApiContractStatusPanel() {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-label={t("settings.acs.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<ShieldCheck size={14} />} selected>
            {t("settings.acs.chip")}
          </Chip>
          <h2>{t("settings.acs.heroTitle")}</h2>
          <p>{t("settings.acs.heroBody")}</p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="approved">{t("settings.acs.baseFixed")}</StatusBadge>
          <strong>{t("settings.acs.sevenCount")}</strong>
          <span>{t("settings.acs.axisCheck")}</span>
          <ProgressBar label={t("settings.acs.readiness")} value={79} />
        </div>
      </GlassPanel>

      <div className={styles.flow}>
        <span>{t("settings.acs.flowPlan")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("settings.acs.flowBackend")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("settings.acs.flowFront")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("settings.acs.flowScreen")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.list}>
          <div className={styles.sectionTitle}>
            <h3>{t("settings.acs.listTitle")}</h3>
            <p>{t("settings.acs.listDesc")}</p>
          </div>
          <div className={styles.items}>
            {contracts.map((item) => (
              <ContractCard item={item} key={item.id} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.requests}>
          <h3>{t("settings.acs.requestsTitle")}</h3>
          <article className={styles.requestCard}>
            <code>auth.http</code>
            <h4>{t("settings.acs.req.authTitle")}</h4>
            <p>{t("settings.acs.req.authBody")}</p>
          </article>
          <article className={styles.requestCard}>
            <code>Swagger/OpenAPI</code>
            <h4>{t("settings.acs.req.swaggerTitle")}</h4>
            <p>{t("settings.acs.req.swaggerBody")}</p>
          </article>
          <article className={styles.requestCard}>
            <code>WebSocket sample</code>
            <h4>{t("settings.acs.req.wsTitle")}</h4>
            <p>{t("settings.acs.req.wsBody")}</p>
          </article>
          <article className={styles.requestCard}>
            <code>voice.http</code>
            <h4>{t("settings.acs.req.voiceTitle")}</h4>
            <p>{t("settings.acs.req.voiceBody")}</p>
          </article>
        </GlassPanel>
      </div>
    </section>
  );
}
