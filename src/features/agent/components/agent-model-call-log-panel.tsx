import type { ReactNode } from "react";

import {
  Activity,
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  FileJson,
  Gauge,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./agent-model-call-log-panel.module.css";

type CallStatus = "SUCCEEDED" | "FAILED" | "RETRIED";

type ModelCallLog = {
  errorCode?: string;
  inputTokens: number;
  jobId: string;
  latencyMs?: number;
  modelName: string;
  outputTokens: number;
  promptVersion: string;
  schemaVersion: string;
  status: CallStatus;
  target: string;
  title: string;
};

type TraceItem = {
  icon: ReactNode;
  label: string;
  text: string;
};

const logs: ModelCallLog[] = [
  {
    inputTokens: 4820,
    jobId: "job-20260622-001",
    latencyMs: 1840,
    modelName: "bedrock-claude-haiku",
    outputTokens: 924,
    promptVersion: "resource-analysis-v3",
    schemaVersion: "resource-analysis-json-v2",
    status: "SUCCEEDED",
    target: "resource_analysis",
    title: "번역계약서_v2.pdf 분석",
  },
  {
    inputTokens: 2650,
    jobId: "job-20260622-002",
    latencyMs: 1120,
    modelName: "bedrock-claude-haiku",
    outputTokens: 618,
    promptVersion: "wbs-todo-candidate-v2",
    schemaVersion: "agent-suggestion-json-v2",
    status: "SUCCEEDED",
    target: "agent_suggestions",
    title: "회의록 WBS/TODO 후보",
  },
  {
    errorCode: "SCHEMA_VALIDATION_FAILED",
    inputTokens: 3912,
    jobId: "job-20260621-014",
    modelName: "bedrock-claude-haiku",
    outputTokens: 204,
    promptVersion: "requirement-extract-v2",
    schemaVersion: "requirement-json-v2",
    status: "RETRIED",
    target: "agent_job_events",
    title: "요구사항_초안.docx 재검증",
  },
];

const statusMeta: Record<CallStatus, { label: string; tone: "success" | "warning" | "pending"; icon: ReactNode }> = {
  FAILED: { icon: <TriangleAlert size={15} strokeWidth={2.1} />, label: "실패", tone: "warning" },
  RETRIED: { icon: <RotateCcw size={15} strokeWidth={2.1} />, label: "재검증", tone: "pending" },
  SUCCEEDED: { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, label: "기록됨", tone: "success" },
};

const traceItems: TraceItem[] = [
  {
    icon: <Bot size={16} strokeWidth={2.1} />,
    label: "에이전트 모듈",
    text: "문서 분석과 후보 JSON 생성을 맡고 확정 데이터는 만들지 않습니다.",
  },
  {
    icon: <FileJson size={16} strokeWidth={2.1} />,
    label: "스키마 검증",
    text: "Structured Output 결과는 schema_version 기준으로 검증합니다.",
  },
  {
    icon: <Database size={16} strokeWidth={2.1} />,
    label: "저장 위치",
    text: "결과는 resource_analysis, agent_suggestions, agent_job_events에 후보로 남깁니다.",
  },
  {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    label: "권한 경계",
    text: "프론트와 Tauri는 API 서버를 통해 상태와 결과만 조회합니다.",
  },
];

function LogRow({ log }: { log: ModelCallLog }) {
  const status = statusMeta[log.status];
  const totalTokens = log.inputTokens + log.outputTokens;

  return (
    <article className={styles.logRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {status.icon}
      </span>
      <div className={styles.logBody}>
        <div className={styles.meta}>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{log.modelName}</span>
          <span>{log.target}</span>
        </div>
        <h3>{log.title}</h3>
        <p>{log.jobId}</p>
        <div className={styles.versionGrid}>
          <span>
            <b>prompt</b>
            {log.promptVersion}
          </span>
          <span>
            <b>schema</b>
            {log.schemaVersion}
          </span>
          <span>
            <b>tokens</b>
            {totalTokens.toLocaleString("ko-KR")}
          </span>
          <span>
            <b>latency</b>
            {log.latencyMs ? `${log.latencyMs.toLocaleString("ko-KR")}ms` : "검증 실패"}
          </span>
        </div>
        {log.errorCode ? (
          <div className={styles.errorLine}>
            <TriangleAlert size={14} strokeWidth={2.1} aria-hidden="true" />
            <span>{log.errorCode}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AgentModelCallLogPanel() {
  return (
    <section className={styles.panel} aria-label="에이전트 모델 호출 로그">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<Activity size={14} />} selected>
            모델 호출 로그
          </Chip>
          <h2>에이전트 결과는 job, prompt, schema, model 기준으로 추적합니다</h2>
          <p>
            문서 분석 결과가 달라졌을 때 어떤 프롬프트와 스키마, 모델 기준으로 만들어졌는지 확인할 수 있어야
            합니다. 이 로그는 결과 품질과 호출량을 관리하기 위한 근거입니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="agent">agent_model_call_logs</StatusBadge>
          <strong>3</strong>
          <span>최근 호출</span>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label="모델 호출 추적 흐름">
        <span>agent_jobs</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>model call</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>JSON schema 검증</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>후보 저장</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.logPanel}>
          <div className={styles.toolbar}>
            <div>
              <h3>최근 호출 기록</h3>
              <p>토큰 수, 응답 시간, 실패 코드는 모델 호출 로그에 남깁니다.</p>
            </div>
            <Button icon={<RotateCcw size={15} />} size="sm" variant="quiet">
              로그 새로고침
            </Button>
          </div>
          <div className={styles.list}>
            {logs.map((log) => (
              <LogRow key={`${log.jobId}-${log.promptVersion}`} log={log} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.tracePanel}>
          <h3>처리 경계</h3>
          {traceItems.map((item) => (
            <article key={item.label}>
              <span aria-hidden="true">{item.icon}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footer}>
        <Gauge size={17} strokeWidth={2.1} aria-hidden="true" />
        <p>
          같은 샘플 문서를 다시 분석할 때는 prompt_version, schema_version, model_name을 함께 비교합니다.
        </p>
        <Chip icon={<Braces size={14} />}>Structured Output</Chip>
        <Chip icon={<Clock3 size={14} />}>latency_ms</Chip>
      </GlassPanel>
    </section>
  );
}
