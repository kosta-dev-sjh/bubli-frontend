"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cookie,
  KeyRound,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./auth-refresh-rotation-boundary-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type RotationStep = {
  description: string;
  icon: typeof KeyRound;
  label: string;
  storage: string;
  tone: "approved" | "pending" | "personal" | "warning";
};

type SessionCase = {
  action: string;
  code: string;
  description: string;
  label: string;
  tone: "approved" | "pending" | "warning";
};

type DeviceSession = {
  device: string;
  lastUsed: string;
  sessionState: "current" | "active" | "revoked";
  storage: string;
};

function buildRotationSteps(t: TranslateFn): RotationStep[] {
  return [
    {
      description: t("auth.rotation.step.short.desc"),
      icon: KeyRound,
      label: t("auth.rotation.step.short.label"),
      storage: t("auth.rotation.step.short.storage"),
      tone: "pending",
    },
    {
      description: t("auth.rotation.step.web.desc"),
      icon: Cookie,
      label: t("auth.rotation.step.web.label"),
      storage: t("auth.rotation.step.web.storage"),
      tone: "approved",
    },
    {
      description: t("auth.rotation.step.app.desc"),
      icon: LockKeyhole,
      label: t("auth.rotation.step.app.label"),
      storage: t("auth.rotation.step.app.storage"),
      tone: "personal",
    },
    {
      description: t("auth.rotation.step.refresh.desc"),
      icon: RefreshCcw,
      label: t("auth.rotation.step.refresh.label"),
      storage: t("auth.rotation.step.refresh.storage"),
      tone: "warning",
    },
  ];
}

function buildSessionCases(t: TranslateFn): SessionCase[] {
  return [
    {
      action: t("auth.rotation.case.expire.action"),
      code: t("auth.rotation.case.expire.code"),
      description: t("auth.rotation.case.expire.desc"),
      label: t("auth.rotation.case.expire.label"),
      tone: "pending",
    },
    {
      action: t("auth.rotation.case.keepExpire.action"),
      code: t("auth.rotation.case.keepExpire.code"),
      description: t("auth.rotation.case.keepExpire.desc"),
      label: t("auth.rotation.case.keepExpire.label"),
      tone: "warning",
    },
    {
      action: t("auth.rotation.case.reuse.action"),
      code: t("auth.rotation.case.reuse.code"),
      description: t("auth.rotation.case.reuse.desc"),
      label: t("auth.rotation.case.reuse.label"),
      tone: "warning",
    },
    {
      action: t("auth.rotation.case.realtime.action"),
      code: t("auth.rotation.case.realtime.code"),
      description: t("auth.rotation.case.realtime.desc"),
      label: t("auth.rotation.case.realtime.label"),
      tone: "approved",
    },
  ];
}

function buildDeviceSessions(t: TranslateFn): DeviceSession[] {
  return [
    {
      device: "MacBook Pro · Tauri",
      lastUsed: t("auth.rotation.device.now"),
      sessionState: "current",
      storage: t("auth.rotation.device.storageDevice"),
    },
    {
      device: "Chrome · Web",
      lastUsed: t("auth.rotation.device.min18"),
      sessionState: "active",
      storage: t("auth.rotation.device.storageBrowser"),
    },
    {
      device: "Safari · Web",
      lastUsed: t("auth.rotation.device.day31"),
      sessionState: "revoked",
      storage: t("auth.rotation.device.storageRevoked"),
    },
  ];
}

const sessionStateTone: Record<DeviceSession["sessionState"], "approved" | "pending" | "neutral"> = {
  active: "pending",
  current: "approved",
  revoked: "neutral",
};

const sessionStateLabelKey: Record<DeviceSession["sessionState"], MessageKey> = {
  active: "auth.rotation.device.state.active",
  current: "auth.rotation.device.state.current",
  revoked: "auth.rotation.device.state.revoked",
};

function RotationCard({ step }: { step: RotationStep }) {
  const Icon = step.icon;

  return (
    <article className={styles.rotationCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.badges}>
          <StatusBadge tone={step.tone}>{step.storage}</StatusBadge>
        </div>
        <h3>{step.label}</h3>
        <p>{step.description}</p>
      </div>
    </article>
  );
}

function SessionCaseCard({ item, t }: { item: SessionCase; t: TranslateFn }) {
  return (
    <article className={styles.caseCard}>
      <div className={styles.caseTop}>
        <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
        <code>{item.code}</code>
      </div>
      <p>{item.description}</p>
      <div className={styles.actionRow}>
        <span>{t("auth.rotation.frontAction")}</span>
        <strong>{item.action}</strong>
      </div>
    </article>
  );
}

function DeviceSessionRow({ session, t }: { session: DeviceSession; t: TranslateFn }) {
  return (
    <article className={styles.deviceRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <MonitorSmartphone size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.deviceMeta}>
          <StatusBadge tone={sessionStateTone[session.sessionState]}>{t(sessionStateLabelKey[session.sessionState])}</StatusBadge>
          <StatusBadge tone="personal">{session.storage}</StatusBadge>
        </div>
        <h4>{session.device}</h4>
        <p>{session.lastUsed}</p>
      </div>
    </article>
  );
}

export function AuthRefreshRotationBoundaryPanel() {
  const { t } = useI18n();
  const rotationSteps = buildRotationSteps(t);
  const sessionCases = buildSessionCases(t);
  const deviceSessions = buildDeviceSessions(t);

  return (
    <section className={styles.panel} aria-label={t("auth.rotation.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            {t("auth.rotation.chip")}
          </Chip>
          <h2>{t("auth.rotation.heroTitle")}</h2>
          <p>{t("auth.rotation.heroBody")}</p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">{t("auth.rotation.metricBadge")}</StatusBadge>
          <strong>{t("auth.rotation.metricValue")}</strong>
          <span>{t("auth.rotation.metricCaption")}</span>
          <ProgressBar label={t("auth.rotation.metricProgress")} value={88} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>{t("auth.rotation.flowTitle")}</h3>
          <p>{t("auth.rotation.flowDesc")}</p>
        </div>
        <div className={styles.rotationGrid}>
          {rotationSteps.map((step, index) => (
            <div className={styles.rotationSlot} key={step.label}>
              <RotationCard step={step} />
              {index < rotationSteps.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.casePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("auth.rotation.caseTitle")}</h3>
            <p>{t("auth.rotation.caseDesc")}</p>
          </div>
          <div className={styles.caseGrid}>
            {sessionCases.map((item) => (
              <SessionCaseCard item={item} key={item.code} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.devicePanel}>
          <div className={styles.sectionTitle}>
            <h3>{t("auth.rotation.deviceTitle")}</h3>
            <p>{t("auth.rotation.deviceDesc")}</p>
          </div>
          <div className={styles.deviceList}>
            {deviceSessions.map((session) => (
              <DeviceSessionRow key={session.device} session={session} t={t} />
            ))}
          </div>
          <div className={styles.notice}>
            <AlertTriangle size={16} strokeWidth={2.1} />
            <p>{t("auth.rotation.noticeReuse")}</p>
          </div>
          <div className={styles.notice}>
            <RadioTower size={16} strokeWidth={2.1} />
            <p>{t("auth.rotation.noticeRealtime")}</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>{t("auth.rotation.noStore")}</Chip>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footerPanel}>
        <LogOut size={18} strokeWidth={2.1} />
        <p>{t("auth.rotation.footer")}</p>
        <StatusBadge tone="approved">{t("auth.rotation.footerBadgeLogout")}</StatusBadge>
        <StatusBadge tone="pending">{t("auth.rotation.footerBadgeRefresh")}</StatusBadge>
      </GlassPanel>
    </section>
  );
}
