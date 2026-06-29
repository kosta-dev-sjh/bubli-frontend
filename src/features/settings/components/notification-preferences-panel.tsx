import {
  BellRing,
  Bot,
  CheckCircle2,
  DatabaseZap,
  FileClock,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./notification-preferences-panel.module.css";

const preferences = [
  {
    title: "새 메시지",
    description: "1:1 채팅과 프로젝트룸 채팅의 새 메시지를 알려줍니다.",
    type: "새 메시지",
    channel: "웹 · 알림 버블",
    enabled: true,
    icon: MessageCircle,
  },
  {
    title: "자료 댓글",
    description: "프로젝트룸 자료 댓글과 멤버 태그를 개인 알림으로 받습니다.",
    type: "댓글과 태그",
    channel: "웹 · 알림 버블",
    enabled: true,
    icon: MessageSquareText,
  },
  {
    title: "자료 버전",
    description: "같은 자료가 새 버전으로 올라왔을 때 알려줍니다.",
    type: "새 버전",
    channel: "웹",
    enabled: true,
    icon: FileClock,
  },
  {
    title: "에이전트 정리 완료",
    description: "자료 정리가 끝나고 검토할 후보가 생겼을 때 알려줍니다.",
    type: "후보 생성",
    channel: "웹 · 알림 버블",
    enabled: true,
    icon: Bot,
  },
  {
    title: "용량 초과",
    description: "개인 자료함 동기화가 용량 제한으로 막혔을 때 알려줍니다.",
    type: "용량 확인",
    channel: "웹 · 데스크톱 알림",
    enabled: false,
    icon: DatabaseZap,
  },
];

const rules = [
  "알림 설정은 내 계정 기준으로 저장하고 다른 멤버에게 영향을 주지 않습니다.",
  "프로젝트룸 이벤트가 생겨도 사용자의 알림 설정이 꺼져 있으면 개인 알림으로 만들지 않습니다.",
  "알림 버블은 필요한 항목만 짧게 보여줍니다.",
  "읽음과 보관 상태는 알림 목록과 버블 표시에서 같은 기준을 씁니다.",
];

const deliveryFlow = [
  ["이벤트 발생", "새 메시지, 댓글, 새 버전, 에이전트 완료, 용량 초과 이벤트가 생김"],
  ["설정 확인", "사용자가 켜 둔 알림 종류와 표시 위치를 확인"],
  ["알림 저장", "필요한 항목만 새 알림으로 저장"],
  ["표시", "웹 알림 목록과 데스크톱 알림 버블에 같은 기준으로 표시"],
];

const connectionRows = [
  ["내 알림 설정", "켜기, 끄기, 표시 위치 저장"],
  ["알림 목록", "새 알림과 보관된 알림 조회"],
  ["읽음 처리", "확인한 알림 상태 갱신"],
  ["보관 처리", "목록에서 잠시 숨김"],
  ["알림 버블", "작업 중 필요한 알림만 표시"],
];

export function NotificationPreferencesPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <BellRing size={16} aria-hidden="true" />
          사용자별 알림 설정
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>내가 받을 알림만 사용자 기준으로 조절합니다</h2>
            <p className={styles.summary}>
              같은 프로젝트룸에 있어도 알림 설정은 사용자마다 다릅니다. 새 메시지, 댓글, 자료 버전, 에이전트 완료, 용량 초과 알림을
              개인 설정으로 저장하고 알림 목록과 버블에서 같은 기준으로 보여줍니다.
            </p>
          </div>
          <StatusBadge tone="personal">내 알림 설정</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="알림 설정 핵심 기준">
          <Chip selected icon={<UserRound size={14} aria-hidden="true" />}>
            내 계정 기준
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>알림 목록과 연결</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>프로젝트룸 설정과 분리</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label="사용자별 알림 설정">
        <div className={styles.preferenceList}>
          {preferences.map((preference) => {
            const Icon = preference.icon;

            return (
              <article className={styles.preferenceCard} key={preference.type}>
                <span className={styles.iconBubble}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div className={styles.preferenceText}>
                  <h3>{preference.title}</h3>
                  <p>{preference.description}</p>
                  <div className={styles.meta}>
                    <StatusBadge tone={preference.enabled ? "approved" : "neutral"}>{preference.enabled ? "켜짐" : "꺼짐"}</StatusBadge>
                    <Chip>{preference.type}</Chip>
                    <Chip>{preference.channel}</Chip>
                  </div>
                </div>
                <span
                  aria-label={`${preference.title} 알림 ${preference.enabled ? "켜짐" : "꺼짐"}`}
                  className={`${styles.toggle} ${preference.enabled ? styles.toggleOn : ""}`}
                  role="switch"
                  aria-checked={preference.enabled}
                >
                  <span className={styles.toggleKnob} />
                </span>
              </article>
            );
          })}
        </div>

        <aside className={styles.side} aria-label="알림 저장과 표시 기준">
          <section className={styles.sideCard}>
            <h3>알림 생성 순서</h3>
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

          <section className={styles.sideCard}>
            <h3>연결되는 화면 동작</h3>
            <div className={styles.apiList}>
              {connectionRows.map(([label, detail]) => (
                <div className={styles.apiRow} key={label}>
                  <StatusBadge tone="success">{label}</StatusBadge>
                  <span className={styles.apiPath}>{detail}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
