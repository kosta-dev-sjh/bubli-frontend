import {
  ArrowRight,
  Cookie,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./auth-session-security-panel.module.css";

type SessionItem = {
  device: string;
  lastUsed: string;
  location: string;
  status: "current" | "active" | "expired";
  storage: string;
};

const sessions: SessionItem[] = [
  {
    device: "MacBook Pro · Tauri",
    lastUsed: "방금 전",
    location: "서울",
    status: "current",
    storage: "기기 보안 저장",
  },
  {
    device: "Chrome · Web",
    lastUsed: "18분 전",
    location: "서울",
    status: "active",
    storage: "브라우저 보안 저장",
  },
  {
    device: "Safari · Web",
    lastUsed: "31일 전",
    location: "서울",
    status: "expired",
    storage: "만료됨",
  },
];

const statusMeta: Record<SessionItem["status"], { label: string; tone: "approved" | "pending" | "neutral" }> = {
  active: { label: "활성", tone: "pending" },
  current: { label: "현재 기기", tone: "approved" },
  expired: { label: "만료", tone: "neutral" },
};

function SessionCard({ session }: { session: SessionItem }) {
  const status = statusMeta[session.status];

  return (
    <article className={styles.sessionCard}>
      <div className={styles.sessionTop}>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone="personal">{session.storage}</StatusBadge>
          </div>
          <h3>{session.device}</h3>
        </div>
        <span className="bubli-icon-tile" aria-hidden="true">
          <MonitorSmartphone size={16} strokeWidth={2.1} />
        </span>
      </div>
      <p>{session.location}에서 마지막 사용</p>
      <span className={styles.sessionMeta}>{session.lastUsed}</span>
    </article>
  );
}

export function AuthSessionSecurityPanel() {
  return (
    <section className={styles.panel} aria-label="인증 세션 보안 패널">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<ShieldCheck size={14} />} selected>
            인증 세션
          </Chip>
          <h2>웹과 Tauri는 같은 로그인 흐름을 쓰고, 기기별 세션은 따로 관리합니다</h2>
          <p>
            웹과 데스크탑 앱은 같은 계정으로 들어가지만, 로그인 유지는 각 기기에서 안전하게 나눠 관리합니다.
            세션이 끝나면 먼저 갱신을 시도하고, 실패한 경우에만 다시 로그인하게 합니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="approved">보안 기준</StatusBadge>
          <strong>30분</strong>
          <span>짧은 세션 갱신 주기</span>
          <ProgressBar label="인증 정책 반영률" value={84} />
        </div>
      </GlassPanel>

      <div className={styles.policyGrid}>
        <GlassPanel className={styles.policyCard}>
          <div className={styles.policyHeader}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Cookie size={16} strokeWidth={2.1} />
            </span>
            <div>
              <StatusBadge tone="room">웹</StatusBadge>
              <h3>웹 로그인 유지는 브라우저 보안 저장을 사용합니다</h3>
              <p>브라우저 화면에서는 로그인 유지 정보를 직접 읽지 않고, 서버가 확인한 세션으로 다시 연결합니다.</p>
            </div>
          </div>
          <div className={styles.chips}>
            <Chip>브라우저 보호</Chip>
            <Chip>서버 확인</Chip>
            <Chip>자동 갱신</Chip>
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyCard}>
          <div className={styles.policyHeader}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <LockKeyhole size={16} strokeWidth={2.1} />
            </span>
            <div>
              <StatusBadge tone="personal">Tauri</StatusBadge>
              <h3>데스크탑 앱은 운영체제의 보안 저장소를 사용합니다</h3>
              <p>로그인 유지 정보는 일반 파일이나 기기 안 일반 저장소에 남기지 않습니다.</p>
            </div>
          </div>
          <div className={styles.chips}>
            <Chip>macOS 키체인</Chip>
            <Chip>Windows 자격 증명</Chip>
            <Chip>Linux 보안 저장소</Chip>
          </div>
        </GlassPanel>
      </div>

      <div className={styles.flow}>
        <span>로그인</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>짧은 세션 발급</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>기기별 안전 저장</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>만료 시 갱신 후 재시도</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.sessions}>
          <div className={styles.sectionTitle}>
            <h3>기기별 세션</h3>
            <p>세션은 사용자 단위가 아니라 기기 단위로 관리합니다.</p>
          </div>
          <div className={styles.sessionList}>
            {sessions.map((session) => (
              <SessionCard key={session.device} session={session} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rules}>
          <h3>프론트 처리 기준</h3>
          <div className={styles.ruleList}>
            <article className={styles.ruleCard}>
              <code>세션 만료</code>
              <h4>즉시 로그아웃하지 않음</h4>
              <p>먼저 로그인 갱신을 시도하고, 실패한 경우에만 로그인 화면으로 보냅니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>세션 갱신</code>
              <h4>재발급 결과 갱신</h4>
              <p>Tauri는 새로 확인된 로그인 유지 정보를 운영체제 보안 저장소에 다시 저장합니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>실시간 연결</code>
              <h4>끊김 후 재연결</h4>
              <p>세션 만료로 연결이 끊기면 갱신 후 채팅과 알림 연결을 다시 엽니다.</p>
            </article>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
