"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { memoApi } from "@/features/memo/api/memoApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MemoResponse } from "@/types/api/memo";

import styles from "./memo-dashboard-card.module.css";

type MemoListState =
  | { kind: "loading" }
  | { kind: "ready"; memos: MemoResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

const MEMO_PAGE_SIZE = 10;
const MEMO_VISIBLE_COUNT = 4;

function formatMemoTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function MemoDashboardCard() {
  const { t } = useI18n();
  const [state, setState] = useState<MemoListState>({ kind: "loading" });
  const [composeBody, setComposeBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busyMemoId, setBusyMemoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resolveErrorNotice = useCallback(
    (error: unknown, fallbackNotice: string) => {
      if (error instanceof ApiClientError && error.status === 401) {
        return t("memo.card.loginRequired");
      }
      if (error instanceof Error && error.message !== "Failed to fetch") {
        return error.message;
      }
      return fallbackNotice;
    },
    [t],
  );

  const loadMemos = useCallback(async () => {
    try {
      const page = await memoApi.listPersonal({ size: MEMO_PAGE_SIZE });
      setState({ kind: "ready", memos: page.items });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setState({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("memo.card.loadFailed"),
      });
    }
  }, [t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMemos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMemos]);

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const body = composeBody.trim();
      if (!body) {
        setNotice(t("memo.card.needBody"));
        return;
      }

      setCreating(true);
      setNotice(null);

      try {
        const created = await memoApi.createPersonal({ body });
        setState((current) => (current.kind === "ready" ? { kind: "ready", memos: [created, ...current.memos] } : current));
        setComposeBody("");
        setNotice(t("memo.card.savedNotice"));
      } catch (error) {
        setNotice(resolveErrorNotice(error, t("memo.card.saveFailed")));
      } finally {
        setCreating(false);
      }
    },
    [composeBody, resolveErrorNotice, t],
  );

  const handleUpdate = useCallback(
    async (memoId: string) => {
      const body = editingBody.trim();
      if (!body) {
        setNotice(t("memo.card.needBody"));
        return;
      }

      setBusyMemoId(memoId);
      setNotice(null);

      try {
        const updated = await memoApi.update(memoId, { body });
        setState((current) =>
          current.kind === "ready" ? { kind: "ready", memos: current.memos.map((memo) => (memo.id === memoId ? updated : memo)) } : current,
        );
        setEditingMemoId(null);
        setEditingBody("");
        setNotice(t("memo.card.savedNotice"));
      } catch (error) {
        setNotice(resolveErrorNotice(error, t("memo.card.saveFailed")));
      } finally {
        setBusyMemoId(null);
      }
    },
    [editingBody, resolveErrorNotice, t],
  );

  const handleDelete = useCallback(
    async (memoId: string) => {
      if (confirmDeleteId !== memoId) {
        setConfirmDeleteId(memoId);
        return;
      }

      setBusyMemoId(memoId);
      setNotice(null);

      try {
        await memoApi.delete(memoId);
        setState((current) => (current.kind === "ready" ? { kind: "ready", memos: current.memos.filter((memo) => memo.id !== memoId) } : current));
        if (editingMemoId === memoId) {
          setEditingMemoId(null);
          setEditingBody("");
        }
        setNotice(t("memo.card.deletedNotice"));
      } catch (error) {
        setNotice(resolveErrorNotice(error, t("memo.card.deleteFailed")));
      } finally {
        setBusyMemoId(null);
        setConfirmDeleteId(null);
      }
    },
    [confirmDeleteId, editingMemoId, resolveErrorNotice, t],
  );

  if (state.kind === "loading") {
    return <p className={styles.emptyState}>{t("memo.card.loading")}</p>;
  }

  if (state.kind === "auth") {
    return <p className={styles.emptyState}>{t("memo.card.loginRequired")}</p>;
  }

  if (state.kind === "error") {
    return <p className={styles.emptyState}>{state.message}</p>;
  }

  const memos = state.memos.slice(0, MEMO_VISIBLE_COUNT);

  return (
    <div className={styles.card}>
      <form className={styles.composeForm} onSubmit={(event) => void handleCreate(event)}>
        <textarea
          aria-label={t("memo.card.composeAria")}
          disabled={creating}
          maxLength={2000}
          onChange={(event) => setComposeBody(event.target.value)}
          placeholder={t("memo.card.placeholder")}
          value={composeBody}
        />
        <div className={styles.composeActions}>
          <Button
            disabled={!composeBody.trim() || creating}
            icon={<Plus size={14} strokeWidth={2.1} />}
            loading={creating}
            size="sm"
            type="submit"
            variant="primary"
          >
            {creating ? t("memo.card.saving") : t("memo.card.save")}
          </Button>
        </div>
      </form>

      {notice ? (
        <p aria-live="polite" className={styles.notice}>
          {notice}
        </p>
      ) : null}

      {memos.length === 0 ? (
        <p className={styles.emptyState}>{t("memo.card.empty")}</p>
      ) : (
        <ul aria-label={t("memo.card.listAria")} className={styles.memoList}>
          {memos.map((memo) => (
            <li className={styles.memoItem} key={memo.id}>
              {editingMemoId === memo.id ? (
                <form
                  className={styles.editForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleUpdate(memo.id);
                  }}
                >
                  <textarea
                    aria-label={t("memo.card.editComposeAria")}
                    disabled={busyMemoId === memo.id}
                    maxLength={2000}
                    onChange={(event) => setEditingBody(event.target.value)}
                    value={editingBody}
                  />
                  <div className={styles.editActions}>
                    <Button disabled={!editingBody.trim() || busyMemoId === memo.id} loading={busyMemoId === memo.id} size="sm" type="submit" variant="primary">
                      {t("memo.card.save")}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingMemoId(null);
                        setEditingBody("");
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {t("memo.card.cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className={styles.memoBody}>{memo.body}</p>
                  <div className={styles.memoMeta}>
                    <time dateTime={memo.updatedAt}>{formatMemoTime(memo.updatedAt)}</time>
                    <span className={styles.memoActions}>
                      <button
                        aria-label={t("memo.card.editAria")}
                        disabled={busyMemoId === memo.id}
                        onClick={() => {
                          setEditingMemoId(memo.id);
                          setEditingBody(memo.body);
                          setConfirmDeleteId(null);
                        }}
                        type="button"
                      >
                        <Pencil aria-hidden size={12} strokeWidth={2.1} />
                        <span>{t("memo.card.edit")}</span>
                      </button>
                      <button
                        aria-label={t("memo.card.deleteAria")}
                        className={confirmDeleteId === memo.id ? styles.memoDeleteConfirm : undefined}
                        disabled={busyMemoId === memo.id}
                        onClick={() => void handleDelete(memo.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden size={12} strokeWidth={2.1} />
                        <span>
                          {busyMemoId === memo.id
                            ? t("memo.card.deleting")
                            : confirmDeleteId === memo.id
                              ? t("memo.card.deleteConfirm")
                              : t("memo.card.delete")}
                        </span>
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
