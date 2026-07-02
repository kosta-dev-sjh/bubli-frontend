"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePause,
  FileText,
  HelpCircle,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type DocumentSource = {
  name: string;
  typeKey: MessageKey;
  status: "analyzed" | "waiting" | "needsReview";
};

type ExtractedValue = {
  labelKey: MessageKey;
  valueKey: MessageKey;
  sourceKey: MessageKey;
};

type ReviewItem = {
  labelKey: MessageKey;
  detailKey: MessageKey;
  sourceKey: MessageKey;
  type: "difference" | "missing" | "question";
};

const documents: DocumentSource[] = [
  { name: "업무기준문서_v2.pdf", status: "needsReview", typeKey: "agent.contract.docTypeWork" },
  { name: "견적서_final.pdf", status: "analyzed", typeKey: "agent.contract.docTypeEstimate" },
  { name: "요구사항_정리.md", status: "analyzed", typeKey: "agent.contract.docTypeRequirement" },
];

const extractedValues: ExtractedValue[] = [
  { labelKey: "agent.contract.valProjectLabel", sourceKey: "agent.contract.valProjectSource", valueKey: "agent.contract.valProjectValue" },
  { labelKey: "agent.contract.valDueLabel", sourceKey: "agent.contract.valDueSource", valueKey: "agent.contract.valDueValue" },
  { labelKey: "agent.contract.valAmountLabel", sourceKey: "agent.contract.valAmountSource", valueKey: "agent.contract.valAmountValue" },
  { labelKey: "agent.contract.valDeliverLabel", sourceKey: "agent.contract.valDeliverSource", valueKey: "agent.contract.valDeliverValue" },
];

const reviewItems: ReviewItem[] = [
  {
    detailKey: "agent.contract.review1Detail",
    labelKey: "agent.contract.review1Label",
    sourceKey: "agent.contract.review1Source",
    type: "difference",
  },
  {
    detailKey: "agent.contract.review2Detail",
    labelKey: "agent.contract.review2Label",
    sourceKey: "agent.contract.review2Source",
    type: "missing",
  },
  {
    detailKey: "agent.contract.review3Detail",
    labelKey: "agent.contract.review3Label",
    sourceKey: "agent.contract.review3Source",
    type: "question",
  },
];

const sourceStatusCopy: Record<DocumentSource["status"], { labelKey: MessageKey; tone: "approved" | "pending" | "warning" }> = {
  analyzed: { labelKey: "agent.contract.statusAnalyzed", tone: "approved" },
  needsReview: { labelKey: "agent.contract.statusNeedsReview", tone: "warning" },
  waiting: { labelKey: "agent.contract.statusWaiting", tone: "pending" },
};

const reviewTypeMeta: Record<ReviewItem["type"], { icon: typeof AlertTriangle; labelKey: MessageKey; tone: "warning" | "pending" | "agent" }> = {
  difference: { icon: AlertTriangle, labelKey: "agent.contract.typeDifference", tone: "warning" },
  missing: { icon: ShieldCheck, labelKey: "agent.contract.typeMissing", tone: "pending" },
  question: { icon: HelpCircle, labelKey: "agent.contract.typeQuestion", tone: "agent" },
};

function DocumentPill({ document, t }: { document: DocumentSource; t: TranslateFn }) {
  const status = sourceStatusCopy[document.status];

  return (
    <article className="contract-review-source">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <strong>{t(document.typeKey)}</strong>
        <span>{document.name}</span>
      </div>
      <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
    </article>
  );
}

function ReviewItemCard({ item, t }: { item: ReviewItem; t: TranslateFn }) {
  const meta = reviewTypeMeta[item.type];
  const Icon = meta.icon;

  return (
    <article className="contract-review-item">
      <div className="contract-review-item__top">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
          <h3>{t(item.labelKey)}</h3>
          <p>{t(item.sourceKey)}</p>
        </div>
      </div>
      <p>{t(item.detailKey)}</p>
      <footer>
        <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
          {t("agent.contract.confirm")}
        </Button>
        <Button icon={<PencilLine size={15} />} size="sm" variant="quiet">
          {t("agent.contract.edit")}
        </Button>
        <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
          {t("agent.contract.hold")}
        </Button>
      </footer>
    </article>
  );
}

export function ContractReviewPanel() {
  const { t } = useI18n();

  return (
    <section className="contract-review" aria-label={t("agent.contract.aria")}>
      <GlassPanel className="contract-review__hero">
        <div>
          <Chip icon={<Bot size={14} />} selected>
            {t("agent.contract.chip")}
          </Chip>
          <h2>{t("agent.contract.heroTitle")}</h2>
          <p>{t("agent.contract.heroDesc")}</p>
        </div>
        <div className="contract-review__job">
          <StatusBadge tone="agent">{t("agent.contract.jobBadge")}</StatusBadge>
          <strong>92%</strong>
          <span>{t("agent.contract.jobLabel")}</span>
          <ProgressBar label={t("agent.contract.progress")} value={92} />
        </div>
      </GlassPanel>

      <div className="contract-review__sources" aria-label={t("agent.contract.sourcesAria")}>
        {documents.map((document) => (
          <DocumentPill document={document} key={document.name} t={t} />
        ))}
      </div>

      <div className="contract-review__grid">
        <GlassPanel className="contract-review__values">
          <div className="contract-review__section-title">
            <h3>{t("agent.contract.extractTitle")}</h3>
            <p>{t("agent.contract.extractDesc")}</p>
          </div>
          <div className="contract-review__value-grid">
            {extractedValues.map((item) => (
              <article className="contract-review-value" key={item.labelKey}>
                <span>{t(item.labelKey)}</span>
                <strong>{t(item.valueKey)}</strong>
                <small>{t(item.sourceKey)}</small>
              </article>
            ))}
          </div>
          <div className="contract-review__flow">
            <span>{t("agent.contract.flowUpload")}</span>
            <ArrowRight size={16} strokeWidth={2.1} />
            <span>{t("agent.contract.flowCandidate")}</span>
            <ArrowRight size={16} strokeWidth={2.1} />
            <span>{t("agent.contract.flowUser")}</span>
            <ArrowRight size={16} strokeWidth={2.1} />
            <span>{t("agent.contract.flowApply")}</span>
          </div>
        </GlassPanel>

        <GlassPanel className="contract-review__items">
          <div className="contract-review__section-title">
            <h3>{t("agent.contract.reviewTitle")}</h3>
            <p>{t("agent.contract.reviewDesc")}</p>
          </div>
          {reviewItems.map((item) => (
            <ReviewItemCard item={item} key={item.labelKey} t={t} />
          ))}
        </GlassPanel>
      </div>
    </section>
  );
}
