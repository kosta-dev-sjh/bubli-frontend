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
    storage: "OS secure storage",
  },
  {
    device: "Chrome · Web",
    lastUsed: "18분 전",
    location: "서울",
    status: "active",
    storage: "httpOnly cookie",
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
          <h2>웹과 Tauri는 같은 인증 API를 쓰지만 refresh token 보관 위치를 나눕니다</h2>
          <p>
            access token은 짧게 유지하고, refresh token은 환경에 맞는 안전한 저장소에 둡니다. 토큰 만료와
            재발급 흐름은 API 서버 기준으로 맞춥니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="approved">보안 기준</StatusBadge>
          <strong>30분</strong>
          <span>access token 만료</span>
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
              <h3>refresh token은 httpOnly cookie로 받습니다</h3>
              <p>브라우저 JavaScript는 refresh token을 읽지 않고, 재발급 요청 때 cookie가 함께 전송됩니다.</p>
            </div>
          </div>
          <div className={styles.chips}>
            <Chip>Secure</Chip>
            <Chip>SameSite=Lax</Chip>
            <Chip>Path=/api/auth</Chip>
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyCard}>
          <div className={styles.policyHeader}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <LockKeyhole size={16} strokeWidth={2.1} />
            </span>
            <div>
              <StatusBadge tone="personal">Tauri</StatusBadge>
              <h3>refresh token은 OS secure storage에 둡니다</h3>
              <p>SQLite 일반 테이블, localStorage, 평문 파일에는 refresh token을 저장하지 않습니다.</p>
            </div>
          </div>
          <div className={styles.chips}>
            <Chip>macOS Keychain</Chip>
            <Chip>Credential Manager</Chip>
            <Chip>Secret Service</Chip>
          </div>
        </GlassPanel>
      </div>

      <div className={styles.flow}>
        <span>로그인</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>access token 메모리 저장</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>refresh token 안전 저장</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>만료 시 refresh 후 재시도</span>
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
              <code>AUTH_TOKEN_EXPIRED</code>
              <h4>즉시 로그아웃하지 않음</h4>
              <p>먼저 `/api/auth/refresh`를 시도하고, 실패한 경우에만 로그인 화면으로 보냅니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>refresh rotation</code>
              <h4>재발급 결과 갱신</h4>
              <p>Tauri는 rotation 결과로 받은 refresh token을 OS secure storage에 다시 저장합니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>WebSocket</code>
              <h4>끊김 후 재연결</h4>
              <p>access token 만료로 연결이 끊기면 refresh 후 STOMP를 다시 연결합니다.</p>
            </article>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
