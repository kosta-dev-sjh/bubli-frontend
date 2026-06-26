import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  KeyRound,
  ListChecks,
  RefreshCcw,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./api-error-handling-boundary-panel.module.css";

type ErrorCase = {
  action: string;
  code: string;
  description: string;
  fields?: string[];
  icon: typeof ShieldAlert;
  label: string;
  owner: string;
  tone: "warning" | "pending" | "approved";
};

type HandlingRule = {
  detail: string;
  label: string;
  status: "required" | "recommended" | "watching";
};

const errorCases: ErrorCase[] = [
  {
    action: "refresh 먼저 시도",
    code: "AUTH_TOKEN_EXPIRED",
    description: "access token 만료는 바로 로그아웃하지 않고 재발급 요청 후 원래 요청을 한 번 다시 보냅니다.",
    icon: KeyRound,
    label: "인증 만료",
    owner: "src/lib/api",
    tone: "warning",
  },
  {
    action: "필드 하단에 표시",
    code: "VALIDATION_ERROR",
    description: "폼 입력 검증 실패는 화면 상단 경고와 필드별 reason을 함께 보여줍니다.",
    fields: ["bubliId", "displayName", "projectRoomName"],
    icon: ListChecks,
    label: "입력 검증",
    owner: "lib/validators",
    tone: "pending",
  },
  {
    action: "업로드 큐에서 재시도",
    code: "RESOURCE_UPLOAD_FAILED",
    description: "자료 업로드 실패는 진행률을 멈추고 원인과 다시 시도 버튼을 같은 행에 둡니다.",
    fields: ["fileSize", "mimeType"],
    icon: UploadCloud,
    label: "자료 업로드",
    owner: "features/resources",
    tone: "warning",
  },
  {
    action: "job 상태로 전환",
    code: "AGENT_JOB_FAILED",
    description: "에이전트 분석 실패는 후보를 확정하지 않고 job 실패 상태와 재시도 가능 여부를 분리해 보여줍니다.",
    icon: AlertTriangle,
    label: "에이전트 작업",
    owner: "features/agent",
    tone: "pending",
  },
  {
    action: "대기열에 보관",
    code: "NETWORK_OFFLINE",
    description: "Tauri에서 네트워크가 끊긴 작업은 기기 안 대기열에 남기고 중복 키로 다시 보냅니다.",
    icon: RefreshCcw,
    label: "로컬 동기화",
    owner: "src/lib/tauri",
    tone: "approved",
  },
];

const handlingRules: HandlingRule[] = [
  {
    detail: "모든 실패 응답은 `error.code`, `error.message`, `error.traceId`를 기준으로 읽습니다.",
    label: "공통 실패 구조",
    status: "required",
  },
  {
    detail: "`fields`가 있으면 전체 알림만 띄우지 않고 각 입력 위치에 reason을 연결합니다.",
    label: "필드 오류 연결",
    status: "required",
  },
  {
    detail: "traceId는 사용자에게 길게 노출하지 않고, 문의나 디버깅에 필요한 짧은 확인값으로 둡니다.",
    label: "추적값 노출",
    status: "recommended",
  },
  {
    detail: "재시도 가능한 오류와 사용자가 직접 고쳐야 하는 오류를 버튼 문구에서 분리합니다.",
    label: "행동 분기",
    status: "watching",
  },
];

const ruleStatusMeta: Record<HandlingRule["status"], { label: string; tone: "approved" | "pending" | "warning" }> = {
  recommended: { label: "권장", tone: "pending" },
  required: { label: "필수", tone: "approved" },
  watching: { label: "확인", tone: "warning" },
};

function ErrorCaseCard({ item }: { item: ErrorCase }) {
  const Icon = item.icon;

  return (
    <article className={styles.errorCard}>
      <div className={styles.errorTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
            <StatusBadge tone="neutral">{item.owner}</StatusBadge>
          </div>
          <h3>{item.code}</h3>
          <p>{item.description}</p>
        </div>
      </div>
      {item.fields ? (
        <div className={styles.fieldList} aria-label={`${item.label} 필드 오류`}>
          {item.fields.map((field) => (
            <code key={field}>{field}</code>
          ))}
        </div>
      ) : null}
      <div className={styles.actionRow}>
        <span>화면 행동</span>
        <strong>{item.action}</strong>
      </div>
    </article>
  );
}

function RuleCard({ rule }: { rule: HandlingRule }) {
  const meta = ruleStatusMeta[rule.status];

  return (
    <article className={styles.ruleCard}>
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      <div>
        <h4>{rule.label}</h4>
        <p>{rule.detail}</p>
      </div>
    </article>
  );
}

export function ApiErrorHandlingBoundaryPanel() {
  return (
    <section className={styles.panel} aria-label="API 에러 처리 경계 패널">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldAlert size={14} />} selected>
            에러 처리 기준
          </Chip>
          <h2>실패 응답은 한 번 해석하고, 화면은 사용자가 할 수 있는 행동을 보여줍니다</h2>
          <p>
            백엔드 응답의 `ApiError`는 공통 API client에서 먼저 정리합니다. 화면 컴포넌트는 코드 문자열보다
            재시도, 입력 수정, 대기열 보관 같은 다음 행동에 집중합니다.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">공통 처리</StatusBadge>
          <strong>5개</strong>
          <span>초기 실패 흐름</span>
          <ProgressBar label="공통 에러 처리 준비도" value={78} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.responseShape}>
        <div className={styles.sectionTitle}>
          <h3>응답 해석 흐름</h3>
          <p>실패 응답은 화면마다 직접 파싱하지 않고 공통 경계를 지나갑니다.</p>
        </div>
        <div className={styles.shapeFlow}>
          <code>{"{ success: false }"}</code>
          <ArrowRight size={16} strokeWidth={2.1} />
          <code>ApiError</code>
          <ArrowRight size={16} strokeWidth={2.1} />
          <code>AppError</code>
          <ArrowRight size={16} strokeWidth={2.1} />
          <code>UI action</code>
        </div>
      </GlassPanel>

      <div className={styles.grid}>
        <GlassPanel className={styles.casePanel}>
          <div className={styles.sectionTitle}>
            <h3>대표 실패 흐름</h3>
            <p>기획서와 백엔드 계약에서 화면 정책이 필요한 오류입니다.</p>
          </div>
          <div className={styles.caseGrid}>
            {errorCases.map((item) => (
              <ErrorCaseCard item={item} key={item.code} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>화면 규칙</h3>
            <p>에러를 숨기지 않되, 사용자가 다음 선택을 바로 알 수 있게 만듭니다.</p>
          </div>
          <div className={styles.ruleList}>
            {handlingRules.map((rule) => (
              <RuleCard key={rule.label} rule={rule} />
            ))}
          </div>
          <div className={styles.notice}>
            <FileWarning size={16} strokeWidth={2.1} />
            <p>서버 장애나 권한 오류는 원본 데이터를 임의로 바꾸지 않고 다시 조회하거나 대기 상태로 둡니다.</p>
          </div>
          <div className={styles.notice}>
            <Clock3 size={16} strokeWidth={2.1} />
            <p>Tauri 작업은 네트워크 복구 후 중복 방지 키 기준으로 한 번만 반영합니다.</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>화면별 문구는 실제 API code 확정 후 조정</Chip>
        </GlassPanel>
      </div>
    </section>
  );
}
