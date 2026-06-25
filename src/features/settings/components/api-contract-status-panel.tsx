import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  FileUp,
  KeyRound,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./api-contract-status-panel.module.css";

type ContractStatus = "ready" | "needsBackendSample" | "watching";
type ContractArea = {
  checks: string[];
  description: string;
  endpoint: string;
  label: string;
  owner: string;
  progress: number;
  status: ContractStatus;
};

const contracts: ContractArea[] = [
  {
    checks: ["access token은 메모리", "refresh token은 cookie 또는 OS secure storage"],
    description: "구글 OAuth 시작은 서버 리다이렉트를 사용하고, 토큰 재발급과 내 정보 조회는 공통 응답 형식에 맞춰 연결합니다.",
    endpoint: "/oauth2/authorization/google",
    label: "인증",
    owner: "features/auth/api",
    progress: 82,
    status: "needsBackendSample",
  },
  {
    checks: ["multipart 진행률 표시", "성공 후 resourceId 기준", "다운로드는 권한 확인 후 URL"],
    description: "자료 업로드는 Spring Boot multipart 중계 방식을 기준으로 시작합니다.",
    endpoint: "/api/resources",
    label: "파일 업로드",
    owner: "features/resources/api",
    progress: 76,
    status: "watching",
  },
  {
    checks: ["clientMessageId 필수", "roomSequence 기준", "DB 저장 후 WebSocket"],
    description: "채팅은 서버 메시지를 전송 완료 기준으로 삼고 누락분은 sequence로 보충합니다.",
    endpoint: "/api/chat/rooms/{id}/messages",
    label: "채팅",
    owner: "features/communication/api",
    progress: 88,
    status: "ready",
  },
  {
    checks: ["RealtimeEnvelope 사용", "토큰 만료 시 refresh 후 재연결"],
    description: "프로젝트룸 이벤트와 채팅 이벤트는 HTTP 응답이 아니라 실시간 envelope로 받습니다.",
    endpoint: "/topic/project-rooms/{roomId}/events",
    label: "WebSocket",
    owner: "app/providers",
    progress: 72,
    status: "needsBackendSample",
  },
  {
    checks: ["serverUrl과 token만 사용", "key와 secret은 서버 전용", "멤버 권한 확인 후 토큰 발급"],
    description: "보이스챗은 API 서버에서 받은 LiveKit 접속 정보로만 연결합니다.",
    endpoint: "/api/voice/rooms/{id}/token",
    label: "LiveKit",
    owner: "features/communication/api",
    progress: 79,
    status: "ready",
  },
  {
    checks: ["jobId로 상태 조회", "후보만 생성", "확정 데이터는 target Service"],
    description: "에이전트 실행은 오래 걸릴 수 있으므로 agent job 상태와 이벤트를 함께 봅니다.",
    endpoint: "/api/agent/jobs/{jobId}",
    label: "agent_jobs",
    owner: "features/agent/api",
    progress: 86,
    status: "ready",
  },
  {
    checks: ["idempotencyKey 필수", "재시도 대기열", "서버 원본과 로컬 복구 분리"],
    description: "Tauri에서 생긴 미전송 요청은 local outbox에 두고 중복 없이 다시 보냅니다.",
    endpoint: "flush_sync_outbox",
    label: "Tauri 동기화",
    owner: "src/lib/tauri",
    progress: 68,
    status: "watching",
  },
];

const statusMeta: Record<ContractStatus, { label: string; tone: "approved" | "warning" | "pending" }> = {
  needsBackendSample: { label: "샘플 필요", tone: "warning" },
  ready: { label: "연결 준비", tone: "approved" },
  watching: { label: "확인 중", tone: "pending" },
};

const iconMap: Record<string, typeof KeyRound> = {
  "LiveKit": RadioTower,
  "Tauri 동기화": Database,
  "WebSocket": Bell,
  "agent_jobs": Bot,
  "인증": KeyRound,
  "채팅": MessageSquareText,
  "파일 업로드": FileUp,
};

function ContractCard({ item }: { item: ContractArea }) {
  const status = statusMeta[item.status];
  const Icon = iconMap[item.label] ?? ShieldCheck;

  return (
    <article className={styles.contractCard}>
      <div className={styles.cardTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone="neutral">{item.owner}</StatusBadge>
          </div>
          <h3>{item.label}</h3>
          <p>{item.description}</p>
        </div>
        <StatusBadge tone="agent">{item.endpoint}</StatusBadge>
      </div>
      <div className={styles.chips}>
        {item.checks.map((check) => (
          <Chip icon={<CheckCircle2 size={14} />} key={check}>
            {check}
          </Chip>
        ))}
      </div>
      <ProgressBar label={`${item.label} 계약 반영률`} value={item.progress} />
    </article>
  );
}

export function ApiContractStatusPanel() {
  return (
    <section className={styles.panel} aria-label="API 계약 상태 패널">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<ShieldCheck size={14} />} selected>
            API 계약 상태
          </Chip>
          <h2>프론트는 확정된 API 계약을 기준으로 연결하고, 대기 항목은 표시해 둡니다</h2>
          <p>
            인증, 채팅, 보이스챗, 에이전트 job, Tauri 동기화는 API 계약의 저장 기준을 따릅니다. 백엔드
            산출물과 DTO 샘플이 확인되면 API client에 반영합니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="approved">계약 기준</StatusBadge>
          <strong>7개</strong>
          <span>연동 축 확인</span>
          <ProgressBar label="API 계약 반영 준비도" value={79} />
        </div>
      </GlassPanel>

      <div className={styles.flow}>
        <span>기획서 v15</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>백엔드 API 계약</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>프론트 API client</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>화면/버블 연결</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.list}>
          <div className={styles.sectionTitle}>
            <h3>연동 기준</h3>
            <p>기능별 화면보다 먼저 맞춰야 하는 API 계약입니다.</p>
          </div>
          <div className={styles.items}>
            {contracts.map((item) => (
              <ContractCard item={item} key={item.label} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.requests}>
          <h3>백엔드에 받을 산출물</h3>
          <article className={styles.requestCard}>
            <code>auth.http</code>
            <h4>인증 흐름 검증</h4>
            <p>로그인, refresh, logout, 내 정보 조회 응답 DTO를 맞춥니다.</p>
          </article>
          <article className={styles.requestCard}>
            <code>Swagger/OpenAPI</code>
            <h4>request/response 기준</h4>
            <p>프론트 타입은 Entity가 아니라 Response DTO를 기준으로 만듭니다.</p>
          </article>
          <article className={styles.requestCard}>
            <code>WebSocket sample</code>
            <h4>실시간 payload 예시</h4>
            <p>채팅, 프로젝트룸 이벤트, agent job 이벤트 envelope를 확인합니다.</p>
          </article>
          <article className={styles.requestCard}>
            <code>voice.http</code>
            <h4>LiveKit token 검증</h4>
            <p>프론트와 Tauri는 서버가 발급한 token과 serverUrl만 사용합니다.</p>
          </article>
        </GlassPanel>
      </div>
    </section>
  );
}
