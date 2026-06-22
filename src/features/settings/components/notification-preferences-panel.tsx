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
    type: "MESSAGE",
    channel: "웹 · 알림 버블",
    enabled: true,
    icon: MessageCircle,
  },
  {
    title: "자료 댓글",
    description: "프로젝트룸 자료 댓글과 멤버 태그를 개인 알림으로 받습니다.",
    type: "RESOURCE_COMMENT",
    channel: "웹 · 알림 버블",
    enabled: true,
    icon: MessageSquareText,
  },
  {
    title: "자료 버전",
    description: "같은 자료가 새 버전으로 올라왔을 때 알려줍니다.",
    type: "RESOURCE_VERSION",
    channel: "웹",
    enabled: true,
    icon: FileClock,
  },
  {
    title: "에이전트 정리 완료",
    description: "분석 job이 끝나고 검토할 후보가 생겼을 때 알려줍니다.",
    type: "AGENT_DONE",
    channel: "웹 · 알림 버블",
    enabled: true,
    icon: Bot,
  },
  {
    title: "용량 초과",
    description: "개인 자료함 동기화가 용량 제한으로 막혔을 때 알려줍니다.",
    type: "STORAGE_LIMIT_EXCEEDED",
    channel: "웹 · 데스크탑 알림",
    enabled: false,
    icon: DatabaseZap,
  },
];

const rules = [
  "알림 설정은 user_id 기준으로 저장하고 다른 멤버에게 영향을 주지 않습니다.",
  "프로젝트룸 이벤트가 생겨도 사용자의 알림 설정이 꺼져 있으면 개인 알림으로 만들지 않습니다.",
  "알림 버블은 notifications 원본에서 필요한 항목만 짧게 보여줍니다.",
  "읽음과 보관 상태는 알림 목록과 버블 표시에서 같은 기준을 씁니다.",
];

const deliveryFlow = [
  ["이벤트 발생", "새 메시지, 댓글, 새 버전, 에이전트 완료, 용량 초과 이벤트가 생김"],
  ["설정 확인", "user_notification_preferences에서 알림 종류와 채널을 확인"],
  ["알림 저장", "필요한 항목만 notifications에 UNREAD 상태로 저장"],
  ["표시", "웹 알림 목록과 Tauri 알림 버블에 같은 원본 기준으로 표시"],
];

const apiRows = [
  ["GET", "/api/me/notification-preferences"],
  ["PATCH", "/api/me/notification-preferences"],
  ["GET", "/api/notifications"],
  ["PATCH", "/api/notifications/{id}/read"],
  ["PATCH", "/api/notifications/{id}/archive"],
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
              개인 설정으로 저장하고 알림 목록과 버블에서 같은 원본을 봅니다.
            </p>
          </div>
          <StatusBadge tone="personal">user_notification_preferences</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="알림 설정 핵심 기준">
          <Chip selected icon={<UserRound size={14} aria-hidden="true" />}>
            user_id 기준
          </Chip>
          <Chip icon={<BellRing size={14} aria-hidden="true" />}>notifications 원본</Chip>
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
                    <StatusBadge tone={preference.enabled ? "approved" : "neutral"}>{preference.enabled ? "ON" : "OFF"}</StatusBadge>
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
            <h3>연결 API 후보</h3>
            <div className={styles.apiList}>
              {apiRows.map(([method, path]) => (
                <div className={styles.apiRow} key={path}>
                  <StatusBadge tone={method === "GET" ? "success" : "pending"}>{method}</StatusBadge>
                  <span className={styles.apiPath}>{path}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </GlassPanel>
  );
}
