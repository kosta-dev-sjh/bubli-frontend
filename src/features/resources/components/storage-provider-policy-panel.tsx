import { AlertTriangle, Cloud, Database, Download, HardDrive, ShieldCheck } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./storage-provider-policy-panel.module.css";

type StoragePolicyStatus = "ready" | "checking" | "limited" | "blocked";

type StoragePolicyStep = {
  description: string;
  label: string;
  status: StoragePolicyStatus;
  value: string;
};

export type StorageProviderPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  currentProviderLabel: string;
  downloadRuleLabel: string;
  failureReason?: string;
  limitLabel: string;
  steps: StoragePolicyStep[];
  title?: string;
  usageLabel: string;
  usagePercent: number;
};

const statusMeta: Record<StoragePolicyStatus, { label: string; tone: StatusTone }> = {
  ready: { label: "준비됨", tone: "success" },
  checking: { label: "확인 중", tone: "pending" },
  limited: { label: "제한 있음", tone: "warning" },
  blocked: { label: "차단됨", tone: "warning" },
};

const policyCards: Array<{
  description: string;
  icon: ReactNode;
  label: string;
}> = [
  {
    description: "초기 검증은 로컬 저장소로 빠르게 확인하고, 화면 계약은 그대로 둡니다.",
    icon: <HardDrive size={18} strokeWidth={2.1} />,
    label: "로컬 검증",
  },
  {
    description: "최종 파일 원본은 S3에 두고, 서버 DB에는 접근 판단에 필요한 메타데이터를 남깁니다.",
    icon: <Cloud size={18} strokeWidth={2.1} />,
    label: "S3 저장",
  },
  {
    description: "파일 경로가 아니라 로그인 사용자, visibility, 프로젝트룸 권한으로 내려받기를 판단합니다.",
    icon: <ShieldCheck size={18} strokeWidth={2.1} />,
    label: "서버 권한 확인",
  },
  {
    description: "권한이 확인된 사용자에게만 짧게 쓰는 내려받기 주소를 발급합니다.",
    icon: <Download size={18} strokeWidth={2.1} />,
    label: "주소 발급",
  },
];

export function StorageProviderPolicyPanel({
  className,
  currentProviderLabel,
  downloadRuleLabel,
  failureReason,
  limitLabel,
  steps,
  title = "저장소 제공자 정책",
  usageLabel,
  usagePercent,
  ...props
}: StorageProviderPolicyPanelProps) {
  const safeUsagePercent = Math.max(0, Math.min(100, usagePercent));
  const usageTone = safeUsagePercent >= 100 ? "warning" : safeUsagePercent >= 80 ? "pending" : "success";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Database size={14} strokeWidth={2.1} />}>자료 저장소</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              저장 위치가 바뀌어도 자료보드는 같은 API 계약을 보고, 접근은 서버 권한 기준으로 판단합니다.
            </p>
          </div>
        </div>
        <div className={styles.providerBadge}>
          <span>현재 기준</span>
          <strong>{currentProviderLabel}</strong>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.usageCard} aria-label="저장 용량 상태">
          <div className={styles.usageHeader}>
            <div>
              <p className={styles.kicker}>GET /api/storage/usage</p>
              <h3 className={styles.cardTitle}>개인 자료함 용량</h3>
            </div>
            <StatusBadge tone={usageTone}>{safeUsagePercent >= 100 ? "업로드 차단" : "사용 가능"}</StatusBadge>
          </div>
          <ProgressBar label="개인 자료함 서버 저장 용량" value={safeUsagePercent} />
          <div className={styles.usageMeta}>
            <span>{usageLabel}</span>
            <strong>{limitLabel}</strong>
          </div>
          <p className={styles.helperText}>
            용량을 넘으면 로컬 색인은 유지하고, 서버 업로드만 막습니다.
          </p>
        </section>

        <section className={styles.downloadCard} aria-label="다운로드 정책">
          <span className="bubli-icon-tile" aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.1} />
          </span>
          <div>
            <p className={styles.kicker}>GET /api/resources/:id/download-url</p>
            <h3 className={styles.cardTitle}>{downloadRuleLabel}</h3>
            <p className={styles.helperText}>
              S3 객체는 바로 열지 않고, 서버가 권한을 확인한 뒤 내려받기 주소를 발급합니다.
            </p>
          </div>
        </section>
      </div>

      <div className={styles.policyGrid}>
        {policyCards.map((card) => (
          <article className={styles.policyCard} key={card.label}>
            <span className={styles.policyIcon} aria-hidden="true">
              {card.icon}
            </span>
            <div>
              <h3>{card.label}</h3>
              <p>{card.description}</p>
            </div>
          </article>
        ))}
      </div>

      <section className={styles.steps} aria-label="저장소 처리 단계">
        {steps.map((step) => {
          const meta = statusMeta[step.status];

          return (
            <article className={styles.step} key={`${step.label}-${step.value}`}>
              <div className={styles.stepHeader}>
                <h3>{step.label}</h3>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
              <strong>{step.value}</strong>
              <p>{step.description}</p>
            </article>
          );
        })}
      </section>

      {failureReason ? (
        <aside className={styles.notice} aria-label="업로드 실패 사유">
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>업로드 실패 사유 저장</strong>
            <p>{failureReason}</p>
          </div>
        </aside>
      ) : null}
    </GlassPanel>
  );
}
