"use client";

import { AlertCircle, HardDrive } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import {
  openPersonalLocalFile,
  PERSONAL_RESOURCES_CHANGED_EVENT,
  readPersonalLocalFilePreview,
  reindexPersonalLocalFile,
  searchPersonalLocalFiles,
  syncPersonalLocalFileEventsToServer,
} from "@/lib/local/managed-folder-client";
import { ACTIVE_PROJECT_ROOM_CHANGE_EVENT, getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData, workspacePreviewPersonalResources } from "@/lib/workspace-preview-data";
import type { LocalFilePreviewResult, LocalFileSearchResult } from "@/lib/tauri/commands";
import type { ResourceResponse } from "@/types/api/resource";

import { formatDate, getErrorMessage, ResourcePreview, ResourceScopeSwitch, ResourceTile, ResourceToolbar, type ViewMode } from "./resource-board-common";
import styles from "./resource-board-polish.module.css";

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isTauri, setIsTauri] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => getActiveProjectRoomId());
  const [localFolderConsent, setLocalFolderConsent] = useState(false);
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

  const selectedResource = selectedResourceId ? filteredResources.find((resource) => resource.id === selectedResourceId) ?? null : null;
  const canShowBoard = state.kind !== "auth" && state.kind !== "error";
  const latestScannedAt = resources.reduce<string | null>((latest, resource) => {
    if (!resource.updatedAt) {
      return latest;
    }

    if (!latest || new Date(resource.updatedAt).getTime() > new Date(latest).getTime()) {
      return resource.updatedAt;
    }

    return latest;
  }, null);

  return (
    <section className={cn("resource-workspace", styles.workspace)} aria-label={t("resources.workspace.aria")}>
      <GlassPanel className={cn("resource-workspace__hero", styles.boardHeader)}>
        <div className="resource-workspace__copy">
          <span className={styles.kicker}>{t("resources.workspace.kickerPersonal")}</span>
          <h1>{t("resources.workspace.title")}</h1>
          <p>{t("resources.workspace.personalHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <ResourceScopeSwitch activeScope="personal" roomHref={activeRoomId ? `/app/project-rooms/${activeRoomId}/resources` : "/app/project-rooms"} roomLabel={t("resources.common.roomFallback")} />
        </div>
      </GlassPanel>

      {state.kind === "auth" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("resources.workspace.loginRequired")}</h2>
            <Link className="bubli-button bubli-button--primary" href="/login">
              {t("resources.workspace.login")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("resources.workspace.serverWaiting")}</h2>
            <p>{state.message}</p>
            <div className="resource-workspace__notice-actions" aria-label={t("resources.workspace.statusActionAria")}>
              <Button onClick={refreshResources} variant="primary">
                {t("resources.workspace.reconnect")}
              </Button>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {canShowBoard ? (
        <>
          <GlassPanel className={cn("resource-workspace__board", styles.boardShell, styles.boardShellFlat, selectedResource ? styles.boardShellHasPreview : styles.boardShellNoPreview)}>
            <section className="resource-workspace__browser" aria-label={t("resources.workspace.browseAria")}>
              <div className={styles.listHeader}>
                <div>
                  <span>{t("resources.workspace.kickerPersonal")}</span>
                  <strong>{state.kind === "loading" ? t("resources.workspace.totalUnknown") : t("resources.workspace.totalCount", { count: resources.length })}</strong>
                </div>
                <p>{isTauri ? t("resources.workspace.scanLatest", { date: latestScannedAt ? formatDate(latestScannedAt, t) : t("resources.workspace.scanWaiting") }) : t("resources.workspace.personalConnect")}</p>
              </div>

              <ResourceToolbar onQuery={setQuery} onViewMode={setViewMode} query={query} viewMode={viewMode} />

              <GlassPanel className={cn("resource-workspace__dropzone resource-workspace__dropzone--local", styles.syncStrip)}>
                <HardDrive aria-hidden size={22} strokeWidth={2} />
                <div>
                  <strong>{isTauri ? t("resources.workspace.syncTitleTauri") : t("resources.workspace.syncTitleWeb")}</strong>
                  <p>
                    {isTauri
                      ? t("resources.workspace.syncDescTauri")
                      : t("resources.workspace.syncDescWeb")}
                  </p>
                </div>
                {isTauri ? (
                  <Button disabled={!localFolderConsent || localSearchState === "loading"} onClick={() => void syncLocalIndexedChanges()} type="button" variant="quiet">
                    {t("settings.lso.folder.target")}
                  </Button>
                ) : null}
              </GlassPanel>

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

              {state.kind === "loading" ? (
                <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                  <>
                    <GlassPanel loading />
                    <GlassPanel loading />
                    <GlassPanel loading />
                  </>
                </div>
              ) : filteredResources.length === 0 ? (
                <div className={styles.emptyCanvas} role="status">
                  <div className={styles.emptyCanvasInner}>
                    <strong>{isTauri ? t("resources.workspace.emptyPersonalTitleTauri") : t("resources.workspace.emptyPersonalTitleWeb")}</strong>
                    <p>{isTauri ? t("resources.workspace.emptyPersonalDescTauri") : t("resources.workspace.emptyPersonalDescWeb")}</p>
                  </div>
                </div>
              ) : (
                <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                  {filteredResources.map((resource) => (
                    <ResourceTile
                      key={resource.id}
                      mode={viewMode}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="personal"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))}
                </div>
              )}
            </section>

            <ResourcePreview
              emptyHint={t("resources.workspace.previewEmptyHint")}
              onClose={() => setSelectedResourceId(null)}
              onDeleted={() => {
                setSelectedResourceId(null);
                void loadResources();
              }}
              resource={selectedResource}
              scope="personal"
            />
          </GlassPanel>
        </>
      ) : null}
    </section>
  );
}
