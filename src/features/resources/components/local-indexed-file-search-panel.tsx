"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useI18n } from "@/lib/i18n";
import {
  openPersonalLocalFile,
  readPersonalLocalFilePreview,
  searchPersonalLocalFiles,
} from "@/lib/local/managed-folder-client";
import { listenManagedFolderWatchEvents } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { LocalFilePreviewResult, LocalFileSearchResult } from "@/lib/tauri/commands";

// 재구축 워크스페이스 공용 스타일 사용 — resource-board-polish.module.css는 폐기되었다.
import styles from "./resource-workspace.module.css";

type LocalIndexedFile = LocalFileSearchResult["items"][number];

type LocalFilePreviewState =
  | { kind: "loading" }
  | { kind: "ready"; data: LocalFilePreviewResult }
  | { kind: "error"; message: string };

export function LocalIndexedFileSearchPanel({ query }: { query: string }) {
  const { t } = useI18n();
  const [isTauri, setIsTauri] = useState(false);
  const [localFolderConsent, setLocalFolderConsent] = useState(false);
  const [localMatches, setLocalMatches] = useState<LocalIndexedFile[]>([]);
  const [localSearchState, setLocalSearchState] = useState<"idle" | "loading" | "ready" | "blocked" | "error">("idle");
  const [localSearchMessage, setLocalSearchMessage] = useState<string | null>(null);
  const [localFilePreviews, setLocalFilePreviews] = useState<Record<string, LocalFilePreviewState>>({});
  const [localSearchRefreshKey, setLocalSearchRefreshKey] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsTauri(isTauriRuntime());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    void import("@/features/settings/api/settingsApi")
      .then(({ settingsApi }) => settingsApi.getPrivacyConsents())
      .then((privacy) => {
        if (!cancelled) setLocalFolderConsent(Boolean(privacy.localFolderEnabled));
      })
      .catch(() => {
        if (!cancelled) setLocalFolderConsent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTauri]);

  useEffect(() => {
    const term = query.trim();
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLocalFilePreviews({});

      if (!isTauri || !term) {
        setLocalMatches([]);
        setLocalSearchState("idle");
        setLocalSearchMessage(null);
        return;
      }

      if (!localFolderConsent) {
        setLocalMatches([]);
        setLocalSearchState("blocked");
        setLocalSearchMessage(t("settings.privacy.folder.title"));
        return;
      }

      setLocalSearchState("loading");
      setLocalSearchMessage(null);
      void searchPersonalLocalFiles({ consentGranted: true, limit: 6, query: term }).then((result) => {
        if (cancelled) return;

        if (result.status === "ready") {
          setLocalMatches(result.data.items);
          setLocalSearchState("ready");
          setLocalSearchMessage(t("settings.msg.localFilesFound", { count: result.data.items.length }));
          return;
        }

        setLocalMatches([]);
        setLocalSearchState(result.status === "blocked" ? "blocked" : "error");
        setLocalSearchMessage(result.message);
      });
    }, !isTauri || !term || !localFolderConsent ? 0 : 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isTauri, localFolderConsent, localSearchRefreshKey, query, t]);

  useEffect(() => {
    if (!isTauri || !localFolderConsent || !query.trim()) return;

    let cancelled = false;
    const unlistenPromise = listenManagedFolderWatchEvents((payload) => {
      if (cancelled || payload.changedCount <= 0) return;
      setLocalSearchRefreshKey((current) => current + 1);
    });

    return () => {
      cancelled = true;
      void unlistenPromise.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, [isTauri, localFolderConsent, query]);

  const openLocalIndexedFile = useCallback(
    async (localFileId: string) => {
      if (!localFolderConsent) return;
      await openPersonalLocalFile({ consentGranted: true, localFileId });
    },
    [localFolderConsent],
  );

  const previewLocalIndexedFile = useCallback(
    async (localFileId: string) => {
      if (!localFolderConsent) return;

      setLocalFilePreviews((current) => ({ ...current, [localFileId]: { kind: "loading" } }));
      const result = await readPersonalLocalFilePreview({ consentGranted: true, localFileId, maxChars: 2400 });
      if (result.status !== "ready") {
        setLocalFilePreviews((current) => ({ ...current, [localFileId]: { kind: "error", message: result.message } }));
        return;
      }

      setLocalFilePreviews((current) => ({ ...current, [localFileId]: { kind: "ready", data: result.data } }));
    },
    [localFolderConsent],
  );

  if (!isTauri || !query.trim()) return null;

  return (
    <GlassPanel className={styles.localIndexPanel}>
      <div className={styles.localIndexHeader}>
        <div>
          <span>{t("settings.folders.searchLocal")}</span>
          <strong>{localSearchState === "loading" ? t("common.loading") : localSearchMessage ?? t("settings.value.local")}</strong>
        </div>
        <span>{t("settings.value.local")}</span>
      </div>
      {localSearchState === "ready" && localMatches.length > 0 ? (
        <div className={styles.localIndexRows}>
          {localMatches.map((file) => {
            const preview = localFilePreviews[file.localFileId];

            return (
              <div className={styles.localIndexRow} key={file.localFileId}>
                <div>
                  <strong>{file.name}</strong>
                  <small>{file.path}</small>
                  {file.matchedText ? <p>{file.matchedText}</p> : null}
                </div>
                <div className={styles.localIndexActions}>
                  <Button
                    disabled={preview?.kind === "loading"}
                    onClick={() => void previewLocalIndexedFile(file.localFileId)}
                    size="sm"
                    type="button"
                    variant="quiet"
                  >
                    {preview?.kind === "loading" ? t("common.loading") : t("settings.font.preview")}
                  </Button>
                  <Button onClick={() => void openLocalIndexedFile(file.localFileId)} size="sm" type="button" variant="quiet">
                    {t("common.open")}
                  </Button>
                </div>
                {preview ? (
                  <div className={styles.localIndexPreview}>
                    {preview.kind === "ready" ? (
                      <>
                        <span>{preview.data.status}</span>
                        <pre>{preview.data.previewText?.trim() || preview.data.status}</pre>
                      </>
                    ) : preview.kind === "error" ? (
                      <p>{preview.message}</p>
                    ) : (
                      <p>{t("common.loading")}</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.localIndexEmpty}>
          {localSearchState === "loading" ? t("common.loading") : localSearchMessage ?? t("resources.workspace.previewEmptyHint")}
        </p>
      )}
    </GlassPanel>
  );
}
