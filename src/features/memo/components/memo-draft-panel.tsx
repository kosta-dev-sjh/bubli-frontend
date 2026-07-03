"use client";

import { CheckCircle2, Clock3, FileText, HardDrive, PencilLine, Pin, RefreshCw, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type MemoItem = {
  title: string;
  projectRoom: string;
  updatedAt: string;
  status: "draft" | "synced" | "pinned";
};

function buildMemos(t: TranslateFn): MemoItem[] {
  return [
    {
      projectRoom: t("memo.draft.sample.item1.room"),
      status: "draft",
      title: t("memo.draft.sample.item1.title"),
      updatedAt: t("memo.draft.sample.item1.updated"),
    },
    {
      projectRoom: t("memo.draft.sample.item2.room"),
      status: "pinned",
      title: t("memo.draft.sample.item2.title"),
      updatedAt: t("memo.draft.sample.item2.updated"),
    },
    {
      projectRoom: t("memo.draft.sample.item3.room"),
      status: "synced",
      title: t("memo.draft.sample.item3.title"),
      updatedAt: t("memo.draft.sample.item3.updated"),
    },
  ];
}

const statusMeta: Record<MemoItem["status"], { labelKey: MessageKey; tone: "memo" | "success" | "pending" }> = {
  draft: { labelKey: "memo.status.draft", tone: "pending" },
  pinned: { labelKey: "memo.status.pinned", tone: "memo" },
  synced: { labelKey: "memo.status.saved", tone: "success" },
};

function MemoRow({ memo }: { memo: MemoItem }) {
  const { t } = useI18n();
  const status = statusMeta[memo.status];

  return (
    <article className="memo-draft-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="memo-draft-row__meta">
          <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          <span>{memo.projectRoom}</span>
        </div>
        <h3>{memo.title}</h3>
        <p>{memo.updatedAt}</p>
      </div>
      <Button size="sm" variant="quiet">
        {t("common.open")}
      </Button>
    </article>
  );
}

export function MemoDraftPanel() {
  const { t } = useI18n();
  const memos = buildMemos(t);

  return (
    <section className="memo-draft" aria-label={t("memo.draft.sectionAria")}>
      <GlassPanel className="memo-draft__hero">
        <div>
          <Chip icon={<PencilLine size={14} />} selected>
            {t("memo.draft.chip")}
          </Chip>
          <h2>{t("memo.draft.heroTitle")}</h2>
          <p>{t("memo.draft.heroDesc")}</p>
        </div>
        <div className="memo-draft__meter">
          <StatusBadge tone="memo">{t("memo.draft.quickRecord")}</StatusBadge>
          <strong>3</strong>
          <span>{t("memo.draft.todayCount")}</span>
          <ProgressBar label={t("memo.draft.todayRate")} value={74} />
        </div>
      </GlassPanel>

      <div className="memo-draft__grid">
        <GlassPanel className="memo-draft__composer">
          <div className="memo-draft__composer-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("memo.draft.localDraft")}</h3>
            <p>{t("memo.draft.localDraftDesc")}</p>
            </div>
          </div>

          <div className="memo-draft__note">
            <span>{t("memo.draft.sampleRoom")}</span>
            <h3>{t("memo.draft.sampleTitle")}</h3>
            <p>{t("memo.draft.sampleBody")}</p>
          </div>

          <div className="memo-draft__actions">
            <Button icon={<Save size={15} />} variant="primary">
              {t("memo.draft.saveToServer")}
            </Button>
            <Button icon={<Pin size={15} />} variant="quiet">
              {t("memo.draft.pinToQuick")}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="memo-draft__list">
          <div className="memo-draft__list-top">
            <div>
              <h3>{t("memo.draft.recent")}</h3>
              <p>{t("memo.draft.recentDesc")}</p>
            </div>
            <Chip>{t("memo.draft.savedOrDraft")}</Chip>
          </div>
          <div className="memo-draft__items">
            {memos.map((memo) => (
              <MemoRow key={`${memo.projectRoom}-${memo.title}`} memo={memo} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="memo-draft__policy">
        <GlassPanel>
          <HardDrive size={18} strokeWidth={2.1} />
          <h3>{t("memo.draft.policy.draftTitle")}</h3>
          <p>{t("memo.draft.policy.draftDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <CheckCircle2 size={18} strokeWidth={2.1} />
          <h3>{t("memo.draft.policy.confirmedTitle")}</h3>
          <p>{t("memo.draft.policy.confirmedDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <RefreshCw size={18} strokeWidth={2.1} />
          <h3>{t("memo.draft.policy.syncTitle")}</h3>
          <p>{t("memo.draft.policy.syncDesc")}</p>
        </GlassPanel>
        <GlassPanel>
          <Clock3 size={18} strokeWidth={2.1} />
          <h3>{t("memo.draft.policy.dailyTitle")}</h3>
          <p>{t("memo.draft.policy.dailyDesc")}</p>
        </GlassPanel>
      </div>
    </section>
  );
}
