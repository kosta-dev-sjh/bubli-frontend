"use client";

import {
  ArrowRight,
  Cookie,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

import styles from "./auth-session-security-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type SessionItem = {
  device: string;
  lastUsed: string;
  location: string;
  status: "current" | "active" | "expired";
  storage: string;
};

function buildSessions(t: TranslateFn): SessionItem[] {
  return [
    {
      device: "MacBook Pro · Tauri",
      lastUsed: t("auth.security.device.now"),
      location: t("auth.security.location.seoul"),
      status: "current",
      storage: t("auth.security.device.storageDevice"),
    },
    {
      device: "Chrome · Web",
      lastUsed: t("auth.security.device.min18"),
      location: t("auth.security.location.seoul"),
      status: "active",
      storage: t("auth.security.device.storageBrowser"),
    },
    {
      device: "Safari · Web",
      lastUsed: t("auth.security.device.day31"),
      location: t("auth.security.location.seoul"),
      status: "expired",
      storage: t("auth.security.device.storageExpired"),
    },
  ];
}

const statusTone: Record<SessionItem["status"], "approved" | "pending" | "neutral"> = {
  active: "pending",
  current: "approved",
  expired: "neutral",
};

const statusLabelKey: Record<SessionItem["status"], MessageKey> = {
  active: "auth.security.device.state.active",
  current: "auth.security.device.state.current",
  expired: "auth.security.device.state.expired",
};

function SessionCard({ session, t }: { session: SessionItem; t: TranslateFn }) {
  return (
    <article className={styles.sessionCard}>
      <div className={styles.sessionTop}>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={statusTone[session.status]}>{t(statusLabelKey[session.status])}</StatusBadge>
            <StatusBadge tone="personal">{session.storage}</StatusBadge>
          </div>
          <h3>{session.device}</h3>
        </div>
        <span className="bubli-icon-tile" aria-hidden="true">
          <MonitorSmartphone size={16} strokeWidth={2.1} />
        </span>
      </div>
      <p>{t("auth.security.lastUsedAt", { location: session.location })}</p>
      <span className={styles.sessionMeta}>{session.lastUsed}</span>
    </article>
  );
}

export function AuthSessionSecurityPanel() {
  const { t } = useI18n();
  const sessions = buildSessions(t);

  return (
    <section className={styles.panel} aria-label={t("auth.security.panelAria")}>
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<ShieldCheck size={14} />} selected>
            {t("auth.security.chip")}
          </Chip>
          <h2>{t("auth.security.heroTitle")}</h2>
          <p>{t("auth.security.heroBody")}</p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="approved">{t("auth.security.summaryBadge")}</StatusBadge>
          <strong>{t("auth.security.summaryValue")}</strong>
          <span>{t("auth.security.summaryCaption")}</span>
          <ProgressBar label={t("auth.security.summaryProgress")} value={84} />
        </div>
      </GlassPanel>

      <div className={styles.policyGrid}>
        <GlassPanel className={styles.policyCard}>
          <div className={styles.policyHeader}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Cookie size={16} strokeWidth={2.1} />
            </span>
            <div>
              <StatusBadge tone="room">{t("auth.security.web.badge")}</StatusBadge>
              <h3>{t("auth.security.web.title")}</h3>
              <p>{t("auth.security.web.desc")}</p>
            </div>
          </div>
          <div className={styles.chips}>
            <Chip>{t("auth.security.web.chipProtect")}</Chip>
            <Chip>{t("auth.security.web.chipVerify")}</Chip>
            <Chip>{t("auth.security.web.chipRefresh")}</Chip>
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyCard}>
          <div className={styles.policyHeader}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <LockKeyhole size={16} strokeWidth={2.1} />
            </span>
            <div>
              <StatusBadge tone="personal">Tauri</StatusBadge>
              <h3>{t("auth.security.app.title")}</h3>
              <p>{t("auth.security.app.desc")}</p>
            </div>
          </div>
          <div className={styles.chips}>
            <Chip>{t("auth.security.app.chipKeychain")}</Chip>
            <Chip>{t("auth.security.app.chipCredential")}</Chip>
            <Chip>{t("auth.security.app.chipVault")}</Chip>
          </div>
        </GlassPanel>
      </div>

      <div className={styles.flow}>
        <span>{t("auth.security.flow.login")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("auth.security.flow.issue")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("auth.security.flow.store")}</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>{t("auth.security.flow.retry")}</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.sessions}>
          <div className={styles.sectionTitle}>
            <h3>{t("auth.security.sessionsTitle")}</h3>
            <p>{t("auth.security.sessionsDesc")}</p>
          </div>
          <div className={styles.sessionList}>
            {sessions.map((session) => (
              <SessionCard key={session.device} session={session} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rules}>
          <h3>{t("auth.security.rulesTitle")}</h3>
          <div className={styles.ruleList}>
            <article className={styles.ruleCard}>
              <code>{t("auth.security.rule.expire.code")}</code>
              <h4>{t("auth.security.rule.expire.title")}</h4>
              <p>{t("auth.security.rule.expire.desc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("auth.security.rule.refresh.code")}</code>
              <h4>{t("auth.security.rule.refresh.title")}</h4>
              <p>{t("auth.security.rule.refresh.desc")}</p>
            </article>
            <article className={styles.ruleCard}>
              <code>{t("auth.security.rule.realtime.code")}</code>
              <h4>{t("auth.security.rule.realtime.title")}</h4>
              <p>{t("auth.security.rule.realtime.desc")}</p>
            </article>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
