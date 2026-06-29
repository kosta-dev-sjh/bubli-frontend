import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  FileCheck2,
  FileClock,
  FileSearch,
  Fingerprint,
  Gauge,
  LockKeyhole,
  UploadCloud,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-upload-validation-boundary-panel.module.css";

export type ResourceUploadValidationStatus = "ready" | "checking" | "blocked" | "reused";

export type ResourceUploadValidationItem = {
  checksumLabel: string;
  extensionLabel: string;
  fileName: string;
  mimeLabel: string;
  reason: string;
  sizeLabel: string;
  status: ResourceUploadValidationStatus;
  targetLabel: "개인 자료" | "프로젝트룸 자료";
};

export type ResourceUploadValidationSummary = {
  allowedFormatCount: number;
  checkedFileCount: number;
  maxFileSizeLabel: string;
  readyFileCount: number;
};

export type ResourceUploadValidationBoundaryPanelProps = HTMLAttributes<HTMLElement> & {
  items: ResourceUploadValidationItem[];
  summary: ResourceUploadValidationSummary;
  title?: string;
};

const statusMeta: Record<
  ResourceUploadValidationStatus,
  { icon: ReactNode; label: string; tone: StatusTone }
> = {
  blocked: {
    icon: <AlertTriangle size={15} strokeWidth={2.1} />,
    label: "업로드 차단",
    tone: "warning",
  },
  checking: {
    icon: <FileClock size={15} strokeWidth={2.1} />,
    label: "확인 중",
    tone: "pending",
  },
  ready: {
    icon: <CheckCircle2 size={15} strokeWidth={2.1} />,
    label: "업로드 가능",
    tone: "success",
  },
  reused: {
    icon: <Fingerprint size={15} strokeWidth={2.1} />,
    label: "기존 분석 사용",
    tone: "agent",
  },
};

const ruleCards: Array<{
  description: string;
  icon: ReactNode;
  label: string;
  value: string;
}> = [
  {
    description: "확장자만 믿지 않고 브라우저가 알려준 파일 형식도 함께 확인합니다.",
    icon: <FileCheck2 size={18} strokeWidth={2.1} />,
    label: "형식 확인",
    value: "확장자 + 파일 형식",
  },
  {
    description: "단일 파일 제한을 넘으면 서버 저장과 분석 요청을 시작하지 않습니다.",
    icon: <Gauge size={18} strokeWidth={2.1} />,
    label: "크기 제한",
    value: "100MB",
  },
  {
    description: "파일 지문이 같으면 같은 자료를 다시 분석하지 않고 기존 결과를 이어서 보여줍니다.",
    icon: <Fingerprint size={18} strokeWidth={2.1} />,
    label: "중복 분석 방지",
    value: "파일 지문",
  },
  {
    description: "성공한 자료만 자료보드에 등록하고, 그 뒤에 에이전트 정리 상태로 넘어갑니다.",
    icon: <DatabaseZap size={18} strokeWidth={2.1} />,
    label: "분석 시작 경계",
    value: "자료 등록",
  },
];

function ValidationItemRow({ item }: { item: ResourceUploadValidationItem }) {
  const meta = statusMeta[item.status];
  const scopeTone: StatusTone = item.targetLabel === "개인 자료" ? "personal" : "room";

  return (
    <article className={styles.itemRow}>
      <div className={styles.itemMain}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileSearch size={17} strokeWidth={2.1} />
        </span>
        <div className={styles.itemText}>
          <div className={styles.itemTitleLine}>
            <h3>{item.fileName}</h3>
            <StatusBadge tone={scopeTone}>{item.targetLabel}</StatusBadge>
          </div>
          <p>{item.reason}</p>
        </div>
      </div>
      <div className={styles.itemChecks} aria-label={`${item.fileName} 검증 결과`}>
        <span>{item.extensionLabel}</span>
        <span>{item.mimeLabel}</span>
        <span>{item.sizeLabel}</span>
        <span>{item.checksumLabel}</span>
      </div>
      <StatusBadge className={styles.statusBadge} tone={meta.tone}>
        <span className={styles.statusContent}>
          {meta.icon}
          {meta.label}
        </span>
      </StatusBadge>
    </article>
  );
}

export function ResourceUploadValidationBoundaryPanel({
  className,
  items,
  summary,
  title = "자료 업로드 검증 경계",
  ...props
}: ResourceUploadValidationBoundaryPanelProps) {
  const readyPercent =
    summary.checkedFileCount > 0
      ? Math.round((summary.readyFileCount / summary.checkedFileCount) * 100)
      : 0;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<UploadCloud size={14} strokeWidth={2.1} />} selected>
            자료보드
          </Chip>
          <div>
            <h2>{title}</h2>
            <p>
              서버에 파일을 보내기 전에 형식, 용량, 파일 지문, 자료 범위를 먼저 확인합니다. 성공한
              자료만 자료보드에 등록하고 에이전트 정리 작업으로 이어집니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard} aria-label="업로드 검증 요약">
          <strong>{readyPercent}%</strong>
          <span>업로드 가능</span>
          <ProgressBar label="업로드 가능 파일 비율" value={readyPercent} />
        </div>
      </header>

      <div className={styles.metrics} aria-label="업로드 검증 기준">
        <div>
          <span>검사한 파일</span>
          <strong>{summary.checkedFileCount}개</strong>
        </div>
        <div>
          <span>허용 형식</span>
          <strong>{summary.allowedFormatCount}종</strong>
        </div>
        <div>
          <span>단일 파일</span>
          <strong>{summary.maxFileSizeLabel}</strong>
        </div>
        <div>
          <span>분석 시작</span>
          <strong>자료 등록 이후</strong>
        </div>
      </div>

      <section className={styles.flow} aria-label="업로드 검증 후 처리 흐름">
        <div>기기 안 확인</div>
        <span aria-hidden="true" />
        <div>서버 업로드</div>
        <span aria-hidden="true" />
        <div>자료 등록</div>
        <span aria-hidden="true" />
        <div>에이전트 정리</div>
        <span aria-hidden="true" />
        <div>후보 확인</div>
      </section>

      <section className={styles.ruleGrid} aria-label="업로드 검증 규칙">
        {ruleCards.map((rule) => (
          <article className={styles.ruleCard} key={rule.label}>
            <span className={styles.ruleIcon} aria-hidden="true">
              {rule.icon}
            </span>
            <div>
              <div className={styles.ruleTop}>
                <h3>{rule.label}</h3>
                <code>{rule.value}</code>
              </div>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.itemList} aria-label="파일별 검증 결과">
        {items.map((item) => (
          <ValidationItemRow item={item} key={`${item.targetLabel}-${item.fileName}`} />
        ))}
      </section>

      <footer className={styles.notice}>
        <LockKeyhole size={18} strokeWidth={2.1} aria-hidden="true" />
        <p>
          차단된 파일은 서버 저장과 분석을 시작하지 않습니다. 프로젝트룸 자료로 올리는 경우에도 사용자가
          선택한 범위와 권한 확인을 먼저 거칩니다.
        </p>
      </footer>
    </GlassPanel>
  );
}
