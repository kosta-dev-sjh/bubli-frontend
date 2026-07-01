import {
  BellRing,
  Bot,
  CheckCircle2,
  FileStack,
  MessageSquareText,
  Radio,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./project-room-event-timeline.module.css";

const events = [
  {
    title: "새 자료 버전이 올라옴",
    body: "같은 업무 범위 문서 파일이 다시 올라와 이전 파일을 덮지 않고 v2로 보관합니다.",
    detailTitle: "자료 버전 기록",
    detail: "프로젝트룸 멤버는 최신 버전과 이전 버전을 구분해 확인합니다.",
    actor: "팀원 A",
    time: "10:24",
    badge: "자료 버전",
    tone: "room" as const,
    icon: FileStack,
  },
  {
    title: "자료 댓글이 추가됨",
    body: "요구사항 문서의 검수 기준 부분에 멤버가 댓글을 남겼습니다.",
    detailTitle: "자료 댓글",
    detail: "댓글은 프로젝트룸 자료에 우선 적용하고, 관련 멤버에게 알림을 남깁니다.",
    actor: "팀원 B",
    time: "10:31",
    badge: "댓글",
    tone: "communication" as const,
    icon: MessageSquareText,
  },
  {
    title: "에이전트 제안이 완료됨",
    body: "문서 분석이 끝나고 확인 질문과 TODO 후보가 생성됐습니다.",
    detailTitle: "에이전트 후보",
    detail: "사용자가 검토하기 전까지는 후보 상태로 머뭅니다.",
    actor: "프로젝트룸 에이전트",
    time: "10:38",
    badge: "후보 완료",
    tone: "agent" as const,
    icon: Bot,
  },
  {
    title: "친구 초대가 수락됨",
    body: "초대받은 사용자가 프로젝트룸에 들어와 멤버 권한이 생겼습니다.",
    detailTitle: "멤버 권한",
    detail: "수락 이후부터 자료, WBS/TODO, 채팅, 보이스 권한을 확인합니다.",
    actor: "팀원 C",
    time: "10:44",
    badge: "수락 완료",
    tone: "approved" as const,
    icon: UserRoundPlus,
  },
];

const deliveryFlow = [
  ["서버 저장", "댓글, 버전, 제안 완료처럼 남겨야 하는 이벤트를 서버 기록으로 남김"],
  ["프로젝트룸 topic 발행", "같은 프로젝트룸을 보는 화면에 WebSocket으로 전달"],
  ["개인 알림 생성", "사용자별 알림 설정에 맞는 항목만 개인 알림으로 표시"],
  ["버블 요약", "Tauri 알림 버블은 접근 가능한 이벤트만 짧게 보여줌"],
];

const rules = [
  "프로젝트룸 이벤트는 프로젝트룸과 멤버 권한을 확인한 뒤 보여줍니다.",
  "개인 알림 큐는 사용자별 읽음과 보관 상태를 따로 저장합니다.",
  "에이전트 제안 완료 이벤트는 후보 생성 완료를 알릴 뿐, 확정을 뜻하지 않습니다.",
  "프로젝트룸 밖 사용자와 나간 멤버에게는 프로젝트룸 이벤트를 보여주지 않습니다.",
];

export function ProjectRoomEventTimeline() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Radio size={16} aria-hidden="true" />
          프로젝트룸 이벤트 흐름
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>자료, 댓글, 제안 완료를 같은 프로젝트룸 흐름으로 보여줍니다</h2>
            <p className={styles.summary}>
              프로젝트룸 안에서 생긴 변화는 서버 기록으로 남기고, 실시간 연결로 같은 프로젝트룸 화면에 전달합니다. 개인 알림은
              사용자별 설정과 읽음 상태를 따로 따릅니다.
            </p>
          </div>
          <StatusBadge tone="approved">서버 이벤트 기준</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="프로젝트룸 이벤트 기준">
          <Chip selected icon={<Radio size={14} aria-hidden="true" />}>
            프로젝트룸 화면 알림
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>개인 알림 큐 분리</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>멤버 권한 확인</Chip>
        </div>
      </header>

      <section className={styles.contentGrid} aria-label="프로젝트룸 이벤트 타임라인">
        <div className={styles.timeline}>
          {events.map((event, index) => {
            const Icon = event.icon;

            return (
              <article className={styles.eventCard} key={event.title}>
                <div className={styles.eventRail} aria-hidden="true">
                  <span className={styles.eventIcon}>
                    <Icon size={21} />
                  </span>
                  {index < events.length - 1 ? <span className={styles.eventLine} /> : null}
                </div>
                <div className={styles.eventBody}>
                  <div className={styles.eventHead}>
                    <div className={styles.eventTitle}>
                      <h3>{event.title}</h3>
                      <p>{event.body}</p>
                    </div>
                    <StatusBadge tone={event.tone}>{event.badge}</StatusBadge>
                  </div>
                  <div className={styles.eventMeta}>
                    <Chip>{event.actor}</Chip>
                    <Chip>{event.time}</Chip>
                  </div>
                  <div className={styles.detailBox}>
                    <strong>{event.detailTitle}</strong>
                    <span>{event.detail}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.side} aria-label="이벤트 전달 기준">
          <section className={styles.sideCard}>
            <h3>전달 순서</h3>
            <ol className={styles.flowList}>
              {deliveryFlow.map(([title, body], index) => (
                <li className={styles.flowItem} key={title}>
                  <span className={styles.flowIndex}>{index + 1}</span>
                  <span className={styles.flowCopy}>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.sideCard}>
            <h3>연결 방식</h3>
            <div className={styles.topicBox}>
              <strong>프로젝트룸 이벤트</strong>
              <span>프로젝트룸 자료, 댓글, 에이전트 제안 이벤트</span>
            </div>
            <div className={styles.topicBox}>
              <strong>개인 알림</strong>
              <span>사용자별 개인 알림</span>
            </div>
          </section>

          <section className={styles.sideCard}>
            <h3>검증 기준</h3>
            <ul className={styles.checks}>
              {rules.map((rule) => (
                <li className={styles.checkItem} key={rule}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
