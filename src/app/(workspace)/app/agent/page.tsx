"use client";

import { Check, Download, Eye, Pause, RefreshCw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentApi } from "@/features/agent/api/agentApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { getActiveProjectRoomId, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewPersonalSuggestions,
  workspacePreviewRoomSuggestions,
  workspacePreviewRooms,
} from "@/lib/workspace-preview-data";
import type {
  AgentSuggestionResponse,
  AgentSuggestionStatus,
  AgentSuggestionType,
  DailySummaryResponse,
  GeneratedDocumentResponse,
} from "@/types/api/agent";
import type { RoomMemorySummaryResponse } from "@/types/api/chat";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

type AgentPageState =
  | { kind: "loading" }
  | {
      dailySummaries: DailySummaryResponse[];
      generatedDocuments: GeneratedDocumentResponse[];
      kind: "ready";
      roomMemorySummaries: RoomMemorySummaryResponse[];
      rooms: ProjectRoomResponse[];
      selectedRoomId: string | null;
      suggestions: AgentSuggestionResponse[];
    }
  | { kind: "auth" }
  | { kind: "offline"; message: string };

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const typeLabelKeys: Record<AgentSuggestionType, MessageKey> = {
  CONTRACT_FIELD: "agent.page.typeContractField",
  CONTRACT_REVIEW: "agent.page.typeContractReview",
  DAILY_SUMMARY: "agent.page.typeDailySummary",
  DOCUMENT_DRAFT: "agent.page.typeDocumentDraft",
  MEMO: "agent.page.typeMemo",
  QUESTION: "agent.page.typeQuestion",
  REQUIREMENT: "agent.page.typeRequirement",
  REVIEW_ITEM: "agent.page.typeReviewItem",
  SCHEDULE: "agent.page.typeSchedule",
  TASK: "agent.page.typeTask",
  TODO: "agent.page.typeTodo",
  WBS: "agent.page.typeWbs",
};

const statusLabelKeys: Record<AgentSuggestionStatus, MessageKey> = {
  APPROVED: "agent.page.statusApprovedLabel",
  DRAFT: "agent.page.statusDraftLabel",
  HELD: "agent.page.statusHeldLabel",
  REJECTED: "agent.page.statusRejectedLabel",
};

function statusTone(status: AgentSuggestionStatus) {
  if (status === "APPROVED") return "success";
  if (status === "DRAFT") return "agent";
  if (status === "HELD") return "warning";
  return "neutral";
}

function displayText(payload: Record<string, unknown>, fallback: string) {
  const preferred = ["title", "name", "label", "summary", "question", "description", "content"]
    .map((key) => payload[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (preferred) return preferred;

  const firstString = Object.values(payload).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return firstString ?? fallback;
}

function displayJsonText(value: string, fallback: string) {
  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed === "string" && parsed.trim().length > 0) return parsed;
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const direct = ["title", "summary", "content", "text", "memo"]
        .map((key) => record[key])
        .find((item): item is string => typeof item === "string" && item.trim().length > 0);

      if (direct) return direct;

      const list = Object.values(record).find((item): item is string[] =>
        Array.isArray(item) && item.every((entry) => typeof entry === "string"),
      );
      if (list?.length) return list.slice(0, 3).join(" / ");
    }
  } catch {
    if (value.trim().length > 0) return value;
  }

  return fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function AgentPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [state, setState] = useState<AgentPageState>({ kind: "loading" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dailyUpdatingId, setDailyUpdatingId] = useState<string | null>(null);
  const [exportingDocumentId, setExportingDocumentId] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<GeneratedDocumentResponse | null>(null);
  const [startingSummaryJob, setStartingSummaryJob] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedRoomId = state.kind === "ready" ? state.selectedRoomId : null;

  const load = useCallback(async (roomId: string | null) => {
    setNotice(null);
    setSelectedDocument(null);
    setState((current) => {
      if (current.kind === "ready") {
        return {
          ...current,
          dailySummaries: [],
          generatedDocuments: [],
          roomMemorySummaries: [],
          selectedRoomId: roomId,
          suggestions: [],
        };
      }
      return { kind: "loading" };
    });

    try {
      const [roomPage, suggestions, dailySummaryPage, generatedDocumentPage, roomMemorySummaries] = await Promise.all([
        projectRoomApi.list(),
        roomId ? agentApi.listRoomSuggestions(roomId, { status: "DRAFT" }) : agentApi.listPersonalSuggestions({ status: "DRAFT" }),
        agentApi.listDailySummaries(),
        roomId ? agentApi.listRoomGeneratedDocuments(roomId) : agentApi.listGeneratedDocuments(),
        roomId ? chatApi.listRoomMemorySummaries(roomId) : Promise.resolve([]),
      ]);
      const selectedRoom = roomId ? roomPage.items.find((room) => room.id === roomId) : null;
      if (selectedRoom) {
        setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
      }

      setState({
        dailySummaries: dailySummaryPage.items,
        generatedDocuments: generatedDocumentPage.items,
        kind: "ready",
        roomMemorySummaries,
        rooms: roomPage.items,
        selectedRoomId: selectedRoom?.id ?? null,
        suggestions,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }

      if (shouldUseWorkspacePreviewData()) {
        const selectedRoom = roomId ? workspacePreviewRooms.find((room) => room.id === roomId) ?? workspacePreviewRooms[0] : null;
        if (selectedRoom) {
          setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
        }

        setState({
          dailySummaries: [],
          generatedDocuments: [],
          kind: "ready",
          roomMemorySummaries: [],
          rooms: workspacePreviewRooms,
          selectedRoomId: selectedRoom?.id ?? null,
          suggestions: selectedRoom ? workspacePreviewRoomSuggestions(selectedRoom.id) : workspacePreviewPersonalSuggestions(),
        });
        return;
      }

      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorLoad"),
      });
    }
  }, [t]);

  useEffect(() => {
    const initialRoomId = searchParams.get("roomId") ?? getActiveProjectRoomId();
    const timeoutId = window.setTimeout(() => {
      void load(initialRoomId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load, searchParams]);

  const counts = useMemo(() => {
    if (state.kind !== "ready") return null;

    return [
      { label: state.selectedRoomId ? t("agent.page.countRoomCandidates") : t("agent.page.countPersonalCandidates"), value: state.suggestions.length },
      { label: t("agent.page.countDailySummary"), value: state.dailySummaries.length },
      { label: t("agent.page.countGeneratedDocuments"), value: state.generatedDocuments.length },
      { label: t("agent.page.countRoomMemory"), value: state.roomMemorySummaries.length },
    ];
  }, [state, t]);

  const review = useCallback(async (suggestionId: string, action: "APPROVE" | "HOLD" | "REJECT") => {
    setUpdatingId(suggestionId);

    try {
      await agentApi.updateSuggestion(suggestionId, { action });
      await load(selectedRoomId);
    } catch (error) {
      if (!shouldUseWorkspacePreviewData()) {
        setState({
          kind: "offline",
          message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorReview"),
        });
        return;
      }

      const nextStatus: AgentSuggestionStatus = action === "APPROVE" ? "APPROVED" : action === "HOLD" ? "HELD" : "REJECTED";
      setState((current) => {
        if (current.kind !== "ready") return current;

        return {
          ...current,
          suggestions: current.suggestions.map((suggestion) =>
            suggestion.suggestionId === suggestionId
              ? {
                  ...suggestion,
                  reviewedAt: new Date().toISOString(),
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                }
              : suggestion,
          ),
        };
      });
    } finally {
      setUpdatingId(null);
    }
  }, [load, selectedRoomId, t]);

  const approveDailySummary = useCallback(async (summaryId: string) => {
    setDailyUpdatingId(summaryId);
    try {
      await agentApi.updateDailySummary(summaryId, { action: "APPROVE" });
      await load(selectedRoomId);
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorApproveDaily"),
      });
    } finally {
      setDailyUpdatingId(null);
    }
  }, [load, selectedRoomId, t]);

  const startDailySummary = useCallback(async () => {
    setStartingSummaryJob(true);
    try {
      const job = await agentApi.summarizeDay({ summaryDate: todayDateKey() });
      setNotice(t("agent.page.summaryStarted", { jobId: job.jobId }));
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorStartSummary"),
      });
    } finally {
      setStartingSummaryJob(false);
    }
  }, [t]);

  const openDocument = useCallback(async (documentId: string) => {
    setOpeningDocumentId(documentId);
    try {
      const document = await agentApi.getGeneratedDocument(documentId);
      setSelectedDocument(document);
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorOpenDocument"),
      });
    } finally {
      setOpeningDocumentId(null);
    }
  }, [t]);

  const exportDocument = useCallback(async (documentId: string) => {
    setExportingDocumentId(documentId);
    try {
      const result = await agentApi.exportGeneratedDocument(documentId);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorExportDocument"),
      });
    } finally {
      setExportingDocumentId(null);
    }
  }, [t]);

  return (
    <section className="workspace-route" aria-labelledby="agent-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="agent-title">{t("agent.page.title")}</h1>
        </div>
        <div className="workspace-route__actions">
          {state.kind === "ready" ? (
            <>
              <select
                aria-label={t("agent.page.scopeAria")}
                className="workspace-route__select"
                onChange={(event) => void load(event.target.value || null)}
                value={state.selectedRoomId ?? ""}
              >
                <option value="">{t("agent.page.scopePersonal")}</option>
                {state.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <Button
                icon={<Sparkles size={15} strokeWidth={1.9} />}
                loading={startingSummaryJob}
                onClick={() => void startDailySummary()}
                variant="primary"
              >
                {t("agent.page.createTodaySummary")}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {state.kind === "loading" ? <GlassPanel className="workspace-route__panel">{t("agent.page.loadingData")}</GlassPanel> : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{t("agent.page.authTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("common.login")}
          </Link>
        </GlassPanel>
      ) : null}

      {state.kind === "offline" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{state.message}</strong>
          <div className="workspace-route__actions">
            <Button onClick={() => void load(selectedRoomId)} variant="primary">
              <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
              {t("agent.page.reconnect")}
            </Button>
            <Link className="bubli-button" href="/app/resources">
              {t("agent.page.resources")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" ? (
        <>
          {notice ? (
            <GlassPanel className="workspace-route__panel">
              <strong>{notice}</strong>
            </GlassPanel>
          ) : null}

          {counts ? (
            <div className="workspace-route__summary" aria-label={t("agent.page.summaryAria")}>
              {counts.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <section className="workspace-route__section" aria-labelledby="agent-suggestions-title">
            <div className="workspace-route__section-head">
              <h2 id="agent-suggestions-title">{t("agent.page.suggestionsTitle")}</h2>
              <StatusBadge tone={state.suggestions.length > 0 ? "agent" : "neutral"}>{t("agent.page.suggestionsCount", { count: state.suggestions.length })}</StatusBadge>
            </div>
            {state.suggestions.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>{t("agent.page.suggestionsEmpty")}</strong>
                <div className="workspace-route__actions">
                  <Link className="bubli-button bubli-button--primary" href="/app/resources">
                    {t("agent.page.resources")}
                  </Link>
                  <Link className="bubli-button" href="/app/project-rooms">
                    {t("agent.page.projectRooms")}
                  </Link>
                </div>
              </GlassPanel>
            ) : (
              <div className="workspace-route__list">
                {state.suggestions.map((item) => {
                  const typeLabel = t(typeLabelKeys[item.suggestionType]);
                  const title = displayText(item.payloadJson, typeLabel);
                  const disabled = updatingId === item.suggestionId || item.status !== "DRAFT";
                  const dateLabel = formatDate(item.createdAt);

                  return (
                    <article className="workspace-route__row workspace-route__row--actions" key={item.suggestionId}>
                      <span className="workspace-route__dot" aria-hidden="true" />
                      <span className="workspace-route__main">
                        <strong>{title}</strong>
                        <span>{dateLabel ? t("agent.page.typeDateSeparator", { type: typeLabel, date: dateLabel }) : typeLabel}</span>
                      </span>
                      <StatusBadge tone={statusTone(item.status)}>{t(statusLabelKeys[item.status])}</StatusBadge>
                      <span className="workspace-route__actions workspace-route__actions--compact">
                        <button disabled={disabled} onClick={() => void review(item.suggestionId, "APPROVE")} type="button">
                          <Check aria-hidden size={14} />
                          {t("agent.page.approve")}
                        </button>
                        <button disabled={disabled} onClick={() => void review(item.suggestionId, "HOLD")} type="button">
                          <Pause aria-hidden size={14} />
                          {t("agent.page.hold")}
                        </button>
                        <button disabled={disabled} onClick={() => void review(item.suggestionId, "REJECT")} type="button">
                          <X aria-hidden size={14} />
                          {t("agent.page.reject")}
                        </button>
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="workspace-route__section" aria-labelledby="daily-summary-title">
            <div className="workspace-route__section-head">
              <h2 id="daily-summary-title">{t("agent.page.dailyTitle")}</h2>
              <StatusBadge tone={state.dailySummaries.length > 0 ? "personal" : "neutral"}>{t("agent.page.suggestionsCount", { count: state.dailySummaries.length })}</StatusBadge>
            </div>
            {state.dailySummaries.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>{t("agent.page.dailyEmpty")}</strong>
              </GlassPanel>
            ) : (
              <div className="workspace-route__list">
                {state.dailySummaries.map((summary) => (
                  <article className="workspace-route__row workspace-route__row--actions" key={summary.id}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{summary.summaryDate}</strong>
                      <span>{displayJsonText(summary.summaryJson, t("agent.page.dailyContentFallback"))}</span>
                    </span>
                    <StatusBadge tone={summary.status === "APPROVED" ? "approved" : "pending"}>
                      {summary.status === "APPROVED" ? t("agent.page.statusApproved") : t("agent.page.statusDraft")}
                    </StatusBadge>
                    <Button
                      disabled={summary.status === "APPROVED"}
                      loading={dailyUpdatingId === summary.id}
                      onClick={() => void approveDailySummary(summary.id)}
                      size="sm"
                      variant="quiet"
                    >
                      {t("agent.page.approve")}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-route__section" aria-labelledby="generated-documents-title">
            <div className="workspace-route__section-head">
              <h2 id="generated-documents-title">{t("agent.page.generatedTitle")}</h2>
              <StatusBadge tone={state.generatedDocuments.length > 0 ? "room" : "neutral"}>{t("agent.page.suggestionsCount", { count: state.generatedDocuments.length })}</StatusBadge>
            </div>
            {state.generatedDocuments.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>{t("agent.page.generatedEmpty")}</strong>
              </GlassPanel>
            ) : (
              <div className="workspace-route__list">
                {state.generatedDocuments.map((item) => (
                  <article className="workspace-route__row workspace-route__row--actions" key={item.id}>
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{item.title}</strong>
                      <span>{item.documentType}</span>
                    </span>
                    <span className="workspace-route__actions workspace-route__actions--compact">
                      <button disabled={openingDocumentId === item.id} onClick={() => void openDocument(item.id)} type="button">
                        <Eye aria-hidden size={14} />
                        {openingDocumentId === item.id ? t("agent.page.opening") : t("agent.page.open")}
                      </button>
                      <button disabled={exportingDocumentId === item.id} onClick={() => void exportDocument(item.id)} type="button">
                        <Download aria-hidden size={14} />
                        {exportingDocumentId === item.id ? t("agent.page.exporting") : t("agent.page.export")}
                      </button>
                    </span>
                  </article>
                ))}
              </div>
            )}
            {selectedDocument ? (
              <GlassPanel className="workspace-route__panel workspace-route__panel--document">
                <div className="workspace-route__section-head">
                  <div>
                    <h3>{selectedDocument.title}</h3>
                    <span>{selectedDocument.documentType}</span>
                  </div>
                  <button
                    aria-label={t("agent.page.documentPreviewCloseAria")}
                    className="workspace-route__icon-button"
                    onClick={() => setSelectedDocument(null)}
                    type="button"
                  >
                    <X aria-hidden size={16} />
                  </button>
                </div>
                <pre className="workspace-route__document-body">
                  {selectedDocument.contentMarkdown.trim().length > 0 ? selectedDocument.contentMarkdown : t("agent.page.documentEmptyBody")}
                </pre>
                <div className="workspace-route__actions">
                  <Button
                    icon={<Download size={14} strokeWidth={1.9} />}
                    loading={exportingDocumentId === selectedDocument.id}
                    onClick={() => void exportDocument(selectedDocument.id)}
                    size="sm"
                    variant="quiet"
                  >
                    {t("agent.page.exportDocument")}
                  </Button>
                </div>
              </GlassPanel>
            ) : null}
          </section>

          {state.selectedRoomId ? (
            <section className="workspace-route__section" aria-labelledby="room-memory-title">
              <div className="workspace-route__section-head">
                <h2 id="room-memory-title">{t("agent.page.roomMemoryTitle")}</h2>
                <StatusBadge tone={state.roomMemorySummaries.length > 0 ? "agent" : "neutral"}>
                  {t("agent.page.suggestionsCount", { count: state.roomMemorySummaries.length })}
                </StatusBadge>
              </div>
              {state.roomMemorySummaries.length === 0 ? (
                <GlassPanel className="workspace-route__panel">
                  <strong>{t("agent.page.roomMemoryEmpty")}</strong>
                </GlassPanel>
              ) : (
                <div className="workspace-route__list">
                  {state.roomMemorySummaries.map((item) => (
                    <article className="workspace-route__row" key={item.id}>
                      <span className="workspace-route__dot" aria-hidden="true" />
                      <span className="workspace-route__main">
                        <strong>
                          {t("agent.page.messageRange", { from: item.fromSequence, to: item.toSequence })}
                        </strong>
                        <span>{displayJsonText(item.summaryJson, t("agent.page.roomMemoryContentFallback"))}</span>
                      </span>
                      <StatusBadge tone={item.status === "APPROVED" ? "approved" : "pending"}>
                        {item.status === "APPROVED" ? t("agent.page.statusApproved") : t("agent.page.statusDraft")}
                      </StatusBadge>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default function AgentPage() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<GlassPanel className="workspace-route__panel">{t("agent.page.loadingData")}</GlassPanel>}>
      <AgentPageContent />
    </Suspense>
  );
}
