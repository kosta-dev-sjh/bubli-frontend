"use client";

import { AlertCircle, FolderOpen, HardDrive, Laptop, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { useI18n } from "@/lib/i18n";
import { ACTIVE_PROJECT_ROOM_CHANGE_EVENT, getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import { shouldUseWorkspacePreviewData, workspacePreviewPersonalResources } from "@/lib/workspace-preview-data";
import type { ResourceResponse } from "@/types/api/resource";

import { formatDate, getErrorMessage, ResourcePreview, resolveErrorMessage, ResourceScopeSwitch, ResourceTile, ResourceToolbar, type ViewMode } from "./resource-board-common";
import styles from "./resource-board-polish.module.css";

const EMPTY_RESOURCES: ResourceResponse[] = [];

type PersonalState =
  | { kind: "loading" }
  | { kind: "ready"; resources: ResourceResponse[] }
  | { kind: "auth" }
  | { kind: "error"; message: string };

export function PersonalResourceWorkspace() {
  const { t } = useI18n();
  const [state, setState] = useState<PersonalState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isTauri, setIsTauri] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => getActiveProjectRoomId());

  const loadResources = useCallback(async () => {
    try {
      const page = await resourcesApi.listPersonal();
      setState({ kind: "ready", resources: page.items });
      setSelectedResourceId((current) => (current && page.items.some((resource) => resource.id === current) ? current : null));
    } catch (error) {
      const message = getErrorMessage(error);
      if (message !== "AUTH_REQUIRED" && shouldUseWorkspacePreviewData()) {
        const resources = workspacePreviewPersonalResources;
        setState({ kind: "ready", resources });
        setSelectedResourceId((current) => (current && resources.some((resource) => resource.id === current) ? current : null));
        return;
      }
      setState(message === "AUTH_REQUIRED" ? { kind: "auth" } : { kind: "error", message });
    }
  }, []);

  const refreshResources = useCallback(() => {
    setState({ kind: "loading" });
    void loadResources();
  }, [loadResources]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsTauri(isTauriRuntime());
      void loadResources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  useEffect(() => {
    function handleRoomChange() {
      setActiveRoomId(getActiveProjectRoomId());
    }

    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleRoomChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, handleRoomChange);
  }, []);

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
          <span className={styles.kicker}>{t("resources.workspace.personalKicker")}</span>
          <h1>{t("resources.workspace.title")}</h1>
          <p>{t("resources.workspace.personalDesc")}</p>
        </div>
        <div className={styles.headerActions}>
          <ResourceScopeSwitch activeScope="personal" roomHref={activeRoomId ? `/app/project-rooms/${activeRoomId}/resources` : "/app/project-rooms"} roomLabel={t("resources.board.scope.room")} />
        </div>
      </GlassPanel>

      {state.kind === "auth" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("resources.workspace.authTitle")}</h2>
            <Link className="bubli-button bubli-button--primary" href="/login">
              {t("common.login")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="resource-workspace__notice">
          <AlertCircle aria-hidden size={20} strokeWidth={2} />
          <div>
            <h2>{t("resources.workspace.offlineTitle")}</h2>
            <p>{resolveErrorMessage(state.message, t)}</p>
            <div className="resource-workspace__notice-actions" aria-label={t("resources.workspace.statusActionsAria")}>
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
                  <span>{t("resources.workspace.personalListLabel")}</span>
                  <strong>{t("resources.workspace.totalCount", { count: state.kind === "loading" ? "-" : resources.length })}</strong>
                </div>
                <p>{isTauri ? t("resources.workspace.localScan", { date: latestScannedAt ? formatDate(latestScannedAt, t) : t("resources.workspace.localScanWaiting") }) : t("resources.workspace.desktopConnectHint")}</p>
              </div>

              <ResourceToolbar onQuery={setQuery} onViewMode={setViewMode} query={query} viewMode={viewMode} />

              <GlassPanel className={cn("resource-workspace__dropzone resource-workspace__dropzone--local", styles.syncStrip)}>
                <HardDrive aria-hidden size={22} strokeWidth={2} />
                <div>
                  <strong>{isTauri ? t("resources.workspace.localSyncTitle") : t("resources.workspace.desktopNeededTitle")}</strong>
                  <p>
                    {isTauri
                      ? t("resources.workspace.localSyncDesc")
                      : t("resources.workspace.desktopNeededDesc")}
                  </p>
                </div>
                <span className={styles.syncBadge}>{isTauri ? t("resources.workspace.syncConnected") : t("resources.workspace.syncAppNeeded")}</span>
              </GlassPanel>

              <div className={cn("resource-workspace__items", styles.fileGrid, viewMode === "list" && "resource-workspace__items--list", viewMode === "list" && styles.fileList)}>
                {state.kind === "loading" ? (
                  <>
                    <GlassPanel loading />
                    <GlassPanel loading />
                    <GlassPanel loading />
                  </>
                ) : filteredResources.length === 0 ? (
                  <GlassPanel className="resource-workspace__empty">
                    <FolderOpen aria-hidden size={22} strokeWidth={2} />
                    <div>
                      <h2>{t("resources.workspace.emptyTitle")}</h2>
                      <p>{isTauri ? t("resources.workspace.personalEmptyReady") : t("resources.workspace.personalEmptyBrowser")}</p>
                      <div className="resource-workspace__local-steps">
                        <span>
                          <Laptop aria-hidden size={14} strokeWidth={2} />
                          {t("resources.workspace.stepOpenApp")}
                        </span>
                        <span>
                          <FolderOpen aria-hidden size={14} strokeWidth={2} />
                          {t("resources.workspace.stepSelectFolder")}
                        </span>
                        <span>
                          <RefreshCw aria-hidden size={14} strokeWidth={2} />
                          {t("resources.workspace.stepAutoSync")}
                        </span>
                      </div>
                    </div>
                  </GlassPanel>
                ) : (
                  filteredResources.map((resource) => (
                    <ResourceTile
                      key={resource.id}
                      mode={viewMode}
                      onSelect={() => setSelectedResourceId(resource.id)}
                      resource={resource}
                      scope="personal"
                      selected={selectedResource?.id === resource.id}
                    />
                  ))
                )}
              </div>
            </section>

            <ResourcePreview
              emptyHint={t("resources.workspace.previewEmptyHint")}
              onClose={() => setSelectedResourceId(null)}
              resource={selectedResource}
              scope="personal"
            />
          </GlassPanel>
        </>
      ) : null}
    </section>
  );
}
