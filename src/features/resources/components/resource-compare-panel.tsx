"use client";

import { AlertCircle, CheckCircle2, FileSearch, FileText, ListChecks, Scale, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";

type CompareField = {
  field: string;
  contractValue: string;
  estimateValue: string;
  requirementValue: string;
  status: "match" | "different" | "missing";
};

const compareFields: CompareField[] = [
  {
    contractValue: "8,000,000원",
    estimateValue: "8,800,000원",
    field: "금액 참고값",
    requirementValue: "금액 없음",
    status: "different",
  },
  {
    contractValue: "2회",
    estimateValue: "2회",
    field: "수정 횟수",
    requirementValue: "최종 검수 1회",
    status: "different",
  },
  {
    contractValue: "상세페이지 120건",
    estimateValue: "120건",
    field: "납품물",
    requirementValue: "상세페이지 120건",
    status: "match",
  },
  {
    contractValue: "조건 없음",
    estimateValue: "조건 없음",
    field: "저작권 조건",
    requirementValue: "클라이언트 귀속 요청",
    status: "missing",
  },
];

const statusMeta: Record<CompareField["status"], { labelKey: MessageKey; tone: "success" | "warning" | "pending" }> = {
  different: { labelKey: "resources.compare.status.different", tone: "warning" },
  match: { labelKey: "resources.compare.status.match", tone: "success" },
  missing: { labelKey: "resources.compare.status.missing", tone: "pending" },
};

function CompareRow({ item, t }: { item: CompareField; t: (key: MessageKey) => string }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-compare-row">
      <div className="resource-compare-row__head">
        <div>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <h3>{item.field}</h3>
        </div>
        <Button size="sm" variant="quiet">
          {t("resources.compare.rowQuestion")}
        </Button>
      </div>
      <div className="resource-compare-row__values">
        <span>
          <strong>{t("resources.compare.docContract")}</strong>
          {item.contractValue}
        </span>
        <span>
          <strong>{t("resources.compare.docEstimate")}</strong>
          {item.estimateValue}
        </span>
        <span>
          <strong>{t("resources.compare.docRequirement")}</strong>
          {item.requirementValue}
        </span>
      </div>
    </article>
  );
}

export function ResourceComparePanel() {
  const { t } = useI18n();

  return (
    <section className="resource-compare" aria-label={t("resources.compare.aria")}>
      <GlassPanel className="resource-compare__hero">
        <div className="resource-compare__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FileSearch size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("resources.compare.chip")}</Chip>
            <h2>{t("resources.compare.heroTitle")}</h2>
            <p>{t("resources.compare.heroDesc")}</p>
          </div>
        </div>
        <div className="resource-compare__score">
          <StatusBadge tone="warning">{t("resources.compare.scoreBadge")}</StatusBadge>
          <strong>{t("resources.compare.scoreCount")}</strong>
          <span>{t("resources.compare.scoreCaption")}</span>
          <ProgressBar label={t("resources.compare.scoreProgress")} value={88} />
        </div>
      </GlassPanel>

      <div className="resource-compare__grid">
        <GlassPanel className="resource-compare__panel">
          <div className="resource-compare__panel-header">
            <div>
              <h3>{t("resources.compare.resultTitle")}</h3>
              <p>{t("resources.compare.resultDesc")}</p>
            </div>
            <Chip icon={<ListChecks size={14} />}>{t("resources.compare.resultChip")}</Chip>
          </div>

          <div className="resource-compare__list">
            {compareFields.map((item) => (
              <CompareRow item={item} key={item.field} t={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-compare__policy">
          <h3>{t("resources.compare.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <FileText size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.compare.policyClassify")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <AlertCircle size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.compare.policyDiff")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Scale size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.compare.policyLegal")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("resources.compare.policyApproval")}</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-compare__next">
        <span className="bubli-icon-tile" aria-hidden="true">
          <CheckCircle2 size={16} strokeWidth={2.1} />
        </span>
        <p>{t("resources.compare.nextNote")}</p>
      </GlassPanel>
    </section>
  );
}
