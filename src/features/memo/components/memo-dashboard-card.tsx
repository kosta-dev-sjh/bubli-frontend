"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { memoApi } from "@/features/memo/api/memoApi";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged, useDataRefresh } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import { isWindowsTauriRuntime } from "@/lib/tauri/platform";
import { readTauriStartupOptimizationConfig } from "@/lib/tauri/startup-optimization";
import type { MemoResponse } from "@/types/api/memo";

import styles from "./memo-dashboard-card.module.css";

type MemoListState =
  | { kind: "loading" }
  | { kind: "ready"; memos: MemoResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

const MEMO_PAGE_SIZE = 10;
const MEMO_VISIBLE_COUNT = 4;
const WINDOWS_MEMO_INITIAL_TIMEOUT_FALLBACK_MS = 650;
// 데이터 변경 이벤트 발행 주체 — 카드 자신이 이미 낙관적으로 갱신한 변경으로 재조회하지 않게 한다.
const MEMO_CARD_EVENT_SOURCE = "memo-dashboard-card";

// 상태가 ACTIVE인 메모만, 최근 수정 순으로 정렬해 보여준다(dev PR 201 동작 이식).
function normalizeMemoItems(items: MemoResponse[]) {
  return items
    .filter((memo) => memo.status === "ACTIVE")
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

// 장문 대응 컴포저 — 1줄에서 시작해 최대 약 5줄(≈123px)까지 늘고 이후 내부 스크롤.
async function readWindowsMemoInitialTimeoutMs() {
  if (!isWindowsTauriRuntime()) return 0;
  const config = await readTauriStartupOptimizationConfig();
  return config.displayRequestTimeoutMs || WINDOWS_MEMO_INITIAL_TIMEOUT_FALLBACK_MS;
}

function withMemoInitialDeadline<T>(request: Promise<T>, timeoutMs: number): Promise<T | null> {
  if (timeoutMs <= 0) return request;
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
    request.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

const MEMO_TEXTAREA_MAX_HEIGHT = 123;

function autoGrowTextarea(node: HTMLTextAreaElement | null) {
  if (!node) return;
  node.style.height = "auto";
  node.style.height = `${Math.min(node.scrollHeight, MEMO_TEXTAREA_MAX_HEIGHT)}px`;
  node.style.overflowY = node.scrollHeight > MEMO_TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
}

// Enter는 줄바꿈, Cmd/Ctrl+Enter는 소속 폼 저장(컴포저 힌트와 동일 계약).
function submitOnModEnter(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

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

export function MemoDashboardCard({ roomId = null }: { roomId?: string | null }) {
  const { t } = useI18n();
  const [state, setState] = useState<MemoListState>({ kind: "loading" });
  const [composeBody, setComposeBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busyMemoId, setBusyMemoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const composeRef = useRef<HTMLTextAreaElement | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);

  // 자동 확장 — 값이 바뀔 때마다 높이를 내용에 맞춘다(최대 높이 초과 시 내부 스크롤).
  useEffect(() => {
    autoGrowTextarea(composeRef.current);
  }, [composeBody]);
  useEffect(() => {
    autoGrowTextarea(editRef.current);
  }, [editingBody, editingMemoId]);

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

  const loadMemos = useCallback(async (options?: { quiet?: boolean }) => {
    // quiet 재조회(이벤트/포커스 복귀)는 기존 목록을 유지해 카드가 깜빡이지 않게 한다.
    if (!options?.quiet) setState({ kind: "loading" });

    try {
      const memosRequest = roomId ? memoApi.listRoom(roomId, { size: MEMO_PAGE_SIZE }) : memoApi.listPersonal({ size: MEMO_PAGE_SIZE });
      const applyMemoPage = (page: Awaited<typeof memosRequest>) => {
        setState({ kind: "ready", memos: normalizeMemoItems(page.items) });
      };
      const initialTimeoutMs = await readWindowsMemoInitialTimeoutMs();
      const initialPage = await withMemoInitialDeadline(memosRequest, initialTimeoutMs);
      if (initialPage) {
        applyMemoPage(initialPage);
      } else {
        setState((current) => (current.kind === "ready" ? current : { kind: "ready", memos: [] }));
        void memosRequest.then(applyMemoPage).catch((error: unknown) => {
          if (error instanceof ApiClientError && error.status === 401) {
            setState({ kind: "auth" });
          }
        });
      }
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
  }, [roomId, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMemos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMemos]);

  // 메모 페이지/데스크톱 위젯 등 다른 표면의 메모 변경을 이벤트·포커스 복귀로 즉시 반영한다.
  const refreshMemos = useCallback(() => {
    void loadMemos({ quiet: true });
  }, [loadMemos]);
  useDataRefresh({ domains: ["memo"], ignoreSource: MEMO_CARD_EVENT_SOURCE, onRefresh: refreshMemos });

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
        const created = roomId ? await memoApi.createRoom(roomId, { body }) : await memoApi.createPersonal({ body });
        setState((current) => (current.kind === "ready" ? { kind: "ready", memos: [created, ...current.memos] } : current));
        setComposeBody("");
        notifyDataChanged("memo", { source: MEMO_CARD_EVENT_SOURCE });
        setNotice(t("memo.card.savedNotice"));
      } catch (error) {
        setNotice(resolveErrorNotice(error, t("memo.card.saveFailed")));
      } finally {
        setCreating(false);
      }
    },
    [composeBody, resolveErrorNotice, roomId, t],
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
        notifyDataChanged("memo", { source: MEMO_CARD_EVENT_SOURCE });
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
        notifyDataChanged("memo", { source: MEMO_CARD_EVENT_SOURCE });
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
          onKeyDown={submitOnModEnter}
          placeholder={t("memo.card.placeholder")}
          ref={composeRef}
          rows={1}
          value={composeBody}
        />
        <div className={styles.composeActions}>
          <span className={styles.composeHint}>{t("memo.card.composerHint")}</span>
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
                    onKeyDown={submitOnModEnter}
                    ref={editRef}
                    rows={1}
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
