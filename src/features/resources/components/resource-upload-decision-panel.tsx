import {
  CheckCircle2,
  Database,
  FileText,
  FolderInput,
  HardDrive,
  LockKeyhole,
  MessageSquareText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-upload-decision-panel.module.css";

export type ResourceUploadDecision = "PERSONAL_LIBRARY" | "ROOM_RESOURCE" | "TEMP_ANALYSIS";

export type ResourceDecisionOption = {
  description: string;
  disabled?: boolean;
  id: ResourceUploadDecision;
  icon?: ReactNode;
  label: string;
  meta: string;
};

type ResourceUploadDecisionPanelProps = HTMLAttributes<HTMLElement> & {
  currentDecision?: ResourceUploadDecision;
  fileKindLabel?: string;
  fileName?: string;
  fileSizeLabel?: string;
  onConfirmDecision?: (decision: ResourceUploadDecision) => void;
  onSelectDecision?: (decision: ResourceUploadDecision) => void;
  options?: ResourceDecisionOption[];
  quotaLabel?: string;
  quotaPercent?: number;
  roomLabel?: string;
};

const defaultOptions: ResourceDecisionOption[] = [
  {
    description: "내 자료보드에 저장합니다. 직접 공유하기 전까지 프로젝트룸에는 보이지 않습니다.",
    icon: <HardDrive size={18} />,
    id: "PERSONAL_LIBRARY",
    label: "개인 자료보드 저장",
    meta: "개인 자료로 보관",
  },
  {
    description: "선택한 프로젝트룸 멤버가 함께 보는 자료로 등록합니다. 프로젝트룸과 멤버 권한을 확인합니다.",
    icon: <FolderInput size={18} />,
    id: "ROOM_RESOURCE",
    label: "프로젝트룸 자료로 등록",
    meta: "프로젝트룸 자료로 보관",
  },
  {
    description: "원본을 자료보드에 등록하지 않고 요약과 확인할 항목만 이번 대화에서 봅니다.",
    icon: <MessageSquareText size={18} />,
    id: "TEMP_ANALYSIS",
    label: "이번 대화에서만 분석",
    meta: "저장 없이 분석",
  },
];

export function ResourceUploadDecisionPanel({
  className,
  currentDecision = "PERSONAL_LIBRARY",
  fileKindLabel = "PDF",
  fileName = "업무기준서_v2.pdf",
  fileSizeLabel = "2.4MB",
  onConfirmDecision,
  onSelectDecision,
  options = defaultOptions,
  quotaLabel = "개인 자료함 820MB / 1GB",
  quotaPercent = 82,
  roomLabel = "토모에 번역 프로젝트룸",
  ...props
}: ResourceUploadDecisionPanelProps) {
  const selectedOption = options.find((option) => option.id === currentDecision) ?? options[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <UploadCloud size={22} />
          </span>
          <div>
            <StatusBadge tone="pending">업로드 판단</StatusBadge>
            <h2>자료를 어디에 둘까요?</h2>
            <p>파일을 올리면 바로 저장하지 않고, 사용자가 고른 범위 안에서만 자료와 에이전트 분석을 시작합니다.</p>
          </div>
        </div>
        <Button icon={<CheckCircle2 size={15} />} onClick={() => onConfirmDecision?.(currentDecision)} size="sm" variant="primary">
          선택 적용
        </Button>
      </header>

      <div className={styles.fileCard}>
        <div className={styles.fileIcon} aria-hidden="true">
          <FileText size={20} />
        </div>
        <div className={styles.fileBody}>
          <strong>{fileName}</strong>
          <div className={styles.fileMeta}>
            <Chip>{fileKindLabel}</Chip>
            <Chip>{fileSizeLabel}</Chip>
            <Chip>{roomLabel}</Chip>
          </div>
        </div>
      </div>

      <div className={styles.optionGrid} role="list">
        {options.map((option) => {
          const selected = option.id === currentDecision;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.optionCard, selected && styles.optionCardSelected)}
              disabled={option.disabled}
              key={option.id}
              onClick={() => onSelectDecision?.(option.id)}
              type="button"
            >
              <span className={styles.optionIcon} aria-hidden="true">
                {option.icon}
              </span>
              <span className={styles.optionText}>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
                <em>{option.meta}</em>
              </span>
              {selected ? <CheckCircle2 aria-hidden="true" className={styles.checkIcon} size={18} /> : null}
            </button>
          );
        })}
      </div>

      <div className={styles.policyGrid}>
        <PolicyItem
          icon={<LockKeyhole size={17} />}
          label="권한 기준"
          value={
            currentDecision === "ROOM_RESOURCE"
              ? "프로젝트룸 멤버 권한을 확인한 뒤 함께 보는 자료로 등록합니다."
              : "개인 자료는 직접 공유하기 전까지 본인만 봅니다."
          }
        />
        <PolicyItem
          icon={<Sparkles size={17} />}
          label="에이전트 범위"
          value={
            currentDecision === "TEMP_ANALYSIS"
              ? "원본 저장 없이 이번 대화 안에서 요약과 확인 항목만 봅니다."
              : "저장된 자료의 범위와 접근 권한 안에서만 분석합니다."
          }
        />
        <PolicyItem icon={<Database size={17} />} label="저장 위치" value={selectedOption.meta} />
      </div>

      <footer className={styles.footer}>
        <div className={styles.quota}>
          <div>
            <strong>{quotaLabel}</strong>
            <span>용량을 넘으면 서버 업로드는 막고 기기 안 색인은 유지합니다.</span>
          </div>
          <span>{quotaPercent}%</span>
        </div>
        <ProgressBar label="개인 자료함 사용량" value={quotaPercent} />
        <p>
          개인 관리 폴더의 파일은 사용자가 선택한 범위 안에서만 서버에 반영됩니다. 프로젝트룸 자료가 되려면 사용자가
          직접 등록하거나 공유해야 합니다.
        </p>
      </footer>
    </GlassPanel>
  );
}

function PolicyItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.policyItem}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </div>
  );
}
