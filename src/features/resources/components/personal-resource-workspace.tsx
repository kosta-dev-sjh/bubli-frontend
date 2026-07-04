"use client";

import { AlertCircle, HardDrive, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { useI18n } from "@/lib/i18n";
import { PERSONAL_RESOURCES_CHANGED_EVENT } from "@/lib/local/managed-folder-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { cn } from "@/lib/utils";
import { ACTIVE_PROJECT_ROOM_CHANGE_EVENT, getActiveProjectRoomId } from "@/lib/workspace-active-room";
import { shouldUseWorkspacePreviewData, workspacePreviewPersonalResources } from "@/lib/workspace-preview-data";
import type { ResourceResponse } from "@/types/api/resource";

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

export function PersonalResourceWorkspace() {
  const { t } = useI18n();
  const [state, setState] = useState<PersonalState>({ kind: "loading" });
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewIntent, setPreviewIntent] = useState<ResourcePreviewIntent | null>(null);
  const [isTauri, setIsTauri] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => getActiveProjectRoomId());

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
                </span>
              </div>

              {actionError ? <p className={styles.errorLine}>{actionError}</p> : null}

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
