import {
  ArrowRight,
  Braces,
  CheckCircle2,
  FileJson2,
  GitBranch,
  Layers3,
  MonitorCheck,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./api-contract-adapter-boundary-panel.module.css";

type BoundaryStep = {
  description: string;
  icon: typeof FileJson2;
  label: string;
  owner: string;
  status: "fixed" | "replaceable" | "stable";
};

type ChangeCase = {
  after: string;
  before: string;
  impact: string;
  label: string;
  target: string;
};

const boundarySteps: BoundaryStep[] = [
  {
    description: "Swagger, .http, 백엔드 샘플 응답을 보고 서버 응답 타입을 맞춥니다.",
    icon: FileJson2,
    label: "Response DTO",
    owner: "src/types/api",
    status: "replaceable",
  },
  {
    description: "서버 응답 필드명을 화면에서 쓰는 이름으로 한 번 변환합니다.",
    icon: GitBranch,
    label: "mapper",
    owner: "features/*/api",
    status: "replaceable",
  },
  {
    description: "컴포넌트는 화면에 필요한 값과 상태값만 받습니다.",
    icon: Layers3,
    label: "view model",
    owner: "features/*/components",
    status: "stable",
  },
  {
    description: "카드, 패널, 버블은 API 응답 모양을 직접 알지 않습니다.",
    icon: MonitorCheck,
    label: "UI component",
    owner: "Storybook",
    status: "fixed",
  },
];

const changeCases: ChangeCase[] = [
  {
    after: "expiresAt",
    before: "expires_at",
    impact: "토큰 응답 mapper만 수정",
    label: "인증",
    target: "authApi",
  },
  {
    after: "nextCursor",
    before: "nextSequence",
    impact: "채팅 목록 변환 함수만 수정",
    label: "채팅",
    target: "chatApi",
  },
  {
    after: "jobStatus",
    before: "status",
    impact: "agent job 타입과 mapper만 수정",
    label: "에이전트",
    target: "agentApi",
  },
  {
    after: "rollupKey",
    before: "summaryKey",
    impact: "Tauri 집계 동기화 업무 기준만 수정",
    label: "위젯",
    target: "widget boundary",
  },
];

const statusMeta: Record<BoundaryStep["status"], { label: string; tone: "approved" | "pending" | "warning" }> = {
  fixed: { label: "보호됨", tone: "approved" },
  replaceable: { label: "교체 지점", tone: "warning" },
  stable: { label: "화면 기준", tone: "pending" },
};

function BoundaryCard({ step }: { step: BoundaryStep }) {
  const Icon = step.icon;
  const meta = statusMeta[step.status];

  return (
    <article className={styles.boundaryCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.cardHeader}>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <StatusBadge tone="neutral">{step.owner}</StatusBadge>
        </div>
        <h3>{step.label}</h3>
        <p>{step.description}</p>
      </div>
    </article>
  );
}

function ChangeCaseRow({ item }: { item: ChangeCase }) {
  return (
    <article className={styles.changeRow}>
      <div className={styles.changeLabel}>
        <StatusBadge tone="room">{item.label}</StatusBadge>
        <strong>{item.target}</strong>
      </div>
      <div className={styles.fieldSwap} aria-label={`${item.before}에서 ${item.after}로 변경`}>
        <code>{item.before}</code>
        <ArrowRight size={14} strokeWidth={2.1} />
        <code>{item.after}</code>
      </div>
      <p>{item.impact}</p>
    </article>
  );
}

export function ApiContractAdapterBoundaryPanel() {
  return (
    <section className={styles.panel} aria-label="API 기준 변경 경계 패널">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            API 변경 대응 기준
          </Chip>
          <h2>API 명세가 바뀌어도 화면은 view model 기준으로 유지합니다</h2>
          <p>
            백엔드 응답은 바뀔 수 있습니다. 그래서 Bubli 프론트는 응답 DTO와 mapper를 기능 폴더 안에 두고,
            컴포넌트는 화면에 필요한 값만 받도록 분리합니다.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">컴포넌트 보호</StatusBadge>
          <strong>1곳</strong>
          <span>기능별 API 경계에서 변환</span>
          <ProgressBar label="API 변경 흡수 준비도" value={84} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>권장 흐름</h3>
          <p>화면은 서버 응답 모양이 아니라 변환된 화면 데이터에 의존합니다.</p>
        </div>
        <div className={styles.boundaryGrid}>
          {boundarySteps.map((step, index) => (
            <div className={styles.boundarySlot} key={step.label}>
              <BoundaryCard step={step} />
              {index < boundarySteps.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.changePanel}>
          <div className={styles.sectionTitle}>
            <h3>명세 변경 예시</h3>
            <p>필드명이 달라져도 화면 파일을 직접 고치지 않는 방향입니다.</p>
          </div>
          <div className={styles.changeList}>
            {changeCases.map((item) => (
              <ChangeCaseRow item={item} key={item.label} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>작업 규칙</h3>
            <p>API 확정 전에도 만들 수 있는 화면과 기다려야 하는 코드를 나눕니다.</p>
          </div>
          <ul className={styles.ruleList}>
            <li>
              <CheckCircle2 size={15} strokeWidth={2.1} />
              <span>Storybook 컴포넌트는 view model props 기준으로 먼저 만든다.</span>
            </li>
            <li>
              <Braces size={15} strokeWidth={2.1} />
              <span>서버 응답 타입은 `src/types/api`에 모으고 화면 타입과 섞지 않는다.</span>
            </li>
            <li>
              <RefreshCcw size={15} strokeWidth={2.1} />
              <span>명세가 바뀌면 API 함수와 mapper부터 수정하고 화면 영향 범위를 확인한다.</span>
            </li>
            <li>
              <SlidersHorizontal size={15} strokeWidth={2.1} />
              <span>확정 전 API는 TODO가 아니라 업무 기준 대기 상태로 표시한다.</span>
            </li>
          </ul>
        </GlassPanel>
      </div>
    </section>
  );
}
