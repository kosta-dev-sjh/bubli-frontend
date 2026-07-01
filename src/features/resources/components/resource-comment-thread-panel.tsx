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

import styles from "./resource-comment-thread-panel.module.css";

const comments = [
  {
    author: "멤버 A",
    initials: "BU",
    role: "프로젝트 리더",
    time: "10:24",
    body: "검수 기준 문장이 업무 기준 문서와 요구사항 문서에서 조금 다르게 적혀 있어요. 최종 검수 횟수는 이 자료 기준으로 확인하면 좋겠습니다.",
    status: "확인 필요",
    tagged: ["이준호"],
  },
  {
    author: "이준호",
    initials: "BU",
    role: "멤버",
    time: "10:31",
    body: "관련 회의록에는 중간 검수 1회, 최종 검수 1회로 적혀 있습니다. 자료 관계에 회의록도 같이 묶어두겠습니다.",
    status: "답글",
    tagged: ["멤버 A", "멤버 C"],
  },
  {
    author: "프로젝트룸 에이전트",
    initials: "AI",
    role: "후보 제안",
    time: "10:38",
    body: "확인 질문 후보: 검수 기준은 업무 기준 문서의 표현을 따르는지, 회의록의 검수 횟수를 따르는지 클라이언트에게 확인할 수 있습니다.",
    status: "후보",
    tagged: [],
  },
];

const taggedMembers = [
  "태그된 멤버에게 개인 알림을 보냅니다.",
  "댓글 작성 이력은 멤버가 나가도 보존합니다.",
  "프로젝트룸 자료 접근 권한이 있는 멤버만 댓글을 봅니다.",
];

const checks = [
  "자료 댓글은 프로젝트룸 자료에 우선 적용합니다.",
  "댓글 알림은 사용자별 알림 설정을 따릅니다.",
  "에이전트 댓글은 질문 후보를 제안할 뿐 사용자가 확인하기 전까지 후보 상태입니다.",
  "프로젝트룸 밖 사용자와 나간 멤버는 자료 댓글과 자료 상세에 접근하지 않습니다.",
];

const apiRows = [
  ["POST", "/api/resources/{id}/comments"],
  ["GET", "/api/resources/{id}/comments"],
  ["GET", "/api/notifications"],
  ["PATCH", "/api/notifications/{id}/read"],
];

export function ResourceCommentThreadPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <MessageSquareText size={16} aria-hidden="true" />
          프로젝트룸 자료 댓글
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>자료의 확인 대화를 댓글과 알림으로 남깁니다</h2>
            <p className={styles.summary}>
              프로젝트룸 자료에 남긴 댓글은 자료 접근 권한을 기준으로 보이고, 태그된 멤버에게는 개인 알림으로 이어집니다. 채팅처럼
              흘러가도 자료와 연결된 기록은 자료 상세에 남깁니다.
            </p>
          </div>
          <StatusBadge tone="room">resource_comments</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="자료 댓글 핵심 기준">
          <Chip selected icon={<FileText size={14} aria-hidden="true" />}>
            프로젝트룸 자료 기준
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>태그 알림</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>자료 권한 확인</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label="자료 댓글 스레드">
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
                  {comment.status}
                </StatusBadge>
              </div>
              <p className={styles.commentBody}>{comment.body}</p>
              <div className={styles.commentMeta}>
                {comment.tagged.length > 0 ? comment.tagged.map((member) => <Chip key={member}>태그 {member}</Chip>) : <Chip>태그 없음</Chip>}
                <Chip>자료 상세에 보관</Chip>
              </div>
            </article>
          ))}

          <div className={styles.composer}>
            <div className={styles.composerLabel}>
              <h3>댓글 작성</h3>
              <StatusBadge tone="pending">권한 확인 후 저장</StatusBadge>
            </div>
            <textarea
              className={styles.textarea}
              defaultValue="검수 기준과 수정 범위를 이 자료에 연결해서 남겨둘게요."
              aria-label="자료 댓글 입력"
            />
            <div className={styles.commentMeta}>
              <Chip selected>프로젝트룸 자료</Chip>
              <Chip>태그 멤버 선택</Chip>
              <Chip>알림 생성</Chip>
            </div>
          </div>
        </div>

        <aside className={styles.side} aria-label="댓글 저장과 알림 기준">
          <section className={styles.sideCard}>
            <h3>연결된 자료</h3>
            <div className={styles.resourceBox}>
              <strong>용역 업무 기준 문서_최종본_v2.1.pdf</strong>
              <span>프로젝트룸 자료 · 프로젝트룸 멤버만 접근</span>
              <div className={styles.commentMeta}>
                <Chip>댓글 3개</Chip>
                <Chip>버전 v2</Chip>
              </div>
            </div>
          </section>

          <section className={styles.sideCard}>
            <h3>태그와 알림</h3>
            <ul className={styles.memberList}>
              {taggedMembers.map((item) => (
                <li className={styles.memberItem} key={item}>
                  <UsersRound size={16} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.sideCard}>
            <h3>검증 기준</h3>
            <ul className={styles.checks}>
              {checks.map((item) => (
                <li className={styles.checkItem} key={item}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.sideCard}>
            <h3>연결 API 후보</h3>
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
              <span>댓글 권한은 자료 접근 권한과 같은 기준으로 확인합니다.</span>
            </div>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
