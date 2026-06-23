import {
  CheckCircle2,
  Cloud,
  Download,
  FileCheck2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./resource-access-download-panel.module.css";

const accessCards = [
  {
    title: "개인 자료",
    caption: "사용자가 직접 공유하기 전까지 본인만 보는 자료",
    status: "PERSONAL",
    tone: "personal" as const,
    icon: UserRound,
    rules: [
      ["접근 기준", "owner_id가 현재 사용자와 같을 때만 열람"],
      ["다운로드", "서버 권한 확인 후 다운로드 주소 발급"],
      ["공유", "사용자가 프로젝트룸 공유를 승인한 뒤에만 전환"],
    ],
  },
  {
    title: "프로젝트룸 자료",
    caption: "프로젝트룸 멤버가 같은 맥락에서 보는 자료",
    status: "ROOM_SHARED",
    tone: "room" as const,
    icon: UsersRound,
    rules: [
      ["접근 기준", "room_id와 활성 멤버 권한을 함께 확인"],
      ["다운로드", "멤버 권한 확인 후 다운로드 주소 발급"],
      ["이벤트", "댓글, 버전, 에이전트 제안은 프로젝트룸 이벤트로 표시"],
    ],
  },
  {
    title: "비멤버 접근",
    caption: "프로젝트룸 멤버가 아니면 자료 다운로드 차단",
    status: "DOWNLOAD_BLOCKED",
    tone: "warning" as const,
    icon: MessageCircle,
    rules: [
      ["허용 범위", "권한 없음"],
      ["차단 범위", "자료, WBS, 일정, 멤버 목록, 다운로드"],
      ["근거", "room_members ACTIVE 확인 실패"],
    ],
  },
];

const flowSteps = [
  ["자료 선택", "자료보드에서 개인 자료 또는 프로젝트룸 자료를 선택"],
  ["visibility 확인", "PERSONAL과 ROOM_SHARED 기준을 먼저 판별"],
  ["권한 확인", "소유자 또는 프로젝트룸 멤버 상태를 서버에서 확인"],
  ["다운로드 주소 발급", "권한이 맞을 때만 짧게 쓰는 주소를 반환"],
  ["원본 접근", "스토리지 원본은 서버 권한 흐름 밖에서 열지 않음"],
];

const policyChecks = [
  "개인 자료함 동기화는 프로젝트룸 공유와 분리합니다.",
  "개인 자료를 프로젝트룸에 보낼 때는 사용자의 공유 승인이 필요합니다.",
  "Tauri SQLite 캐시는 빠른 표시와 복구용이며 권한 원본이 아닙니다.",
  "자료 다운로드는 클라이언트가 스토리지 원본을 직접 여는 흐름으로 만들지 않습니다.",
];

const apiRows = [
  ["GET", "/api/resources/{id}/download-url"],
  ["POST", "/api/resources/{id}/share-to-room"],
  ["PATCH", "/api/resources/{id}/sync-policy"],
  ["GET", "/api/project-rooms/{roomId}/resources"],
];

export function ResourceAccessDownloadPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={16} aria-hidden="true" />
          자료 권한과 다운로드 정책
        </div>
        <div className={styles.titleRow}>
          <div>
            <h2 className={styles.title}>자료 접근은 visibility와 서버 권한 확인으로 나눕니다</h2>
            <p className={styles.summary}>
              개인 자료는 소유자 기준으로 보호하고, 프로젝트룸 자료는 멤버 권한을 확인합니다. 다운로드는 서버가 권한을 확인한 뒤에만
              사용할 주소를 내려주는 흐름으로 처리합니다.
            </p>
          </div>
          <StatusBadge tone="approved">서버 원본 기준</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="자료 권한 핵심 기준">
          <Chip selected icon={<LockKeyhole size={14} aria-hidden="true" />}>
            개인 자료 자동 공유 없음
          </Chip>
          <Chip icon={<Download size={14} aria-hidden="true" />}>권한 확인 후 다운로드</Chip>
          <Chip icon={<Cloud size={14} aria-hidden="true" />}>스토리지 원본 보호</Chip>
        </div>
      </header>

      <section className={styles.grid} aria-label="자료 접근 유형">
        {accessCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={styles.card} key={card.title}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>
                  <span className={styles.iconBubble}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <StatusBadge tone={card.tone}>{card.status}</StatusBadge>
                </div>
                <div className={styles.cardHeading}>
                  <h3>{card.title}</h3>
                  <p>{card.caption}</p>
                </div>
              </div>
              <ul className={styles.ruleList}>
                {card.rules.map(([label, value]) => (
                  <li className={styles.ruleItem} key={label}>
                    <span className={styles.ruleLabel}>{label}</span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className={styles.flowPanel} aria-label="다운로드 권한 확인 흐름">
        <div className={styles.flowTitle}>
          <div>
            <h3>다운로드 흐름</h3>
            <p>클라이언트는 자료 원본 위치를 판단하지 않고, API 서버의 권한 확인 결과만 사용합니다.</p>
          </div>
          <StatusBadge tone="pending">download-url</StatusBadge>
        </div>
        <div className={styles.flow}>
          {flowSteps.map(([title, body], index) => (
            <div className={styles.flowStep} key={title}>
              <span className={styles.flowIndex}>{index + 1}</span>
              <strong>{title}</strong>
              <span>{body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label="자료 권한 구현 기준">
        <div className={styles.policyCard}>
          <h3>구현 시 지켜야 할 기준</h3>
          <ul className={styles.checks}>
            {policyChecks.map((item) => (
              <li className={styles.checkItem} key={item}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.policyCard}>
          <h3>연결 API 후보</h3>
          <div className={styles.apiList}>
            {apiRows.map(([method, path]) => (
              <div className={styles.apiRow} key={path}>
                <StatusBadge tone={method === "GET" ? "success" : "pending"}>{method}</StatusBadge>
                <span className={styles.apiPath}>{path}</span>
              </div>
            ))}
          </div>
          <div className={styles.checkItem}>
            <FileCheck2 size={16} aria-hidden="true" />
            <span>최종 API 계약이 바뀌면 feature API layer에서만 경로와 DTO를 맞춥니다.</span>
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
