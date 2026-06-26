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
    description: "짧은 세션은 화면 요청마다 서버가 확인합니다.",
    icon: KeyRound,
    label: "짧은 세션",
    storage: "화면 연결",
    tone: "pending",
  },
  {
    description: "웹 로그인 유지는 브라우저 보안 저장으로 관리합니다.",
    icon: Cookie,
    label: "웹 세션 유지",
    storage: "브라우저 보안 저장",
    tone: "approved",
  },
  {
    description: "데스크탑 앱은 운영체제 보안 저장소에 로그인 유지 정보를 둡니다.",
    icon: LockKeyhole,
    label: "앱 세션 유지",
    storage: "기기 보안 저장",
    tone: "personal",
  },
  {
    description: "갱신이 성공하면 이전 로그인 유지 정보는 새 값으로 교체합니다.",
    icon: RefreshCcw,
    label: "세션 갱신",
    storage: "기기별 세션",
    tone: "warning",
  },
];

const sessionCases: SessionCase[] = [
  {
    action: "갱신 후 원래 요청 재시도",
    code: "짧은 세션 만료",
    description: "짧은 세션이 끝나면 즉시 로그아웃하지 않고 갱신을 먼저 시도합니다.",
    label: "세션 만료",
    tone: "pending",
  },
  {
    action: "현재 기기 세션 종료",
    code: "로그인 유지 만료",
    description: "로그인 유지 기간이 끝나면 현재 기기 세션을 종료하고 로그인 화면으로 보냅니다.",
    label: "유지 기간 만료",
    tone: "warning",
  },
  {
    action: "전체 기기 점검 안내",
    code: "이전 세션 재사용",
    description: "교체된 로그인 유지 정보가 다시 쓰이면 재사용 감지 상태로 봅니다.",
    label: "재사용 감지",
    tone: "warning",
  },
  {
    action: "실시간 연결 다시 열기",
    code: "실시간 연결 갱신",
    description: "실시간 연결은 세션 갱신 뒤 다시 연결합니다.",
    label: "실시간 재연결",
    tone: "approved",
  },
];

const deviceSessions: DeviceSession[] = [
  {
    device: "MacBook Pro · Tauri",
    lastUsed: "방금 전",
    sessionState: "current",
    storage: "기기 보안 저장",
  },
  {
    device: "Chrome · Web",
    lastUsed: "18분 전",
    sessionState: "active",
    storage: "브라우저 보안 저장",
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
    <section className={styles.panel} aria-label="인증 세션 갱신 경계 패널">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            로그인 세션
          </Chip>
          <h2>로그인 유지는 기기별로 관리하고, 오래된 세션 재사용은 분리합니다</h2>
          <p>
            웹과 Tauri는 같은 로그인 흐름을 쓰지만, 로그인 유지 정보는 환경에 맞게 나눠 보관합니다. 프론트는
            만료, 갱신, 재사용 감지를 구분해 사용자 흐름과 실시간 연결을 안정적으로 이어갑니다.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">기기별 세션</StatusBadge>
          <strong>30일</strong>
          <span>로그인 유지 기간</span>
          <ProgressBar label="로그인 세션 정책 정합도" value={88} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>세션 저장과 교체 흐름</h3>
          <p>짧은 세션은 화면 요청에 쓰고, 로그인 유지 정보는 환경별 안전 저장소에서 교체합니다.</p>
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
            <p>로그아웃은 현재 기기 세션만 종료합니다.</p>
          </div>
          <div className={styles.deviceList}>
            {deviceSessions.map((session) => (
              <DeviceSessionRow key={session.device} session={session} />
            ))}
          </div>
          <div className={styles.notice}>
            <AlertTriangle size={16} strokeWidth={2.1} />
            <p>오래된 로그인 유지 정보가 다시 쓰이면 해당 계정의 다른 기기 상태 점검을 안내합니다.</p>
          </div>
          <div className={styles.notice}>
            <RadioTower size={16} strokeWidth={2.1} />
            <p>실시간 연결은 세션 갱신이 성공한 뒤 다시 연결합니다.</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>일반 파일이나 화면 저장소에 로그인 유지 정보 저장 금지</Chip>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footerPanel}>
        <LogOut size={18} strokeWidth={2.1} />
        <p>로그아웃은 서버의 기기 세션을 종료하고, 웹 또는 Tauri에 남은 로그인 유지 정보를 비웁니다.</p>
        <StatusBadge tone="approved">로그아웃</StatusBadge>
        <StatusBadge tone="pending">세션 갱신</StatusBadge>
      </GlassPanel>
    </section>
  );
}
