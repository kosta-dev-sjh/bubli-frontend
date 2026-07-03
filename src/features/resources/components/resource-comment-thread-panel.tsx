"use client";

import {
  BellRing,
  CheckCircle2,
  FileText,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import type { StatusTone } from "@/components/ui/status-badge";

import styles from "./resource-comment-thread-panel.module.css";

type CommentEntry = {
  authorKey: MessageKey;
  initials: string;
  roleKey: MessageKey;
  time: string;
  bodyKey: MessageKey;
  statusKey: MessageKey;
  statusTone: StatusTone;
  tagged: MessageKey[];
};

const comments: CommentEntry[] = [
  {
    authorKey: "resources.comment.authorLeader",
    initials: "JH",
    roleKey: "resources.comment.roleLeader",
    time: "10:24",
    bodyKey: "resources.comment.body1",
    statusKey: "resources.comment.statusReview",
    statusTone: "warning",
    tagged: ["resources.comment.taggedLeeJunho"],
  },
  {
    authorKey: "resources.comment.authorLeeJunho",
    initials: "JH",
    roleKey: "resources.comment.roleMember",
    time: "10:31",
    bodyKey: "resources.comment.body2",
    statusKey: "resources.comment.statusReply",
    statusTone: "communication",
    tagged: ["resources.comment.roleLeader", "resources.comment.taggedReviewMember"],
  },
  {
    authorKey: "resources.comment.authorAgent",
    initials: "AI",
    roleKey: "resources.comment.roleAgentSuggestion",
    time: "10:38",
    bodyKey: "resources.comment.body3",
    statusKey: "resources.comment.statusCandidate",
    statusTone: "agent",
    tagged: [],
  },
];

const taggedMembers: MessageKey[] = [
  "resources.comment.tagged1",
  "resources.comment.tagged2",
  "resources.comment.tagged3",
];

const checks: MessageKey[] = [
  "resources.comment.check1",
  "resources.comment.check2",
  "resources.comment.check3",
  "resources.comment.check4",
];

const apiRows = [
  ["POST", "/api/resources/{id}/comments"],
  ["GET", "/api/resources/{id}/comments"],
  ["GET", "/api/notifications"],
  ["PATCH", "/api/notifications/{id}/read"],
];

export function ResourceCommentThreadPanel() {
  const { t } = useI18n();
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <MessageSquareText size={16} aria-hidden="true" />
          {t("resources.comment.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("resources.comment.title")}</h2>
            <p className={styles.summary}>{t("resources.comment.summary")}</p>
          </div>
          <StatusBadge tone="room">resource_comments</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("resources.comment.chipsAria")}>
          <Chip selected icon={<FileText size={14} aria-hidden="true" />}>
            {t("resources.comment.chipRoomScope")}
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>{t("resources.comment.chipTagNotify")}</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>{t("resources.comment.chipPermission")}</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label={t("resources.comment.threadAria")}>
        <div className={styles.thread}>
          {comments.map((comment) => (
            <article className={styles.comment} key={`${comment.authorKey}-${comment.time}`}>
              <div className={styles.commentHead}>
                <div className={styles.author}>
                  <span className={styles.avatar}>{comment.initials}</span>
                  <span className={styles.authorText}>
                    <strong>{t(comment.authorKey)}</strong>
                    <span>
                      {t(comment.roleKey)} · {comment.time}
                    </span>
                  </span>
                </div>
                <StatusBadge tone={comment.statusTone}>{t(comment.statusKey)}</StatusBadge>
              </div>
              <p className={styles.commentBody}>{t(comment.bodyKey)}</p>
              <div className={styles.commentMeta}>
                {comment.tagged.length > 0 ? (
                  comment.tagged.map((member) => (
                    <Chip key={member}>
                      {t("resources.comment.tagPrefix")} {t(member)}
                    </Chip>
                  ))
                ) : (
                  <Chip>{t("resources.comment.tagNone")}</Chip>
                )}
                <Chip>{t("resources.comment.keepInDetail")}</Chip>
              </div>
            </article>
          ))}

          <div className={styles.composer}>
            <div className={styles.composerLabel}>
              <h3>{t("resources.comment.composeHeading")}</h3>
              <StatusBadge tone="pending">{t("resources.comment.composeSaveBadge")}</StatusBadge>
            </div>
            <textarea
              className={styles.textarea}
              defaultValue={t("resources.comment.composeDefault")}
              aria-label={t("resources.comment.composeInputAria")}
            />
            <div className={styles.commentMeta}>
              <Chip selected>{t("resources.comment.composeChipRoom")}</Chip>
              <Chip>{t("resources.comment.composeChipTag")}</Chip>
              <Chip>{t("resources.comment.composeChipNotify")}</Chip>
            </div>
          </div>
        </div>

        <aside className={styles.side} aria-label={t("resources.comment.sideAria")}>
          <section className={styles.sideCard}>
            <h3>{t("resources.comment.linkedHeading")}</h3>
            <div className={styles.resourceBox}>
              <strong>{t("resources.comment.linkedFileName")}</strong>
              <span>{t("resources.comment.linkedScope")}</span>
              <div className={styles.commentMeta}>
                <Chip>{t("resources.comment.linkedCount")}</Chip>
                <Chip>{t("resources.comment.linkedVersion")}</Chip>
              </div>
            </div>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("resources.comment.tagNotifyHeading")}</h3>
            <ul className={styles.memberList}>
              {taggedMembers.map((item) => (
                <li className={styles.memberItem} key={item}>
                  <UsersRound size={16} aria-hidden="true" />
                  <span>{t(item)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("resources.comment.checksHeading")}</h3>
            <ul className={styles.checks}>
              {checks.map((item) => (
                <li className={styles.checkItem} key={item}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{t(item)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.sideCard}>
            <h3>{t("resources.comment.apiHeading")}</h3>
            <div className={styles.apiList}>
              {apiRows.map(([method, path]) => (
                <div className={styles.apiRow} key={path}>
                  <StatusBadge tone={method === "GET" ? "success" : "pending"}>{method}</StatusBadge>
                  <span className={styles.apiPath}>{path}</span>
                </div>
              ))}
            </div>
            <div className={styles.memberItem}>
              <UserRound size={16} aria-hidden="true" />
              <span>{t("resources.comment.apiNote")}</span>
            </div>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
