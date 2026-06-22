import { Braces, BrainCircuit, CheckCircle2, FileJson2, ShieldCheck, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./agent-schema-validation-panel.module.css";

type SchemaValidationStatus = "passed" | "needsReview" | "failed" | "pending";

type SchemaValidationResult = {
  description: string;
  field: string;
  status: SchemaValidationStatus;
  value: string;
};

type SchemaValidationMetric = {
  description: string;
  icon: "schema" | "prompt" | "model" | "job";
  label: string;
  value: string;
};

export type AgentSchemaValidationPanelProps = HTMLAttributes<HTMLElement> & {
  metrics: SchemaValidationMetric[];
  title?: string;
  validationResults: SchemaValidationResult[];
};

const statusMeta: Record<SchemaValidationStatus, { label: string; tone: StatusTone }> = {
  passed: { label: "검증 통과", tone: "success" },
  needsReview: { label: "확인 필요", tone: "warning" },
  failed: { label: "검증 실패", tone: "warning" },
  pending: { label: "대기", tone: "pending" },
};

const metricIcon: Record<SchemaValidationMetric["icon"], ReactNode> = {
  schema: <FileJson2 size={18} strokeWidth={2.1} />,
  prompt: <Braces size={18} strokeWidth={2.1} />,
  model: <BrainCircuit size={18} strokeWidth={2.1} />,
  job: <ShieldCheck size={18} strokeWidth={2.1} />,
};

export function AgentSchemaValidationPanel({
  className,
  metrics,
  title = "에이전트 결과 검증",
  validationResults,
  ...props
}: AgentSchemaValidationPanelProps) {
  const failedCount = validationResults.filter((result) => result.status === "failed").length;
  const reviewCount = validationResults.filter((result) => result.status === "needsReview").length;
  const hasIssue = failedCount + reviewCount > 0;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileJson2 size={14} strokeWidth={2.1} />}>Structured Output</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              에이전트가 만든 JSON 결과는 schema_version 기준으로 검증한 뒤 후보로 저장합니다. 사용자가 승인하기 전에는 작업, WBS, 일정 같은 확정 데이터로 쓰지 않습니다.
            </p>
          </div>
        </div>
        <div className={styles.resultCard}>
          <span>검증 상태</span>
          <strong>{hasIssue ? `${failedCount + reviewCount}건 확인` : "통과"}</strong>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label="에이전트 결과 추적 기준">
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span className={styles.metricIcon} aria-hidden="true">
              {metricIcon[metric.icon]}
            </span>
            <div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.description}</span>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.flow} aria-label="검증 흐름">
        <article>
          <span aria-hidden="true">
            <BrainCircuit size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>후보 JSON 생성</h3>
            <p>에이전트는 요약, 확인 질문, WBS/TODO 후보를 구조화된 결과로 만듭니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <FileJson2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>schema 검증</h3>
            <p>필수 필드와 상태값이 현재 schema_version과 맞는지 확인합니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>후보 저장</h3>
            <p>검증된 결과만 DRAFT 후보로 저장하고 화면에 보여줍니다.</p>
          </div>
        </article>
      </div>

      <section className={styles.resultList} aria-label="검증 결과 목록">
        {validationResults.map((result) => {
          const meta = statusMeta[result.status];

          return (
            <article className={styles.resultItem} key={`${result.field}-${result.value}`}>
              <div className={styles.resultMain}>
                <span className={styles.fieldIcon} aria-hidden="true">
                  {result.status === "failed" ? <TriangleAlert size={18} strokeWidth={2.1} /> : <Braces size={18} strokeWidth={2.1} />}
                </span>
                <div>
                  <h3>{result.field}</h3>
                  <p>{result.description}</p>
                  <span>{result.value}</span>
                </div>
              </div>
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
