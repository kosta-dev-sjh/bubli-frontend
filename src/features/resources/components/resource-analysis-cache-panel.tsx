import { BrainCircuit, Database, FileSearch, Gauge, RefreshCcw, ShieldCheck } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-analysis-cache-panel.module.css";

type AnalysisCacheStatus = "hit" | "miss" | "expired" | "failed";

type AnalysisCacheEntry = {
  description: string;
  fileName: string;
  hashLabel: string;
  status: AnalysisCacheStatus;
  updatedAtLabel: string;
};

type AnalysisCacheMetric = {
  description: string;
  icon: "hash" | "cache" | "job" | "result";
  label: string;
  value: string;
};

export type ResourceAnalysisCachePanelProps = HTMLAttributes<HTMLElement> & {
  entries: AnalysisCacheEntry[];
  metrics: AnalysisCacheMetric[];
  title?: string;
};

const statusMeta: Record<AnalysisCacheStatus, { label: string; tone: StatusTone }> = {
  hit: { label: "캐시 사용", tone: "success" },
  miss: { label: "새 분석", tone: "pending" },
  expired: { label: "재분석 필요", tone: "warning" },
  failed: { label: "분석 실패", tone: "warning" },
};

const metricIcon: Record<AnalysisCacheMetric["icon"], ReactNode> = {
  hash: <ShieldCheck size={18} strokeWidth={2.1} />,
  cache: <Gauge size={18} strokeWidth={2.1} />,
  job: <BrainCircuit size={18} strokeWidth={2.1} />,
  result: <Database size={18} strokeWidth={2.1} />,
};

export function ResourceAnalysisCachePanel({
  className,
  entries,
  metrics,
  title = "자료 분석 캐시",
  ...props
}: ResourceAnalysisCachePanelProps) {
  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileSearch size={14} strokeWidth={2.1} />}>자료 분석</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              같은 파일인지 먼저 확인해 기존 분석 결과를 다시 쓸 수 있는지 봅니다. 새 분석이 필요할 때만 에이전트 정리 작업을 만들고, 결과는 자료와 분리해 저장합니다.
            </p>
          </div>
        </div>
        <div className={styles.contractCard}>
          <span>비용 기준</span>
          <strong>NFR-11</strong>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label="분석 캐시 기준">
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

      <div className={styles.flow} aria-label="분석 처리 흐름">
        <article>
          <span aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>파일 지문 확인</h3>
            <p>업로드된 파일이 이전에 분석한 파일과 같은지 비교합니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Gauge size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>캐시 우선</h3>
            <p>유효한 결과가 있으면 모델 호출 없이 기존 결과를 보여줍니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <BrainCircuit size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>에이전트 정리 작업</h3>
            <p>새 분석이 필요할 때만 정리 작업을 만들고 상태를 추적합니다.</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Database size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>결과 분리 저장</h3>
            <p>사용자가 올린 자료와 에이전트 분석 결과를 분리해 둡니다.</p>
          </div>
        </article>
      </div>

      <section className={styles.entryList} aria-label="분석 캐시 항목">
        {entries.map((entry) => {
          const meta = statusMeta[entry.status];

          return (
            <article className={styles.entryItem} key={`${entry.fileName}-${entry.hashLabel}`}>
              <div className={styles.entryMain}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <FileSearch size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <h3>{entry.fileName}</h3>
                  <p>{entry.description}</p>
                  <span>{entry.hashLabel} · {entry.updatedAtLabel}</span>
                </div>
              </div>
              <div className={styles.entrySide}>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                {entry.status === "failed" || entry.status === "expired" ? (
                  <button className={styles.retryButton} type="button">
                    <RefreshCcw size={15} strokeWidth={2.1} />
                    다시 분석
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
