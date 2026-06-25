import { EyeOff, FolderLock, History, MonitorCog, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./privacy-consent-panel.module.css";

const consentRows = [
  {
    title: "활성 앱과 창 제목 감지",
    description: "작업 맥락과 하루정리를 위해 앱 이름, 창 제목, 머문 시간만 읽습니다.",
    consentType: "ACTIVITY_CONTEXT",
    state: "ON",
    source: "Tauri IPC read_activity_context",
    icon: MonitorCog,
  },
  {
    title: "개인 관리 폴더 접근",
    description: "사용자가 직접 선택한 폴더만 스캔하고 변경 상태를 로컬 색인에 남깁니다.",
    consentType: "MANAGED_FOLDER_ACCESS",
    state: "ON",
    source: "Tauri IPC select_managed_folder",
    icon: FolderLock,
  },
  {
    title: "로컬 개인 에이전트 원문",
    description: "개인 에이전트 원문은 서버에 올리지 않고 Tauri SQLite에만 짧게 보관합니다.",
    consentType: "LOCAL_AGENT_MEMORY",
    state: "OFF",
    source: "Tauri SQLite local_agent_messages",
    icon: History,
  },
];

const neverCollect = ["화면 전체 캡처", "키보드 입력", "브라우저 비밀번호", "프로젝트룸 권한 밖 자료"];

const auditRows = [
  ["저장 위치", "동의 상태는 user_privacy_consents, 상세 로컬 기록은 Tauri SQLite"],
  ["수정 권한", "본인만 조회와 수정"],
  ["삭제 기준", "활동 기록은 설정에서 삭제 가능"],
  ["프로젝트룸 영향", "다른 멤버 설정이나 프로젝트룸 권한을 바꾸지 않음"],
];

const apiRows = [
  ["GET", "/api/me/privacy-consents"],
  ["PATCH", "/api/me/privacy-consents"],
  ["GET", "/api/activity-logs/today"],
  ["DELETE", "/api/activity-logs/{id}"],
];

export function PrivacyConsentPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={16} aria-hidden="true" />
          개인정보와 로컬 권한
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>동의한 범위 안에서만 로컬 기능을 켭니다</h2>
            <p className={styles.summary}>
              활동 감지와 개인 관리 폴더는 Tauri 앱에서만 필요한 권한입니다. 사용자가 켠 항목만 동작하고, 화면 전체 내용과 키보드
              입력은 수집하지 않습니다.
            </p>
          </div>
          <StatusBadge tone="personal">user_privacy_consents</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="개인정보 동의 핵심 기준">
          <Chip selected icon={<ShieldCheck size={14} aria-hidden="true" />}>
            동의 후 실행
          </Chip>
          <Chip icon={<EyeOff size={14} aria-hidden="true" />}>화면·키보드 미수집</Chip>
          <Chip icon={<RotateCcw size={14} aria-hidden="true" />}>언제든 끄기</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label="개인정보 동의 상태">
        <div className={styles.consentList}>
          {consentRows.map((row) => {
            const Icon = row.icon;
            const enabled = row.state === "ON";

            return (
              <article className={styles.consentCard} key={row.consentType}>
                <span className={styles.iconBubble}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div className={styles.consentCopy}>
                  <h3>{row.title}</h3>
                  <p>{row.description}</p>
                  <div className={styles.meta}>
                    <StatusBadge tone={enabled ? "approved" : "neutral"}>{row.state}</StatusBadge>
                    <Chip>{row.consentType}</Chip>
                    <Chip>{row.source}</Chip>
                  </div>
                </div>
                <span
                  aria-label={`${row.title} ${enabled ? "켜짐" : "꺼짐"}`}
                  aria-checked={enabled}
                  className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`}
                  role="switch"
                >
                  <span className={styles.toggleKnob} />
                </span>
              </article>
            );
          })}
        </div>

        <aside className={styles.safetyPanel} aria-label="수집하지 않는 정보">
          <div className={styles.safetyIcon}>
            <EyeOff size={28} aria-hidden="true" />
          </div>
          <h3>수집하지 않는 정보</h3>
          <p>활동 감지는 작업 맥락 보조 기능입니다. 사용자의 화면 내용이나 입력값을 읽는 기능으로 쓰지 않습니다.</p>
          <div className={styles.neverGrid}>
            {neverCollect.map((item) => (
              <span className={styles.neverItem} key={item}>
                {item}
              </span>
            ))}
          </div>
          <Button icon={<Trash2 size={16} />} variant="quiet">
            활동 기록 삭제
          </Button>
        </aside>
      </section>

      <section className={styles.bottomGrid} aria-label="권한 저장과 연결 API">
        <div className={styles.noteCard}>
          <h3>저장과 삭제 기준</h3>
          <dl className={styles.auditList}>
            {auditRows.map(([label, value]) => (
              <div className={styles.auditRow} key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.noteCard}>
          <h3>연결 API와 IPC</h3>
          <div className={styles.apiList}>
            {apiRows.map(([method, path]) => (
              <div className={styles.apiRow} key={path}>
                <StatusBadge tone={method === "GET" ? "success" : method === "DELETE" ? "warning" : "pending"}>{method}</StatusBadge>
                <strong>{path}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
