import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cookie,
  KeyRound,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./auth-refresh-rotation-boundary-panel.module.css";

type RotationStep = {
  description: string;
  icon: typeof KeyRound;
  label: string;
  storage: string;
  tone: "approved" | "pending" | "personal" | "warning";
};

type SessionCase = {
  action: string;
  code: string;
  description: string;
  label: string;
  tone: "approved" | "pending" | "warning";
};

type DeviceSession = {
  device: string;
  lastUsed: string;
  sessionState: "current" | "active" | "revoked";
  storage: string;
};

const rotationSteps: RotationStep[] = [
  {
    description: "access token은 짧게 유지하고 요청 헤더에 붙입니다.",
    icon: KeyRound,
    label: "access token",
    storage: "memory",
    tone: "pending",
  },
  {
    description: "웹 refresh token은 JavaScript가 읽지 못하는 cookie로 받습니다.",
    icon: Cookie,
    label: "web refresh",
    storage: "httpOnly cookie",
    tone: "approved",
  },
  {
    description: "Tauri refresh token은 운영체제 보안 저장소에만 둡니다.",
    icon: LockKeyhole,
    label: "Tauri refresh",
    storage: "OS secure storage",
    tone: "personal",
  },
  {
    description: "재발급이 성공하면 새 refresh token으로 교체합니다.",
    icon: RefreshCcw,
    label: "rotation",
    storage: "device session",
    tone: "warning",
  },
];

const sessionCases: SessionCase[] = [
  {
    action: "refresh 후 원래 요청 재시도",
    code: "AUTH_TOKEN_EXPIRED",
    description: "access token 만료는 즉시 로그아웃하지 않고 재발급을 먼저 시도합니다.",
    label: "access 만료",
    tone: "pending",
  },
  {
    action: "현재 기기 세션 종료",
    code: "AUTH_REFRESH_TOKEN_EXPIRED",
    description: "refresh token 만료는 현재 device session을 종료하고 로그인 화면으로 보냅니다.",
    label: "refresh 만료",
    tone: "warning",
  },
  {
    action: "전체 기기 점검 안내",
    code: "AUTH_REFRESH_TOKEN_REUSED",
    description: "rotation 이후 예전 refresh token이 다시 쓰이면 재사용 감지 상태로 봅니다.",
    label: "재사용 감지",
    tone: "warning",
  },
  {
    action: "STOMP 재연결",
    code: "WEBSOCKET_TOKEN_EXPIRED",
    description: "실시간 연결은 refresh 성공 뒤 새 access token으로 다시 연결합니다.",
    label: "실시간 재연결",
    tone: "approved",
  },
];

const deviceSessions: DeviceSession[] = [
  {
    device: "MacBook Pro · Tauri",
    lastUsed: "방금 전",
    sessionState: "current",
    storage: "OS secure storage",
  },
  {
    device: "Chrome · Web",
    lastUsed: "18분 전",
    sessionState: "active",
    storage: "httpOnly cookie",
  },
  {
    device: "Safari · Web",
    lastUsed: "31일 전",
    sessionState: "revoked",
    storage: "무효화됨",
  },
];

const sessionStateMeta: Record<DeviceSession["sessionState"], { label: string; tone: "approved" | "pending" | "neutral" }> = {
  active: { label: "활성", tone: "pending" },
  current: { label: "현재 기기", tone: "approved" },
  revoked: { label: "종료", tone: "neutral" },
};

function RotationCard({ step }: { step: RotationStep }) {
  const Icon = step.icon;

  return (
    <article className={styles.rotationCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.badges}>
          <StatusBadge tone={step.tone}>{step.storage}</StatusBadge>
        </div>
        <h3>{step.label}</h3>
        <p>{step.description}</p>
      </div>
    </article>
  );
}

function SessionCaseCard({ item }: { item: SessionCase }) {
  return (
    <article className={styles.caseCard}>
      <div className={styles.caseTop}>
        <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
        <code>{item.code}</code>
      </div>
      <p>{item.description}</p>
      <div className={styles.actionRow}>
        <span>프론트 행동</span>
        <strong>{item.action}</strong>
      </div>
    </article>
  );
}

function DeviceSessionRow({ session }: { session: DeviceSession }) {
  const meta = sessionStateMeta[session.sessionState];

  return (
    <article className={styles.deviceRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <MonitorSmartphone size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.deviceMeta}>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <StatusBadge tone="personal">{session.storage}</StatusBadge>
        </div>
        <h4>{session.device}</h4>
        <p>{session.lastUsed}</p>
      </div>
    </article>
  );
}

export function AuthRefreshRotationBoundaryPanel() {
  return (
    <section className={styles.panel} aria-label="인증 refresh rotation 경계 패널">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            인증 rotation
          </Chip>
          <h2>refresh token은 기기 세션 기준으로 돌리고, 재사용은 즉시 분리합니다</h2>
          <p>
            웹과 Tauri는 같은 인증 API를 쓰지만 refresh token 보관 위치가 다릅니다. 프론트는 만료, 재발급,
            재사용 감지를 구분해 사용자 흐름과 실시간 연결을 안정적으로 이어갑니다.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">device session</StatusBadge>
          <strong>30일</strong>
          <span>refresh token 만료</span>
          <ProgressBar label="인증 rotation 정책 정합도" value={88} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>토큰 저장과 교체 흐름</h3>
          <p>access token은 짧게 쓰고, refresh token은 환경별 안전 저장소에서 교체합니다.</p>
        </div>
        <div className={styles.rotationGrid}>
          {rotationSteps.map((step, index) => (
            <div className={styles.rotationSlot} key={step.label}>
              <RotationCard step={step} />
              {index < rotationSteps.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.casePanel}>
          <div className={styles.sectionTitle}>
            <h3>오류 코드별 처리</h3>
            <p>인증 실패를 하나의 로그아웃 흐름으로 처리하지 않고 상황별로 나눕니다.</p>
          </div>
          <div className={styles.caseGrid}>
            {sessionCases.map((item) => (
              <SessionCaseCard item={item} key={item.code} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.devicePanel}>
          <div className={styles.sectionTitle}>
            <h3>기기 세션</h3>
            <p>로그아웃은 현재 기기 세션의 refresh token만 무효화합니다.</p>
          </div>
          <div className={styles.deviceList}>
            {deviceSessions.map((session) => (
              <DeviceSessionRow key={session.device} session={session} />
            ))}
          </div>
          <div className={styles.notice}>
            <AlertTriangle size={16} strokeWidth={2.1} />
            <p>refresh token 재사용이 감지되면 해당 계정의 다른 기기 상태 점검을 안내합니다.</p>
          </div>
          <div className={styles.notice}>
            <RadioTower size={16} strokeWidth={2.1} />
            <p>WebSocket은 refresh 성공 뒤 새 access token으로 다시 연결합니다.</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>SQLite, localStorage, 평문 파일에 refresh token 저장 금지</Chip>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footerPanel}>
        <LogOut size={18} strokeWidth={2.1} />
        <p>로그아웃은 서버의 device session을 종료하고, 웹 cookie 또는 Tauri secure storage의 refresh token을 비웁니다.</p>
        <StatusBadge tone="approved">/api/auth/logout</StatusBadge>
        <StatusBadge tone="pending">/api/auth/refresh</StatusBadge>
      </GlassPanel>
    </section>
  );
}
