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
import { useI18n, type MessageKey } from "@/lib/i18n";

import styles from "./resource-comment-thread-panel.module.css";

type CommentStatus = "확인 필요" | "답글" | "후보";

const comments: {
  author: string;
  initials: string;
  role: string;
  time: string;
  body: string;
  status: CommentStatus;
  tagged: string[];
}[] = [
  {
    author: "김정현",
    initials: "JH",
    role: "프로젝트 리더",
    time: "10:24",
    body: "검수 기준 문장이 계약서와 요구사항 문서에서 조금 다르게 적혀 있어요. 최종 검수 횟수는 이 자료 기준으로 확인하면 좋겠습니다.",
    status: "확인 필요",
    tagged: ["이준호"],
  },
  {
    author: "이준호",
    initials: "JH",
    role: "멤버",
    time: "10:31",
    body: "관련 회의록에는 중간 검수 1회, 최종 검수 1회로 적혀 있습니다. 자료 관계에 회의록도 같이 묶어두겠습니다.",
    status: "답글",
    tagged: ["김정현", "박미연"],
  },
  {
    author: "프로젝트룸 에이전트",
    initials: "AI",
    role: "후보 제안",
    time: "10:38",
    body: "확인 질문 후보: 검수 기준은 계약서의 표현을 따르는지, 회의록의 검수 횟수를 따르는지 클라이언트에게 확인할 수 있습니다.",
    status: "후보",
    tagged: [],
  },
];

const statusCopy: Record<CommentStatus, MessageKey> = {
  "확인 필요": "resources.comment.statusReview",
  답글: "resources.comment.statusReply",
  후보: "resources.comment.statusCandidate",
};

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
            <article className={styles.comment} key={`${comment.author}-${comment.time}`}>
              <div className={styles.commentHead}>
                <div className={styles.author}>
                  <span className={styles.avatar}>{comment.initials}</span>
                  <span className={styles.authorText}>
                    <strong>{comment.author}</strong>
                    <span>
                      {comment.role} · {comment.time}
                    </span>
                  </span>
                </div>
                <StatusBadge tone={comment.status === "후보" ? "agent" : comment.status === "확인 필요" ? "warning" : "communication"}>
                  {t(statusCopy[comment.status])}
                </StatusBadge>
              </div>
              <p className={styles.commentBody}>{comment.body}</p>
              <div className={styles.commentMeta}>
                {comment.tagged.length > 0 ? (
                  comment.tagged.map((member) => <Chip key={member}>{t("resources.comment.tagPrefix", { member })}</Chip>)
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
              defaultValue="검수 기준과 수정 범위를 이 자료에 연결해서 남겨둘게요."
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
              <strong>용역 계약서_최종본_v2.1.pdf</strong>
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
