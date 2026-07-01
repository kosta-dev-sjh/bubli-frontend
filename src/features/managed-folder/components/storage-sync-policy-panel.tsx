import {
  CheckCircle2,
  Cloud,
  Database,
  FolderSearch,
  HardDrive,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Chip, GlassPanel, ProgressBar, StatusBadge } from "@/components/ui";

import styles from "./storage-sync-policy-panel.module.css";

const storageUsage = {
  usedGb: 0.72,
  limitGb: 1,
  percent: 72,
};

const metrics = [
  {
    title: "서버 저장 용량",
    caption: "개인 자료함 동기화는 사용자별 용량 안에서만 서버에 반영",
    value: `${storageUsage.usedGb}GB`,
    suffix: `/ ${storageUsage.limitGb}GB`,
    icon: HardDrive,
    badge: "storage_usage",
    tone: "pending" as const,
  },
  {
    title: "로컬 색인",
    caption: "사용자가 지정한 개인 관리 폴더만 기기 안에 기록",
    value: "284",
    suffix: "개 파일",
    icon: FolderSearch,
    badge: "기기 안 기록",
    tone: "personal" as const,
  },
  {
    title: "동기화 대기",
    caption: "사용자 확인 뒤 서버 개인 자료함에 반영할 항목",
    value: "12",
    suffix: "개",
    icon: UploadCloud,
    badge: "sync_jobs",
    tone: "warning" as const,
  },
];

const syncStatuses = [
  ["기기 안에만 있음", "기기 안에만 있는 파일입니다. 서버에는 아직 올라가지 않습니다."],
  ["반영 대기", "사용자 확인 뒤 개인 자료함에 반영할 파일입니다."],
  ["반영 완료", "서버 개인 자료함에 반영된 파일입니다."],
  ["삭제 확인 필요", "로컬 삭제 감지 후 사용자의 확인을 기다립니다."],
  ["용량 초과", "용량 제한 때문에 서버 반영이 막힌 파일입니다."],
];

const safetyRules = [
  "개인 관리 폴더는 사용자가 직접 지정한 폴더만 다룹니다.",
  "용량을 넘으면 로컬 색인은 유지하고 서버 업로드만 막습니다.",
  "삭제된 파일은 사용자 확인 전까지 삭제 후보로 표시합니다.",
  "프로젝트룸 자료는 개인 동기화와 분리해서 룸 자료보드에서 직접 올립니다.",
];

const connectionRows = [
  ["서버 저장 용량", "/api/storage/usage"],
  ["로컬 색인", "Tauri IPC와 SQLite"],
  ["서버 반영", "localsync 구현 후 연결"],
];

export function StorageSyncPolicyPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={16} aria-hidden="true" />
          개인 자료함 동기화 정책
        </div>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>로컬 색인과 서버 저장 용량을 분리해서 보여줍니다</h2>
          <p className={styles.summary}>
            데스크탑 앱은 개인 관리 폴더의 변경을 기기 안에 먼저 기록합니다. 서버에는 사용자가 동기화를 켠 항목만 용량 제한 안에서
            개인 자료로 반영합니다.
          </p>
        </div>
        <div className={styles.chips} aria-label="동기화 핵심 기준">
          <Chip selected icon={<Database size={14} aria-hidden="true" />}>
            기기 안 색인
          </Chip>
          <Chip icon={<Cloud size={14} aria-hidden="true" />}>서버 개인 자료함</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>확인 후 반영</Chip>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label="저장 용량과 동기화 요약">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className={styles.metricCard} key={metric.title}>
              <div className={styles.metricTop}>
                <span className={styles.iconBubble}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <StatusBadge tone={metric.tone}>{metric.badge}</StatusBadge>
              </div>
              <div className={styles.metricLabel}>
                <h3>{metric.title}</h3>
                <p>{metric.caption}</p>
              </div>
              <div>
                <div className={styles.metricValue}>
                  <strong>{metric.value}</strong>
                  <span>{metric.suffix}</span>
                </div>
                {metric.title === "서버 저장 용량" ? (
                  <>
                    <ProgressBar label="서버 저장 용량 사용률" value={storageUsage.percent} />
                    <div className={styles.usageText}>
                      <span>사용률 {storageUsage.percent}%</span>
                      <span>남은 용량 {(storageUsage.limitGb - storageUsage.usedGb).toFixed(2)}GB</span>
                    </div>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.statusSection} aria-label="로컬 파일 동기화 상태값">
        <div className={styles.sectionTitle}>
          <div>
            <h3>동기화 상태값</h3>
            <p>자료보드와 데스크탑 앱 설정 화면에서 같은 상태 기준으로 보여줍니다.</p>
          </div>
          <StatusBadge tone="approved">같은 상태 기준</StatusBadge>
        </div>
        <div className={styles.statusGrid}>
          {syncStatuses.map(([status, description]) => (
            <article className={styles.statusCard} key={status}>
              <StatusBadge tone={status === "용량 초과" ? "warning" : status === "반영 완료" ? "success" : "pending"}>
                {status}
              </StatusBadge>
              <strong>{status}</strong>
              <span>{description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label="동기화 안전 기준과 연결 경계">
        <article className={styles.policyCard}>
          <h3>안전 기준</h3>
          <ul className={styles.checks}>
            {safetyRules.map((rule) => (
              <li className={styles.checkItem} key={rule}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.policyCard}>
          <h3>연결 경계</h3>
          <div className={styles.apiList}>
            {connectionRows.map(([label, path]) => (
              <div className={styles.apiRow} key={label}>
                <StatusBadge tone={path.startsWith("/api") ? "success" : "pending"}>{label}</StatusBadge>
                <span className={styles.apiPath}>{path}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </GlassPanel>
  );
}
