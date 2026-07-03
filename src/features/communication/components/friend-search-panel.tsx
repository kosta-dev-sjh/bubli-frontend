"use client";

import { CheckCircle2, Clock3, MessageCircle, Search, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./friend-search-panel.module.css";

type SearchResultStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "FRIEND" | "BLOCKED";

type FriendSearchResult = {
  bubliId: string;
  displayNameKey: MessageKey;
  id: string;
  lastProjectKey?: MessageKey;
  status: SearchResultStatus;
};

const searchResults: FriendSearchResult[] = [
  {
    bubliId: "miyeon",
    displayNameKey: "chat.friendSearchPanel.result1Name",
    id: "user-1",
    lastProjectKey: "chat.friendSearchPanel.result1Project",
    status: "NONE",
  },
  {
    bubliId: "junhwa",
    displayNameKey: "chat.friendSearchPanel.result2Name",
    id: "user-2",
    lastProjectKey: "chat.friendSearchPanel.result2Project",
    status: "PENDING_SENT",
  },
  {
    bubliId: "damin",
    displayNameKey: "chat.friendSearchPanel.result3Name",
    id: "user-3",
    lastProjectKey: "chat.friendSearchPanel.result3Project",
    status: "FRIEND",
  },
  {
    bubliId: "blocked-user",
    displayNameKey: "chat.friendSearchPanel.result4Name",
    id: "user-4",
    status: "BLOCKED",
  },
];

const statusCopy: Record<SearchResultStatus, { labelKey: MessageKey; tone: "neutral" | "pending" | "success" | "warning" }> = {
  BLOCKED: { labelKey: "chat.friendSearchPanel.statusBlocked", tone: "warning" },
  FRIEND: { labelKey: "chat.friendSearchPanel.statusFriend", tone: "success" },
  NONE: { labelKey: "chat.friendSearchPanel.statusNone", tone: "neutral" },
  PENDING_RECEIVED: { labelKey: "chat.friendSearchPanel.statusPendingReceived", tone: "pending" },
  PENDING_SENT: { labelKey: "chat.friendSearchPanel.statusPendingSent", tone: "pending" },
};

export function FriendSearchPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>{t("chat.friendSearchPanel.chip")}</Chip>
          <h2 className={styles.title}>{t("chat.friendSearchPanel.title")}</h2>
          <p className={styles.description}>
            {t("chat.friendSearchPanel.description")}
          </p>
        </div>
        <StatusBadge tone="room">{t("chat.friendSearchPanel.badge")}</StatusBadge>
      </header>

      <form className={styles.searchBox} aria-label={t("chat.friendSearchPanel.searchAria")}>
        <label className={styles.inputLabel} htmlFor="bubli-id-search">
          Bubli ID
        </label>
        <div className={styles.inputWrap}>
          <Search aria-hidden="true" size={18} />
          <input id="bubli-id-search" placeholder={t("chat.friendSearchPanel.placeholder")} type="search" />
        </div>
        <Button icon={<Search size={16} />} variant="primary">
          {t("chat.friendSearchPanel.search")}
        </Button>
      </form>

      <div className={styles.flowLine} aria-label={t("chat.friendSearchPanel.flowAria")}>
        <FlowStep icon={<Search size={16} />} label={t("chat.friendSearchPanel.flowSearch")} />
        <FlowStep icon={<UserPlus size={16} />} label={t("chat.friendSearchPanel.flowRequest")} />
        <FlowStep icon={<CheckCircle2 size={16} />} label={t("chat.friendSearchPanel.flowAccept")} />
        <FlowStep icon={<MessageCircle size={16} />} label={t("chat.friendSearchPanel.flowDirect")} />
      </div>

      <section className={styles.resultSection} aria-labelledby="friend-search-result-title">
        <div className={styles.sectionHeader}>
          <h3 id="friend-search-result-title">{t("chat.friendSearchPanel.resultTitle")}</h3>
          <span>{t("chat.friendSearchPanel.resultSubtitle")}</span>
        </div>
        <div className={styles.resultList}>
          {searchResults.map((result) => (
            <FriendSearchResultRow key={result.id} result={result} />
          ))}
        </div>
      </section>
    </GlassPanel>
  );
}

function FlowStep({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className={styles.flowStep}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function FriendSearchResultRow({ result }: { result: FriendSearchResult }) {
  const { t } = useI18n();
  const status = statusCopy[result.status];

  return (
    <article className={cn(styles.resultRow, result.status === "BLOCKED" && styles.resultRowMuted)}>
      <Avatar name={t(result.displayNameKey)} muted={result.status === "BLOCKED"} />
      <div className={styles.resultMain}>
        <strong>{t(result.displayNameKey)}</strong>
        <span>
          @{result.bubliId}
          {result.lastProjectKey ? ` · ${t(result.lastProjectKey)}` : ""}
        </span>
      </div>
      <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
      <ResultAction status={result.status} />
    </article>
  );
}

function ResultAction({ status }: { status: SearchResultStatus }) {
  const { t } = useI18n();

  if (status === "NONE") {
    return (
      <Button icon={<UserPlus size={15} />} size="sm" variant="primary">
        {t("chat.friendSearchPanel.actionRequest")}
      </Button>
    );
  }

  if (status === "PENDING_SENT") {
    return (
      <Button icon={<Clock3 size={15} />} size="sm" variant="quiet">
        {t("chat.friendSearchPanel.actionCheckSent")}
      </Button>
    );
  }

  if (status === "PENDING_RECEIVED") {
    return (
      <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
        {t("chat.friendSearchPanel.actionAccept")}
      </Button>
    );
  }

  if (status === "FRIEND") {
    return (
      <div className={styles.actionPair}>
        <Button icon={<MessageCircle size={15} />} size="sm" variant="quiet">
          {t("chat.friendSearchPanel.actionDirect")}
        </Button>
        <Button icon={<UsersRound size={15} />} size="sm" variant="secondary">
          {t("chat.friendSearchPanel.actionInviteTarget")}
        </Button>
      </div>
    );
  }

  return (
    <Button disabled icon={<ShieldAlert size={15} />} size="sm" variant="ghost">
      {t("chat.friendSearchPanel.actionBlocked")}
    </Button>
  );
}

function Avatar({ muted = false, name }: { muted?: boolean; name: string }) {
  return (
    <span className={cn(styles.avatar, muted && styles.avatarMuted)} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}
