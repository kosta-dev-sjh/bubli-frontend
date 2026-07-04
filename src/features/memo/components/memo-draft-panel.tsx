"use client";

import { CheckCircle2, Clock3, FileText, HardDrive, PencilLine, Pin, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { memoApi } from "@/features/memo/api/memoApi";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { MemoResponse } from "@/types/api/memo";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type MemoDraftItem = {
  id: string;
  title: string;
  projectRoom: string;
  updatedAt: string;
  status: "draft" | "synced" | "pinned";
};

export type MemoDraftPanelProps = {
  autoLoad?: boolean;
  initialDraftBody?: string;
  initialMemos?: MemoDraftItem[];
  pageSize?: number;
  roomId?: string | null;
  roomLabel?: string | null;
};

function buildMemos(t: TranslateFn): MemoDraftItem[] {
  return [
    {
      id: "memo-draft-sample-1",
      projectRoom: t("memo.draft.sample.item1.room"),
      status: "draft",
      title: t("memo.draft.sample.item1.title"),
      updatedAt: t("memo.draft.sample.item1.updated"),
    },
    {
      id: "memo-draft-sample-2",
      projectRoom: t("memo.draft.sample.item2.room"),
      status: "pinned",
      title: t("memo.draft.sample.item2.title"),
      updatedAt: t("memo.draft.sample.item2.updated"),
    },
    {
      id: "memo-draft-sample-3",
      projectRoom: t("memo.draft.sample.item3.room"),
      status: "synced",
      title: t("memo.draft.sample.item3.title"),
      updatedAt: t("memo.draft.sample.item3.updated"),
    },
  ];
}

const statusMeta: Record<MemoDraftItem["status"], { labelKey: MessageKey; tone: "memo" | "success" | "pending" }> = {
  draft: { labelKey: "memo.status.draft", tone: "pending" },
  pinned: { labelKey: "memo.status.pinned", tone: "memo" },
  synced: { labelKey: "memo.status.saved", tone: "success" },
};

function formatMemoUpdatedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function memoTitleFromBody(t: TranslateFn, body: string) {
  const firstLine = body
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return t("widget.memo.empty");
  return firstLine.length > 34 ? `${firstLine.slice(0, 34)}...` : firstLine;
}

function toMemoDraftItem(t: TranslateFn, memo: MemoResponse, roomLabel?: string | null): MemoDraftItem {
  return {
    id: memo.id,
    projectRoom: memo.roomId ? (roomLabel ?? t("memo.scope.projectRoom")) : t("memo.list.personalWork"),
    status: "synced",
    title: memoTitleFromBody(t, memo.body),
    updatedAt: formatMemoUpdatedLabel(memo.updatedAt),
  };
}

function MemoRow({ memo }: { memo: MemoDraftItem }) {
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

export function MemoDraftPanel({
  autoLoad = true,
  initialDraftBody,
  initialMemos,
  pageSize = 5,
  roomId = null,
  roomLabel = null,
}: MemoDraftPanelProps) {
  const { t } = useI18n();
  const [draftBody, setDraftBody] = useState(initialDraftBody ?? t("memo.draft.sampleBody"));
  const [memos, setMemos] = useState<MemoDraftItem[]>(() => initialMemos ?? (autoLoad ? [] : buildMemos(t)));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!autoLoad || initialMemos) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setNotice(null);
      const request = roomId ? memoApi.listRoom(roomId, { size: pageSize }) : memoApi.listPersonal({ size: pageSize });

      void request
        .then((page) => {
          if (cancelled) return;
          setMemos(page.items.filter((memo) => memo.status === "ACTIVE").map((memo) => toMemoDraftItem(t, memo, roomLabel)));
        })
        .catch(() => {
          if (cancelled) return;
          setMemos([]);
          setNotice(t("memo.draft.policy.syncDesc"));
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [autoLoad, initialMemos, pageSize, roomId, roomLabel, t]);

  const saveDraftToServer = async () => {
    const body = draftBody.trim();
    if (!body) return;

    setSaving(true);
    setNotice(null);

    try {
      const created = roomId ? await memoApi.createRoom(roomId, { body }) : await memoApi.createPersonal({ body });
      setMemos((current) => [toMemoDraftItem(t, created, roomLabel), ...current.filter((memo) => memo.id !== created.id)].slice(0, pageSize));
      setDraftBody("");
      setNotice(t("memo.draft.policy.confirmedDesc"));
    } catch {
      setNotice(t("memo.draft.policy.syncDesc"));
    } finally {
      setSaving(false);
    }
  };

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
          <StatusBadge tone={loading ? "pending" : "memo"}>{t("memo.draft.quickRecord")}</StatusBadge>
          <strong>{memos.length}</strong>
          <span>{t("memo.draft.todayCount")}</span>
          <ProgressBar label={t("memo.draft.todayRate")} value={Math.min(100, memos.length * 20)} />
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
            <span>{roomId ? (roomLabel ?? t("memo.scope.projectRoom")) : t("memo.list.personalWork")}</span>
            <h3>{memoTitleFromBody(t, draftBody)}</h3>
            <textarea
              className="memo-draft__textarea"
              disabled={saving}
              maxLength={1000}
              onChange={(event) => setDraftBody(event.target.value)}
              value={draftBody}
            />
          </div>
          {notice ? <p className="memo-draft__notice">{notice}</p> : null}

          <div className="memo-draft__actions">
            <Button disabled={!draftBody.trim() || saving} icon={<Save size={15} />} loading={saving} onClick={() => void saveDraftToServer()} variant="primary">
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
            {memos.length > 0 ? memos.map((memo) => <MemoRow key={memo.id} memo={memo} />) : <p className="memo-draft__notice">{t("widget.memo.noneSaved")}</p>}
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
