"use client";

import { AlertCircle, CheckCircle2, FileSearch, FileText, ListChecks, Scale, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type CompareField = {
  fieldKey: MessageKey;
  contractValueKey: MessageKey;
  estimateValueKey: MessageKey;
  requirementValueKey: MessageKey;
  status: "match" | "different" | "missing";
};

const compareFields: CompareField[] = [
  {
    contractValueKey: "resources.compare.valueAmountContract",
    estimateValueKey: "resources.compare.valueAmountEstimate",
    fieldKey: "resources.compare.fieldAmount",
    requirementValueKey: "resources.compare.valueAmountNone",
    status: "different",
  },
  {
    contractValueKey: "resources.compare.valueRevision2",
    estimateValueKey: "resources.compare.valueRevision2",
    fieldKey: "resources.compare.fieldRevision",
    requirementValueKey: "resources.compare.valueRevisionFinal",
    status: "different",
  },
  {
    contractValueKey: "resources.compare.valueDeliverableDetail",
    estimateValueKey: "resources.compare.valueDeliverable120",
    fieldKey: "resources.compare.fieldDeliverable",
    requirementValueKey: "resources.compare.valueDeliverableDetail",
    status: "match",
  },
  {
    contractValueKey: "resources.compare.valueNoCondition",
    estimateValueKey: "resources.compare.valueNoCondition",
    fieldKey: "resources.compare.fieldCopyright",
    requirementValueKey: "resources.compare.valueCopyrightClient",
    status: "missing",
  },
];

const statusMeta: Record<CompareField["status"], { labelKey: MessageKey; tone: "success" | "warning" | "pending" }> = {
  different: { labelKey: "resources.compare.status.different", tone: "warning" },
  match: { labelKey: "resources.compare.status.match", tone: "success" },
  missing: { labelKey: "resources.compare.status.missing", tone: "pending" },
};

function CompareRow({ item }: { item: CompareField }) {
  const { t } = useI18n();
  const status = statusMeta[item.status];

  return (
    <article className="resource-compare-row">
      <div className="resource-compare-row__head">
        <div>
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <h3>{t(item.fieldKey)}</h3>
        </div>
        <Button size="sm" variant="quiet">
          {t("resources.compare.rowQuestion")}
        </Button>
      </div>
      <div className="resource-compare-row__values">
        <span>
          <strong>{t("resources.compare.docContract")}</strong>
          {t(item.contractValueKey)}
        </span>
        <span>
          <strong>{t("resources.compare.docEstimate")}</strong>
          {t(item.estimateValueKey)}
        </span>
        <span>
          <strong>{t("resources.compare.docRequirement")}</strong>
          {t(item.requirementValueKey)}
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
              <CompareRow item={item} key={item.fieldKey} />
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
