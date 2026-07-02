"use client";

import { CheckCircle2, FileText, FolderOpen, HardDrive, ListFilter, LockKeyhole, Pin, Save, Search } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./memo-list-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type MemoScope = "PERSONAL" | "PROJECT_ROOM";
export type MemoStatus = "LOCAL_DRAFT" | "SAVED" | "PINNED";

export type MemoListItem = {
  body: string;
  id: string;
  projectRoomLabel?: string;
  scope: MemoScope;
  status: MemoStatus;
  title: string;
  updatedLabel: string;
};

export type MemoListPanelProps = HTMLAttributes<HTMLElement> & {
  memos?: MemoListItem[];
  onOpenMemo?: (memoId: string) => void;
  onSaveDraft?: (memoId: string) => void;
  selectedMemoId?: string;
};

const statusMeta: Record<MemoStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  LOCAL_DRAFT: { labelKey: "memo.status.draft", tone: "pending" },
  PINNED: { labelKey: "memo.status.pinned", tone: "memo" },
  SAVED: { labelKey: "memo.status.saved", tone: "success" },
};

const scopeMeta: Record<MemoScope, { labelKey: MessageKey; tone: StatusTone }> = {
  PERSONAL: { labelKey: "memo.scope.personal", tone: "personal" },
  PROJECT_ROOM: { labelKey: "memo.scope.projectRoom", tone: "room" },
};

export function buildDefaultMemoList(t: TranslateFn): MemoListItem[] {
  return [
    {
      body: t("memo.list.sample.contract.body"),
      id: "memo-contract-scope",
      projectRoomLabel: t("memo.list.sample.contract.room"),
      scope: "PROJECT_ROOM",
      status: "LOCAL_DRAFT",
      title: t("memo.list.sample.contract.title"),
      updatedLabel: t("memo.list.sample.contract.updated"),
    },
    {
      body: t("memo.list.sample.presentation.body"),
      id: "memo-presentation-flow",
      projectRoomLabel: t("memo.list.sample.presentation.room"),
      scope: "PROJECT_ROOM",
      status: "PINNED",
      title: t("memo.list.sample.presentation.title"),
      updatedLabel: t("memo.list.sample.presentation.updated"),
    },
    {
      body: t("memo.list.sample.question.body"),
      id: "memo-personal-question",
      scope: "PERSONAL",
      status: "SAVED",
      title: t("memo.list.sample.question.title"),
      updatedLabel: t("memo.list.sample.question.updated"),
    },
  ];
}

export function MemoListPanel({
  className,
  memos,
  onOpenMemo,
  onSaveDraft,
  selectedMemoId,
  ...props
}: MemoListPanelProps) {
  const { t } = useI18n();
  const memoList = memos ?? buildDefaultMemoList(t);
  const activeSelectedMemoId = selectedMemoId ?? memoList[0]?.id;
  const selectedMemo = memoList.find((memo) => memo.id === activeSelectedMemoId) ?? memoList[0];
  const localDraftCount = memoList.filter((memo) => memo.status === "LOCAL_DRAFT").length;
  const projectRoomMemoCount = memoList.filter((memo) => memo.scope === "PROJECT_ROOM").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileText size={15} strokeWidth={2.1} />}>{t("memo.list.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{t("memo.list.title")}</h2>
            <p className={styles.description}>{t("memo.list.description")}</p>
          </div>
        </div>
        <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("memo.list.find")}
        </Button>
      </header>

      <section className={styles.summaryGrid} aria-label={t("memo.list.summaryAria")}>
        <article>
          <HardDrive size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("memo.list.localDraft")}</span>
          <strong>{t("memo.list.count", { count: localDraftCount })}</strong>
          <p>{t("memo.list.localDraftDesc")}</p>
        </article>
        <article>
          <FolderOpen size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("memo.list.projectRoomMemo")}</span>
          <strong>{t("memo.list.count", { count: projectRoomMemoCount })}</strong>
          <p>{t("memo.list.projectRoomMemoDesc")}</p>
        </article>
        <article>
          <LockKeyhole size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("memo.list.personalMemo")}</span>
          <strong>{t("memo.list.count", { count: memoList.length - projectRoomMemoCount })}</strong>
          <p>{t("memo.list.personalMemoDesc")}</p>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.listPanel} aria-label={t("memo.list.listAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("memo.list.recent")}</strong>
            <StatusBadge tone="memo">{t("memo.list.count", { count: memoList.length })}</StatusBadge>
          </div>
          <div className={styles.memoStack}>
            {memoList.map((memo) => {
              const status = statusMeta[memo.status];
              const scope = scopeMeta[memo.scope];
              const selected = memo.id === selectedMemo?.id;

              return (
                <button
                  className={cn(styles.memoRow, selected && styles.memoRowSelected)}
                  key={memo.id}
                  onClick={() => onOpenMemo?.(memo.id)}
                  type="button"
                >
                  <span className={styles.memoIcon} aria-hidden="true">
                    {memo.status === "PINNED" ? <Pin size={16} strokeWidth={2.1} /> : <FileText size={16} strokeWidth={2.1} />}
                  </span>
                  <span className={styles.memoCopy}>
                    <b>{memo.title}</b>
                    <small>{memo.projectRoomLabel ?? t("memo.list.personalWork")} · {memo.updatedLabel}</small>
                  </span>
                  <span className={styles.memoBadges}>
                    <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                    <StatusBadge tone={scope.tone}>{t(scope.labelKey)}</StatusBadge>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className={styles.detailPanel} aria-label={t("memo.list.detailAria")}>
          {selectedMemo ? (
            <>
              <div className={styles.sectionTitle}>
                <strong>{selectedMemo.title}</strong>
                <StatusBadge tone={statusMeta[selectedMemo.status].tone}>{t(statusMeta[selectedMemo.status].labelKey)}</StatusBadge>
              </div>
              <p className={styles.memoBody}>{selectedMemo.body}</p>
              <div className={styles.detailMeta}>
                <span>{selectedMemo.projectRoomLabel ?? t("memo.list.personalWork")}</span>
                <span>{selectedMemo.updatedLabel}</span>
                <span>{t(scopeMeta[selectedMemo.scope].labelKey)}</span>
              </div>
              <div className={styles.detailActions}>
                <Button icon={<Save size={15} strokeWidth={2.1} />} onClick={() => onSaveDraft?.(selectedMemo.id)} variant="primary">
                  {t("common.save")}
                </Button>
                <Button icon={<Pin size={15} strokeWidth={2.1} />} variant="quiet">
                  {t("memo.status.pinned")}
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <ListFilter size={22} strokeWidth={2.1} aria-hidden="true" />
              <strong>{t("memo.list.empty")}</strong>
              <p>{t("memo.list.emptyDesc")}</p>
            </div>
          )}
        </aside>
      </div>

      <section className={styles.policyStrip} aria-label={t("memo.list.policyAria")}>
        <span>
          <HardDrive size={15} strokeWidth={2.1} aria-hidden="true" />
          {t("memo.list.policyDraft")}
        </span>
        <span>
          <CheckCircle2 size={15} strokeWidth={2.1} aria-hidden="true" />
          {t("memo.list.policySaved")}
        </span>
        <span>{t("memo.list.policyPersonal")}</span>
      </section>
    </GlassPanel>
  );
}
