import {
  ArrowRight,
  BadgeHelp,
  ClipboardList,
  FileCheck2,
  FileText,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./document-classification-panel.module.css";

type DocumentKind = "contract" | "quote" | "requirements" | "meetingNote" | "reference";
type ClassificationStatus = "ready" | "analyzing" | "analyzed" | "failed" | "needsReview";

type ClassificationItem = {
  confidenceLabel: string;
  description: string;
  detectedKind: DocumentKind;
  fileName: string;
  nextUse: string;
  status: ClassificationStatus;
};

type ClassificationRule = {
  description: string;
  label: string;
  value: string;
};

export type DocumentClassificationPanelProps = HTMLAttributes<HTMLElement> & {
  items: ClassificationItem[];
  rules: ClassificationRule[];
  title?: string;
};

const kindMeta: Record<DocumentKind, { icon: ReactNode; label: string; tone: StatusTone }> = {
  contract: {
    icon: <FileCheck2 size={18} strokeWidth={2.1} />,
    label: "계약서",
    tone: "success",
  },
  quote: {
    icon: <FileText size={18} strokeWidth={2.1} />,
    label: "견적서",
    tone: "pending",
  },
  requirements: {
    icon: <ClipboardList size={18} strokeWidth={2.1} />,
    label: "요구사항 문서",
    tone: "room",
  },
  meetingNote: {
    icon: <MessageSquareText size={18} strokeWidth={2.1} />,
    label: "회의록",
    tone: "room",
  },
  reference: {
    icon: <BadgeHelp size={18} strokeWidth={2.1} />,
    label: "참고자료",
    tone: "pending",
  },
};

const statusMeta: Record<ClassificationStatus, { label: string; tone: StatusTone }> = {
  ready: { label: "분류 대기", tone: "pending" },
  analyzing: { label: "분류 중", tone: "agent" },
  analyzed: { label: "분류 완료", tone: "success" },
  failed: { label: "분류 실패", tone: "warning" },
  needsReview: { label: "확인 필요", tone: "warning" },
};

const flowSteps = [
  "자료 업로드",
  "문서 종류 후보",
  "사용자 확인",
  "추출과 후보 생성",
] as const;

export function DocumentClassificationPanel({
  className,
  items,
  rules,
  title = "문서 종류 분류",
  ...props
}: DocumentClassificationPanelProps) {
  const reviewCount = items.filter((item) => item.status === "needsReview" || item.status === "failed").length;
  const analyzedCount = items.filter((item) => item.status === "analyzed").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<SearchCheck size={14} strokeWidth={2.1} />}>contract_documents.doc_type</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              업로드된 자료는 먼저 문서 종류 후보로 분류합니다. 사용자가 확인한 분류값만 추출 항목, 확인 필요 항목, WBS/TODO 후보 생성에 사용합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>확인할 분류</span>
          <strong>{reviewCount > 0 ? `${reviewCount}건` : "없음"}</strong>
          <small>{analyzedCount}건 분류 완료</small>
        </div>
      </header>

      <section className={styles.flow} aria-label="문서 분류 후속 흐름">
        {flowSteps.map((step, index) => (
          <article className={styles.flowStep} key={step}>
            <span>{step}</span>
            {index < flowSteps.length - 1 ? (
              <ArrowRight className={styles.flowArrow} size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : null}
          </article>
        ))}
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.itemList} aria-label="문서 종류 후보 목록">
          {items.map((item) => {
            const kind = kindMeta[item.detectedKind];
            const status = statusMeta[item.status];

            return (
              <article className={styles.itemCard} key={item.fileName}>
                <div className={styles.itemMain}>
                  <span className={styles.kindIcon} aria-hidden="true">
                    {kind.icon}
                  </span>
                  <div>
                    <div className={styles.itemTitleRow}>
                      <h3>{item.fileName}</h3>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>
                    <p>{item.description}</p>
                    <div className={styles.itemMeta}>
                      <StatusBadge tone={kind.tone}>{kind.label}</StatusBadge>
                      <span>{item.confidenceLabel}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.nextUse}>
                  <span>다음 사용처</span>
                  <strong>{item.nextUse}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={styles.rulePanel} aria-label="문서 분류 기준">
          <div className={styles.ruleHeader}>
            <span aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2.1} />
            </span>
            <div>
              <h3>분류 기준</h3>
              <p>값이 낮거나 문서가 섞여 보이면 바로 반영하지 않고 확인 필요로 둡니다.</p>
            </div>
          </div>
          <div className={styles.ruleList}>
            {rules.map((rule) => (
              <article className={styles.ruleCard} key={rule.label}>
                <span>{rule.label}</span>
                <strong>{rule.value}</strong>
                <p>{rule.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </GlassPanel>
  );
}
