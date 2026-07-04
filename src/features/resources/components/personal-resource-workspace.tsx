"use client";

import { AlertCircle, HardDrive, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { useI18n } from "@/lib/i18n";
import {
  listPersonalManagedFolders,
  openPersonalLocalFile,
  PERSONAL_RESOURCES_CHANGED_EVENT,
  readPersonalLocalFilePreview,
  reindexPersonalLocalFile,
  scanPersonalManagedFolder,
  searchPersonalLocalFiles,
  selectPersonalManagedFolder,
  syncPersonalLocalFileEventsToServer,
  watchPersonalManagedFolder,
} from "@/lib/local/managed-folder-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import { ACTIVE_PROJECT_ROOM_CHANGE_EVENT, getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewPersonalResources } from "@/lib/workspace-preview-data";
import type { LocalFilePreviewResult, LocalFileSearchResult, ManagedFolderListItem } from "@/lib/tauri/commands";
import type { ResourceResponse } from "@/types/api/resource";

import { ResourceAiSearchPanel } from "./resource-ai-search-panel";
import {
  formatDate,
  getErrorMessage,
  openResourceDownload,
  ResourcePreview,
  ResourceRow,
  ResourceScopeSwitch,
  type ResourcePreviewIntent,
} from "./resource-board-common";
import styles from "./resource-workspace.module.css";

const EMPTY_RESOURCES: ResourceResponse[] = [];

type PersonalState =
  | { kind: "loading" }
  | { kind: "ready"; resources: ResourceResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

type LocalIndexedFile = LocalFileSearchResult["items"][number];

type LocalFilePreviewState =
  | { kind: "loading" }
  | { kind: "ready"; data: LocalFilePreviewResult }
  | { kind: "error"; message: string };

export function PersonalResourceWorkspace() {
  const { t } = useI18n();
  const [state, setState] = useState<PersonalState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewIntent, setPreviewIntent] = useState<ResourcePreviewIntent | null>(null);
  const [isTauri, setIsTauri] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => getActiveProjectRoomId());
  const [localFolderConsent, setLocalFolderConsent] = useState(false);
  const [localFolders, setLocalFolders] = useState<ManagedFolderListItem[]>([]);
  const [localFolderAction, setLocalFolderAction] = useState<"select" | "scan" | null>(null);
  const [localFolderMessage, setLocalFolderMessage] = useState<string | null>(null);
  const [localMatches, setLocalMatches] = useState<LocalIndexedFile[]>([]);
  const [localSearchState, setLocalSearchState] = useState<"idle" | "loading" | "ready" | "blocked" | "error">("idle");
  const [localSearchMessage, setLocalSearchMessage] = useState<string | null>(null);
  const [localFilePreviews, setLocalFilePreviews] = useState<Record<string, LocalFilePreviewState>>({});

  const loadResources = useCallback(async () => {
    try {
      const page = await resourcesApi.listPersonal();
      setState({ kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : null));
    } catch (error) {
      const message = getErrorMessage(error, t);
      if (message !== "AUTH_REQUIRED" && shouldUseWorkspacePreviewData()) {
        const resources = workspacePreviewPersonalResources;
        setState({ kind: "ready", resources });
        setSelectedResourceId((current) => (current && resources.some((resource) => resource.id === current) ? current : null));
        return;
      }
      setState(message === "AUTH_REQUIRED" ? { kind: "auth" } : { kind: "error", message });
    }
  }, [t]);

  const refreshResources = useCallback(() => {
    setState({ kind: "loading" });
    void loadResources();
  }, [loadResources]);

  const refreshLocalFolders = useCallback(async () => {
    if (!isTauri) {
      setLocalFolders([]);
      return;
    }

    const result = await listPersonalManagedFolders();
    if (result.status === "ready") {
      setLocalFolders(result.data.folders.filter((folder) => folder.status !== "REMOVED"));
    }
  }, [isTauri]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const desktopRuntime = isTauriRuntime();
      setIsTauri(desktopRuntime);
      void loadResources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    let cancelled = false;

    void settingsApi
      .getPrivacyConsents()
      .then((privacy) => {
        if (!cancelled) {
          setLocalFolderConsent(Boolean(privacy.localFolderEnabled));
          void refreshLocalFolders();
        }
      })
      .catch(() => {
        if (!cancelled) setLocalFolderConsent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTauri, refreshLocalFolders]);

  useEffect(() => {
    function handleRoomChange() {
      setActiveRoomId(getActiveProjectRoomId());
    }

    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleRoomChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleRoomChange);
  }, []);

  useEffect(() => {
    function handlePersonalResourcesChanged() {
      void loadResources();
    }

    window.addEventListener(PERSONAL_RESOURCES_CHANGED_EVENT, handlePersonalResourcesChanged);
    return () => window.removeEventListener(PERSONAL_RESOURCES_CHANGED_EVENT, handlePersonalResourcesChanged);
  }, [loadResources]);

  const resources = useMemo(() => (state.kind === "ready" ? state.resources : EMPTY_RESOURCES), [state]);

  const filteredResources = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return resources;
    }

    return resources.filter((resource) => {
      const versionName = resource.currentVersion?.originalName ?? "";
      return `${resource.title} ${versionName} ${resource.status}`.toLowerCase().includes(term);
    });
  }, [query, resources]);

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
  }, [isTauri, localFolderConsent, query, t]);

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

  const reindexLocalIndexedFile = useCallback(
    async (localFileId: string) => {
      if (!localFolderConsent) return;

      setLocalFilePreviews((current) => {
        const next = { ...current };
        delete next[localFileId];
        return next;
      });
      setLocalSearchState("loading");

      const result = await reindexPersonalLocalFile({ consentGranted: true, localFileId });
      if (result.status !== "ready") {
        setLocalSearchState(result.status === "blocked" ? "blocked" : "error");
        setLocalSearchMessage(result.message);
        return;
      }

      const term = query.trim();
      if (term) {
        const searchResult = await searchPersonalLocalFiles({ consentGranted: true, limit: 6, query: term });
        if (searchResult.status === "ready") {
          setLocalMatches(searchResult.data.items);
          setLocalSearchState("ready");
        } else {
          setLocalSearchState(searchResult.status === "blocked" ? "blocked" : "error");
          setLocalSearchMessage(searchResult.message);
          return;
        }
      } else {
        setLocalSearchState("idle");
      }

      setLocalSearchMessage(
        result.data.status === "MISSING"
          ? t("settings.msg.fileMissing", { name: result.data.name })
          : result.data.changed
            ? t("settings.msg.fileReindexedChanged", { name: result.data.name })
            : t("settings.msg.fileReindexed", { name: result.data.name }),
      );
    },
    [localFolderConsent, query, t],
  );

  const syncLocalIndexedChanges = useCallback(async () => {
    if (!localFolderConsent) {
      setLocalSearchState("blocked");
      setLocalSearchMessage(t("local.folder.consentRequired"));
      return;
    }

    setLocalSearchState("loading");
    setLocalSearchMessage(t("common.loading"));

    const result = await syncPersonalLocalFileEventsToServer({ consentGranted: true, limit: 20 });
    if (result.status !== "ready") {
      setLocalSearchState(result.status === "blocked" ? "blocked" : "error");
      setLocalSearchMessage(result.message);
      return;
    }

    await loadResources();
    setLocalSearchState("ready");
    setLocalSearchMessage(
      result.data.syncedCount > 0 || result.data.sentCount > 0
        ? t("local.folder.synced", { count: result.data.syncedCount })
        : t("local.folder.noChanges"),
    );
  }, [loadResources, localFolderConsent, t]);

  const connectLocalFolder = useCallback(async () => {
    if (!isTauri) return;

    setLocalFolderAction("select");
    setLocalFolderMessage(null);
    try {
      const result = await selectPersonalManagedFolder({ consentGranted: localFolderConsent });
      if (result.status !== "ready") {
        setLocalFolderMessage(result.message ?? t("settings.msg.selectFolderFirst"));
        return;
      }

      setLocalFolders((current) => [
        {
          createdAt: new Date().toISOString(),
          localFolderId: result.data.localFolderId,
          name: result.data.name,
          path: result.data.path,
          status: "ACTIVE",
          syncEnabled: true,
          updatedAt: new Date().toISOString(),
        },
        ...current.filter((folder) => folder.localFolderId !== result.data.localFolderId),
      ]);

      const scanResult = await scanPersonalManagedFolder({
        consentGranted: localFolderConsent,
        localFolderId: result.data.localFolderId,
      });
      if (scanResult.status !== "ready") {
        setLocalFolderMessage(scanResult.message ?? t("settings.msg.folderConnected"));
        void refreshLocalFolders();
        return;
      }

      const watchResult = await watchPersonalManagedFolder({
        consentGranted: localFolderConsent,
        localFolderId: result.data.localFolderId,
      });
      const syncResult = await syncPersonalLocalFileEventsToServer({
        consentGranted: localFolderConsent,
        limit: 20,
        localFolderId: result.data.localFolderId,
      });

      await loadResources();
      void refreshLocalFolders();
      const syncText = syncResult.status === "ready" ? syncResult.message : syncResult.message ?? t("settings.msg.folderConnected");
      const watchText = watchResult.status === "ready" || watchResult.status === "pending" ? t("settings.msg.watchOn") : watchResult.message;
      setLocalFolderMessage(
        `${t("settings.msg.folderChanges", { count: scanResult.data.changedCount })} / ${watchText} / ${syncText}`,
      );
    } finally {
      setLocalFolderAction(null);
    }
  }, [isTauri, loadResources, localFolderConsent, refreshLocalFolders, t]);

  const scanLocalFolders = useCallback(async () => {
    if (!isTauri) return;
    if (localFolders.length === 0) {
      setLocalFolderMessage(t("settings.msg.selectFolderFirst"));
      return;
    }

    setLocalFolderAction("scan");
    setLocalFolderMessage(null);
    try {
      const results = await Promise.all(
        localFolders.map(async (folder) => ({
          folderId: folder.localFolderId,
          result: await scanPersonalManagedFolder({ consentGranted: localFolderConsent, localFolderId: folder.localFolderId }),
        })),
      );
      const failed = results.find(({ result }) => result.status !== "ready");
      if (failed) {
        setLocalFolderMessage(failed.result.message ?? t("settings.msg.selectFolderFirst"));
        return;
      }

      const changedCount = results.reduce((total, { result }) => (result.status === "ready" ? total + result.data.changedCount : total), 0);
      setLocalFolderMessage(t("settings.msg.folderChanges", { count: changedCount }));
      void loadResources();
    } finally {
      setLocalFolderAction(null);
    }
  }, [isTauri, loadResources, localFolderConsent, localFolders, t]);

  const selectedResource = selectedResourceId ? filteredResources.find((resource) => resource.id === selectedResourceId) ?? null : null;
  const roomBoardHref = activeRoomId ? `/app/project-rooms/${activeRoomId}/resources` : "/app/project-rooms";
  const latestScannedAt = resources.reduce<string | null>((latest, resource) => {
    if (!resource.updatedAt) {
      return latest;
    }

    if (!latest || new Date(resource.updatedAt).getTime() > new Date(latest).getTime()) {
      return resource.updatedAt;
    }

    return latest;
  }, null);

  const handleRowDownload = useCallback(async (resource: ResourceResponse) => {
    setActionError(null);
    try {
      await openResourceDownload(resource.id);
    } catch (error) {
      setActionError(getErrorMessage(error, t));
    }
  }, [t]);

  const sendPreviewIntent = useCallback((resourceId: string, kind: ResourcePreviewIntent["kind"]) => {
    setSelectedResourceId(resourceId);
    setPreviewIntent((current) => ({ kind, token: (current?.token ?? 0) + 1 }));
  }, []);

  return (
    <section className={styles.page} aria-label={t("resources.workspace.aria")}>
      <GlassPanel className={styles.shell} padded={false}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("resources.workspace.title")}</h1>
          <span className={styles.count}>
            {state.kind === "loading" ? t("resources.workspace.totalUnknown") : t("resources.workspace.totalCount", { count: resources.length })}
          </span>
          <span className={styles.headerSpacer} aria-hidden="true" />
          <ResourceScopeSwitch activeScope="personal" roomHref={roomBoardHref} roomLabel={t("resources.common.roomFallback")} />
          <label className={styles.search}>
            <Search aria-hidden size={15} strokeWidth={2} />
            <input
              aria-label={t("resources.common.searchAria")}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("resources.common.searchPlaceholder")}
              type="search"
              value={query}
            />
          </label>
        </header>

        {state.kind === "auth" ? (
          <div className={styles.stateBlock} role="status">
            <AlertCircle aria-hidden size={22} strokeWidth={2} />
            <strong>{t("resources.workspace.loginRequired")}</strong>
            <div className={styles.stateActions}>
              <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/login">
                {t("resources.workspace.login")}
              </Link>
            </div>
          </div>
        ) : state.kind === "error" ? (
          <div className={styles.stateBlock} role="status">
            <AlertCircle aria-hidden size={22} strokeWidth={2} />
            <strong>{t("resources.workspace.serverWaiting")}</strong>
            <p>{state.message}</p>
            <div className={styles.stateActions} aria-label={t("resources.workspace.statusActionAria")}>
              <Button onClick={refreshResources} size="sm" variant="primary">
                {t("resources.workspace.reconnect")}
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(styles.body, selectedResource && styles.bodyHasPreview)}>
            <div className={styles.list} aria-label={t("resources.workspace.browseAria")}>
              <div className={styles.dropzone}>
                <HardDrive aria-hidden size={18} strokeWidth={2} />
                <span className={styles.dropzoneText}>
                  <strong>{isTauri ? t("resources.workspace.syncTitleTauri") : t("resources.workspace.syncTitleWeb")}</strong>
                  <span>
                    {isTauri
                      ? t("resources.workspace.scanLatest", { date: latestScannedAt ? formatDate(latestScannedAt, t) : t("resources.workspace.scanWaiting") })
                      : t("resources.workspace.syncDescWeb")}
                  </span>
                  {/* dev PR 214 이식: 연결된 로컬 폴더 안내 — 우리 드롭존 스트립 문법(dropzoneText 안 small) 유지 */}
                  {isTauri ? (
                    <small>
                      {localFolderMessage ??
                        (localFolders.length > 0
                          ? t("resources.workspace.localFolderCount", { count: localFolders.length })
                          : t("resources.workspace.localFolderNone"))}
                    </small>
                  ) : null}
                </span>
                {isTauri ? (
                  <div className={styles.syncActions}>
                    <Button
                      disabled={localFolderAction !== null}
                      loading={localFolderAction === "select"}
                      onClick={() => void connectLocalFolder()}
                      size="sm"
                      type="button"
                      variant="primary"
                    >
                      {t("settings.folders.selectFolder")}
                    </Button>
                    <Button
                      disabled={localFolderAction !== null || localFolders.length === 0}
                      loading={localFolderAction === "scan"}
                      onClick={() => void scanLocalFolders()}
                      size="sm"
                      type="button"
                      variant="quiet"
                    >
                      {t("settings.folders.scan")}
                    </Button>
                    <Button disabled={!localFolderConsent || localSearchState === "loading"} onClick={() => void syncLocalIndexedChanges()} size="sm" type="button" variant="quiet">
                      {t("settings.lso.folder.target")}
                    </Button>
                  </div>
                ) : null}
              </div>

              {actionError ? <p className={styles.errorLine}>{actionError}</p> : null}

              {isTauri && query.trim() ? (
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
                              <Button onClick={() => void reindexLocalIndexedFile(file.localFileId)} size="sm" type="button" variant="quiet">
                                {t("settings.folders.reindex")}
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
              ) : null}

              {/* 서버 업로드 자료의 내용(임베딩) 기반 AI 검색 — 파일명 필터로 못 찾을 때의 보조 경로. */}
              <ResourceAiSearchPanel
                onSelectResource={(resourceId) => {
                  setQuery("");
                  setSelectedResourceId(resourceId);
                }}
                query={query}
                resources={resources}
              />

              {state.kind === "loading" ? (
                <div aria-hidden="true" className={styles.rows}>
                  {[0, 1, 2].map((index) => (
                    <div className={styles.skeletonRow} key={index}>
                      <span className="bubli-skeleton" style={{ borderRadius: 9, height: 34, width: 34 }} />
                      <span className="bubli-skeleton" style={{ height: 13, width: `${54 - index * 9}%` }} />
                    </div>
                  ))}
                </div>
              ) : filteredResources.length === 0 ? (
                <div className={styles.empty} role="status">
                  <strong>{isTauri ? t("resources.workspace.emptyPersonalTitleTauri") : t("resources.workspace.emptyPersonalTitleWeb")}</strong>
                  <p>{isTauri ? t("resources.workspace.emptyPersonalDescTauri") : t("resources.workspace.emptyPersonalDescWeb")}</p>
                  <div className={styles.emptyActions}>
                    <Link className="bubli-button bubli-button--primary bubli-button--sm" href={roomBoardHref}>
                      {t("resources.workspace.emptyPersonalGoRoomBoard")}
                    </Link>
                    <Link className="bubli-button bubli-button--sm" href="/download">
                      {t("resources.workspace.emptyPersonalGetDesktop")}
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className={styles.rows}>
                  {filteredResources.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      onDelete={() => sendPreviewIntent(resource.id, "delete")}
                      onDownload={() => void handleRowDownload(resource)}
                      onRename={() => sendPreviewIntent(resource.id, "rename")}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="personal"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))}
                </ul>
              )}
            </div>

            <ResourcePreview
              intent={previewIntent}
              onClose={() => setSelectedResourceId(null)}
              onDeleted={() => {
                setSelectedResourceId(null);
                void loadResources();
              }}
              onError={(message) => setActionError(message)}
              onSelectRelated={(relatedResource) => {
                if (resources.some((item) => item.id === relatedResource.id)) {
                  setQuery("");
                  setSelectedResourceId(relatedResource.id);
                }
              }}
              onUpdated={() => {
                void loadResources();
              }}
              resource={selectedResource}
              scope="personal"
            />
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
