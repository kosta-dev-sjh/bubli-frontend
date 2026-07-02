"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileDiff,
  FileText,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./document-mismatch-review-panel.module.css";

type MismatchSeverity = "HIGH" | "MEDIUM" | "LOW";
type MismatchStatus = "NEEDS_REVIEW" | "QUESTION_READY" | "RESOLVED";

type ComparedValue = {
  documentLabel: string;
  value: string;
};

type MismatchItem = {
  actionLabel: string;
  comparedValues: ComparedValue[];
  fieldLabel: string;
  id: string;
  reason: string;
  severity: MismatchSeverity;
  status: MismatchStatus;
};

type ReviewMetric = {
  label: string;
  tone: StatusTone;
  value: string;
};

export type DocumentMismatchReviewPanelProps = HTMLAttributes<HTMLElement> & {
  items: MismatchItem[];
  metrics: ReviewMetric[];
  title?: string;
};

const severityMeta: Record<MismatchSeverity, { labelKey: MessageKey; tone: StatusTone }> = {
  HIGH: { labelKey: "resources.mismatch.severity.HIGH", tone: "warning" },
  LOW: { labelKey: "resources.mismatch.severity.LOW", tone: "personal" },
  MEDIUM: { labelKey: "resources.mismatch.severity.MEDIUM", tone: "pending" },
};

const statusMeta: Record<MismatchStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  NEEDS_REVIEW: { labelKey: "resources.mismatch.status.NEEDS_REVIEW", tone: "warning" },
  QUESTION_READY: { labelKey: "resources.mismatch.status.QUESTION_READY", tone: "agent" },
  RESOLVED: { labelKey: "resources.mismatch.status.RESOLVED", tone: "approved" },
};

export const defaultMismatchMetrics: ReviewMetric[] = [
  { label: "비교 문서", tone: "room", value: "3개" },
  { label: "확인 필요", tone: "warning", value: "4개" },
  { label: "질문 초안", tone: "agent", value: "2개" },
];

export const defaultMismatchItems: MismatchItem[] = [
  {
    actionLabel: "납품일 기준 질문 만들기",
    comparedValues: [
      { documentLabel: "업무 문서", value: "7월 15일" },
      { documentLabel: "회의록", value: "2026.07.20" },
    ],
    fieldLabel: "납품일",
    id: "delivery-date",
    reason: "문서마다 날짜가 달라 WBS와 일정에 바로 반영하기 어렵습니다.",
    severity: "HIGH",
    status: "QUESTION_READY",
  },
  {
    actionLabel: "부가세 포함 여부 확인",
    comparedValues: [
      { documentLabel: "견적서", value: "8,000,000원" },
      { documentLabel: "업무 문서", value: "금액만 기재" },
    ],
    fieldLabel: "금액 참고값",
    id: "amount-vat",
    reason: "부가세 포함 여부가 분명하지 않아 참고값으로만 보관합니다.",
    severity: "MEDIUM",
    status: "NEEDS_REVIEW",
  },
  {
    actionLabel: "검수 기준 질문 만들기",
    comparedValues: [
      { documentLabel: "요구사항 문서", value: "1차 검수" },
      { documentLabel: "업무 문서", value: "최종 검수 1회" },
    ],
    fieldLabel: "검수 기준",
    id: "inspection-rule",
    reason: "검수 단계가 서로 달라 TODO 완료 기준을 정하기 어렵습니다.",
    severity: "HIGH",
    status: "QUESTION_READY",
  },
  {
    actionLabel: "자료 취급 기준 확인",
    comparedValues: [
      { documentLabel: "업무 문서", value: "비밀 유지 조항 있음" },
      { documentLabel: "요구사항 문서", value: "샘플 원문 공유 필요" },
    ],
    fieldLabel: "개인정보/저작권 조건",
    id: "privacy-copyright",
    reason: "자료 공유 방식과 보관 기준을 프로젝트룸 자료 정책과 맞춰야 합니다.",
    severity: "MEDIUM",
    status: "NEEDS_REVIEW",
  },
];

export function DocumentMismatchReviewPanel({
  className,
  items,
  metrics,
  title,
  ...props
}: DocumentMismatchReviewPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.mismatch.defaultTitle");
  const questionReadyCount = items.filter((item) => item.status === "QUESTION_READY").length;
  const needsReviewCount = items.filter((item) => item.status === "NEEDS_REVIEW").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileDiff size={16} strokeWidth={2.1} />}>{t("resources.mismatch.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.mismatch.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.mismatch.summaryLabel")}</span>
          <strong>{t("resources.mismatch.summaryCountUnit", { count: needsReviewCount + questionReadyCount })}</strong>
          <StatusBadge tone="warning">{t("resources.mismatch.summaryBadge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label={t("resources.mismatch.metricGridAria")}>
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <StatusBadge tone={metric.tone}>{t("resources.mismatch.metricStatus")}</StatusBadge>
          </article>
        ))}
      </section>

      <section className={styles.reviewList} aria-label={t("resources.mismatch.reviewListAria")}>
        {items.map((item) => {
          const severity = severityMeta[item.severity];
          const status = statusMeta[item.status];

          return (
            <article className={cn(styles.reviewItem, item.severity === "HIGH" && styles.highSeverity)} key={item.id}>
              <div className={styles.itemHeader}>
                <span className={styles.iconTile}>
                  {item.status === "RESOLVED" ? (
                    <CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />
                  ) : (
                    <AlertCircle size={17} strokeWidth={2.1} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.itemTitle}>
                  <strong>{item.fieldLabel}</strong>
                  <p>{item.reason}</p>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={severity.tone}>{t(severity.labelKey)}</StatusBadge>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                </div>
              </div>

              <div className={styles.valueGrid}>
                {item.comparedValues.map((value) => (
                  <div className={styles.valueCard} key={`${item.id}-${value.documentLabel}`}>
                    <span>
                      <FileText size={14} strokeWidth={2.1} aria-hidden="true" />
                      {value.documentLabel}
                    </span>
                    <b>{value.value}</b>
                  </div>
                ))}
              </div>

              <footer className={styles.itemFooter}>
                <span>
                  <ListChecks size={15} strokeWidth={2.1} aria-hidden="true" />
                  {item.actionLabel}
                </span>
                <Button icon={<ArrowRight size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                  {t("resources.mismatch.reviewAction")}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("resources.mismatch.footerNotice")}</span>
        </div>
        <Button icon={<MessageSquareText size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("resources.mismatch.footerAction")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
