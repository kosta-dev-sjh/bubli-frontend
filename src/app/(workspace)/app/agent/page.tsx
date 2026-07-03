"use client";

import { Check, ChevronDown, Download, Eye, Pause, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
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
import type { MessageKey } from "@/lib/i18n";
import { getActiveProjectRoomId, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewPersonalSuggestions,
  workspacePreviewRoomSuggestions,
  workspacePreviewRooms,
} from "@/lib/workspace-preview-data";
import type {
  AgentJobStatus,
  AgentSuggestionResponse,
  AgentSuggestionStatus,
  AgentSuggestionType,
  DailySummaryResponse,
  GeneratedDocumentResponse,
} from "@/types/api/agent";
import type { RoomMemorySummaryResponse } from "@/types/api/chat";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

import styles from "./page.module.css";

type AgentPageState =
  | { kind: "loading" }
  | {
      confirmedRequirements: AgentSuggestionResponse[];
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

type ActiveJobState = {
  jobId: string;
  status: AgentJobStatus;
};

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

const jobStatusLabelKeys: Record<AgentJobStatus, MessageKey> = {
  CANCELED: "agent.timeline.statusCanceled",
  FAILED: "agent.timeline.statusFailed",
  PENDING: "agent.timeline.statusPending",
  RUNNING: "agent.timeline.statusRunning",
  SUCCEEDED: "agent.timeline.statusSucceeded",
};

function statusTone(status: AgentSuggestionStatus) {
  if (status === "APPROVED") return "success";
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

// 제목과 겹치지 않는 두 번째 설명 문자열(내용 요약)을 찾는다.
function displaySecondaryText(payload: Record<string, unknown>, title: string) {
  const secondary = ["summary", "description", "content", "detail", "body", "text"]
    .map((key) => payload[key])
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0 && value.trim() !== title.trim(),
    );

  return secondary ?? null;
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
  const [generatingRequirements, setGeneratingRequirements] = useState(false);
  const [checkingJob, setCheckingJob] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedRoomId = state.kind === "ready" ? state.selectedRoomId : null;

  // 절대 타임스탬프 대신 상대 날짜 하나만 보여준다(7일 이후는 월·일).
  const relativeDate = useCallback(
    (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;

      const minutes = Math.round((Date.now() - date.getTime()) / 60000);
      if (minutes < 1) return t("agent.page.dateJustNow");
      if (minutes < 60) return t("agent.page.dateMinutesAgo", { count: minutes });

      const hours = Math.round(minutes / 60);
      if (hours < 24) return t("agent.page.dateHoursAgo", { count: hours });

      const days = Math.round(hours / 24);
      if (days <= 7) return t("agent.page.dateDaysAgo", { count: days });

      return new Intl.DateTimeFormat("ko-KR", { day: "numeric", month: "short" }).format(date);
    },
    [t],
  );

  const load = useCallback(async (roomId: string | null) => {
    setNotice(null);
    setSelectedDocument(null);
    setState((current) => {
      if (current.kind === "ready") {
        return {
          ...current,
          confirmedRequirements: [],
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
      const [roomPage, suggestions, dailySummaryPage, generatedDocumentPage, roomMemorySummaries, confirmedRequirements] = await Promise.all([
        projectRoomApi.list(),
        roomId ? agentApi.listRoomSuggestions(roomId, { status: "DRAFT" }) : agentApi.listPersonalSuggestions({ status: "DRAFT" }),
        agentApi.listDailySummaries(),
        roomId ? agentApi.listRoomGeneratedDocuments(roomId) : agentApi.listGeneratedDocuments(),
        roomId ? chatApi.listRoomMemorySummaries(roomId) : Promise.resolve([]),
        roomId
          ? agentApi.listRoomConfirmedRequirements(roomId).catch((error: unknown) => {
              if (error instanceof ApiClientError && error.status === 401) throw error;
              return [] as AgentSuggestionResponse[];
            })
          : Promise.resolve([] as AgentSuggestionResponse[]),
      ]);
      const selectedRoom = roomId ? roomPage.items.find((room) => room.id === roomId) : null;
      if (selectedRoom) {
        setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
      }

      setState({
        confirmedRequirements,
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
          confirmedRequirements: [],
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

  // 숫자는 최대 3개만 — 후보 수, 하루 정리, 생성 문서.
  const counts = useMemo(() => {
    if (state.kind !== "ready") return null;

    return [
      { label: state.selectedRoomId ? t("agent.page.countRoomCandidates") : t("agent.page.countPersonalCandidates"), value: state.suggestions.length },
      { label: t("agent.page.countDailySummary"), value: state.dailySummaries.length },
      { label: t("agent.page.countGeneratedDocuments"), value: state.generatedDocuments.length },
    ];
  }, [state, t]);

  const suggestionGroups = useMemo(() => {
    if (state.kind !== "ready") return [];

    const groups = new Map<string, { items: AgentSuggestionResponse[]; label: string }>();
    for (const suggestion of state.suggestions) {
      const key = suggestion.roomId ?? "personal";
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(suggestion);
        continue;
      }

      const room = suggestion.roomId ? state.rooms.find((entry) => entry.id === suggestion.roomId) : null;
      const label = suggestion.roomId
        ? room?.name ?? t("agent.page.groupUnknownRoom")
        : t("agent.page.groupPersonal");
      groups.set(key, { items: [suggestion], label });
    }

    return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
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
      setActiveJob({ jobId: job.jobId, status: job.status });
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

  const startGenerateRequirements = useCallback(async () => {
    if (!selectedRoomId) return;

    setGeneratingRequirements(true);
    try {
      const job = await agentApi.generateRequirements({ roomId: selectedRoomId });
      setActiveJob({ jobId: job.jobId, status: job.status });
      setNotice(t("agent.page.generateStarted"));
    } catch (error) {
      setState({
        kind: "offline",
        message: error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("agent.page.errorGenerate"),
      });
    } finally {
      setGeneratingRequirements(false);
    }
  }, [selectedRoomId, t]);

  const checkActiveJob = useCallback(async () => {
    if (!activeJob) return;

    setCheckingJob(true);
    try {
      const job = await agentApi.getJob(activeJob.jobId);
      if (job.status === "SUCCEEDED") {
        setActiveJob(null);
        await load(selectedRoomId);
        setNotice(t("agent.page.jobDone"));
        return;
      }

      if (job.status === "FAILED" || job.status === "CANCELED") {
        setActiveJob(null);
        setNotice(job.errorMessage && job.errorMessage.trim().length > 0 ? job.errorMessage : t("agent.page.jobFailed"));
        return;
      }

      setActiveJob({ jobId: job.jobId, status: job.status });
    } catch {
      setNotice(t("agent.page.errorJobCheck"));
    } finally {
      setCheckingJob(false);
    }
  }, [activeJob, load, selectedRoomId, t]);

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
          <p className={styles.subtitle}>{t("agent.page.subtitle")}</p>
        </div>
        <div className="workspace-route__actions">
          {state.kind === "ready" ? (
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
          {notice || activeJob ? (
            <GlassPanel className="workspace-route__panel">
              <div className={styles.jobNotice}>
                {notice ? <strong>{notice}</strong> : null}
                {activeJob ? (
                  <>
                    <StatusBadge tone={activeJob.status === "RUNNING" ? "agent" : "pending"}>
                      {t("agent.page.jobStatusLabel", { status: t(jobStatusLabelKeys[activeJob.status]) })}
                    </StatusBadge>
                    <Button loading={checkingJob} onClick={() => void checkActiveJob()} size="sm" variant="quiet">
                      {t("agent.page.jobCheck")}
                    </Button>
                  </>
                ) : null}
              </div>
            </GlassPanel>
          ) : null}

          {counts ? (
            <div className={styles.counts} aria-label={t("agent.page.summaryAria")}>
              {counts.map((item) => (
                <div className={styles.countChip} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <section className="workspace-route__section" aria-labelledby="agent-suggestions-title">
            <div className="workspace-route__section-head">
              <div>
                <h2 id="agent-suggestions-title">{t("agent.page.suggestionsTitle")}</h2>
              </div>
              <span className={styles.headActions}>
                {state.selectedRoomId ? (
                  <Button
                    icon={<Wand2 size={14} strokeWidth={1.9} />}
                    loading={generatingRequirements}
                    onClick={() => void startGenerateRequirements()}
                    size="sm"
                    variant="primary"
                  >
                    {t("agent.page.generateRequirements")}
                  </Button>
                ) : null}
                <StatusBadge tone={state.suggestions.length > 0 ? "agent" : "neutral"}>{t("agent.page.suggestionsCount", { count: state.suggestions.length })}</StatusBadge>
              </span>
            </div>
            <p className={styles.sectionDesc}>{t("agent.page.suggestionsDesc")}</p>
            {state.suggestions.length === 0 ? (
              <GlassPanel className="workspace-route__panel">
                <strong>{t("agent.page.suggestionsEmpty")}</strong>
                <p className={styles.emptyDesc}>{t("agent.page.suggestionsEmptyDesc")}</p>
                <ol className={styles.howList}>
                  <li>{t("agent.page.howStep1")}</li>
                  <li>{t("agent.page.howStep2")}</li>
                  <li>{t("agent.page.howStep3")}</li>
                </ol>
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
              <div className={styles.groupList}>
                {suggestionGroups.map((group) => (
                  <div className={styles.group} key={group.key}>
                    <div className={styles.groupHead}>
                      <span>{group.label}</span>
                      <span className={styles.groupCount}>{t("agent.page.suggestionsCount", { count: group.items.length })}</span>
                    </div>
                    <div className={styles.cardList}>
                      {group.items.map((item) => {
                        const typeLabel = t(typeLabelKeys[item.suggestionType]);
                        const title = displayText(item.payloadJson, typeLabel);
                        const summary = displaySecondaryText(item.payloadJson, title);
                        const evidence = displayText(item.evidenceJson, "");
                        const disabled = updatingId === item.suggestionId || item.status !== "DRAFT";
                        const dateLabel = relativeDate(item.createdAt);
                        const sourceChip = item.resourceId
                          ? t("agent.page.sourceFile")
                          : item.roomId
                            ? t("agent.page.sourceRoom")
                            : t("agent.page.scopePersonal");

                        return (
                          <article className={styles.card} key={item.suggestionId}>
                            <div className={styles.cardTop}>
                              <strong className={styles.cardTitle}>{title}</strong>
                              <span className={styles.cardChip}>{sourceChip}</span>
                              {item.status !== "DRAFT" ? (
                                <StatusBadge tone={statusTone(item.status)}>{t(statusLabelKeys[item.status])}</StatusBadge>
                              ) : null}
                            </div>
                            {summary ? <p className={styles.cardSummary}>{summary}</p> : null}
                            {evidence ? (
                              <details className={styles.cardEvidence}>
                                <summary>
                                  <ChevronDown aria-hidden className={styles.cardEvidenceIcon} size={13} strokeWidth={2.1} />
                                  <span className={styles.cardEvidenceLine}>{t("agent.page.evidence", { text: evidence })}</span>
                                </summary>
                                <p>{evidence}</p>
                                <span className={styles.cardMeta}>{typeLabel}</span>
                              </details>
                            ) : null}
                            <div className={styles.cardFoot}>
                              <span className={styles.cardDate}>{dateLabel ?? typeLabel}</span>
                              <span className={styles.cardButtons}>
                                <Button
                                  disabled={disabled}
                                  icon={<Check aria-hidden size={14} strokeWidth={2} />}
                                  onClick={() => void review(item.suggestionId, "APPROVE")}
                                  size="sm"
                                  title={t("agent.page.approveHint")}
                                  variant="primary"
                                >
                                  {t("agent.page.approve")}
                                </Button>
                                <Button
                                  disabled={disabled}
                                  icon={<Pause aria-hidden size={14} strokeWidth={2} />}
                                  onClick={() => void review(item.suggestionId, "HOLD")}
                                  size="sm"
                                  title={t("agent.page.holdHint")}
                                  variant="quiet"
                                >
                                  {t("agent.page.hold")}
                                </Button>
                                <Button
                                  disabled={disabled}
                                  icon={<X aria-hidden size={14} strokeWidth={2} />}
                                  onClick={() => void review(item.suggestionId, "REJECT")}
                                  size="sm"
                                  title={t("agent.page.rejectHint")}
                                  variant="quiet"
                                >
                                  {t("agent.page.reject")}
                                </Button>
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className={styles.zoneHead}>
            <h2 className={styles.zoneTitle} id="agent-outputs-title">{t("agent.page.outputsTitle")}</h2>
            <p className={styles.zoneDesc}>{t("agent.page.outputsDesc")}</p>
          </div>

          <section className="workspace-route__section" aria-labelledby="daily-summary-title">
            <details className={styles.archive}>
              <summary className={styles.archiveHead}>
                <h2 className={styles.archiveTitle} id="daily-summary-title">{t("agent.page.dailyTitle")}</h2>
                <span className={styles.archiveCount}>{t("agent.page.suggestionsCount", { count: state.dailySummaries.length })}</span>
                <ChevronDown aria-hidden className={styles.archiveChevron} size={16} strokeWidth={2} />
              </summary>
              <div className={styles.archiveBody}>
                <p className={styles.sectionDesc}>{t("agent.page.dailyDesc")}</p>
                <div className={styles.archiveActions}>
                  <Button
                    icon={<Sparkles size={14} strokeWidth={1.9} />}
                    loading={startingSummaryJob}
                    onClick={() => void startDailySummary()}
                    size="sm"
                    variant="primary"
                  >
                    {t("agent.page.createTodaySummary")}
                  </Button>
                </div>
                {state.dailySummaries.length === 0 ? (
                  <p className={styles.archiveEmpty}>{t("agent.page.dailyEmpty")}</p>
                ) : (
                  <div className="workspace-route__list">
                    {state.dailySummaries.map((summary) => (
                      <article className="workspace-route__row" key={summary.id}>
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
              </div>
            </details>
          </section>

          <section className="workspace-route__section" aria-labelledby="generated-documents-title">
            <details className={styles.archive}>
              <summary className={styles.archiveHead}>
                <h2 className={styles.archiveTitle} id="generated-documents-title">{t("agent.page.generatedTitle")}</h2>
                <span className={styles.archiveCount}>{t("agent.page.suggestionsCount", { count: state.generatedDocuments.length })}</span>
                <ChevronDown aria-hidden className={styles.archiveChevron} size={16} strokeWidth={2} />
              </summary>
              <div className={styles.archiveBody}>
                <p className={styles.sectionDesc}>{t("agent.page.generatedDesc")}</p>
                {state.generatedDocuments.length === 0 ? (
                  <p className={styles.archiveEmpty}>{t("agent.page.generatedEmpty")}</p>
                ) : (
                  <div className="workspace-route__list">
                    {state.generatedDocuments.map((item) => (
                      <article className="workspace-route__row" key={item.id}>
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
              </div>
            </details>
          </section>

          {state.selectedRoomId ? (
            <section className="workspace-route__section" aria-labelledby="confirmed-requirements-title">
              <details className={styles.archive}>
                <summary className={styles.archiveHead}>
                  <h2 className={styles.archiveTitle} id="confirmed-requirements-title">{t("agent.page.confirmedTitle")}</h2>
                  <span className={styles.archiveCount}>{t("agent.page.suggestionsCount", { count: state.confirmedRequirements.length })}</span>
                  <ChevronDown aria-hidden className={styles.archiveChevron} size={16} strokeWidth={2} />
                </summary>
                <div className={styles.archiveBody}>
                  <p className={styles.sectionDesc}>{t("agent.page.confirmedDesc")}</p>
                  {state.confirmedRequirements.length === 0 ? (
                    <p className={styles.archiveEmpty}>{t("agent.page.confirmedEmpty")}</p>
                  ) : (
                    <div className="workspace-route__list">
                      {state.confirmedRequirements.map((item) => {
                        const typeLabel = t(typeLabelKeys[item.suggestionType]);
                        const dateLabel = relativeDate(item.reviewedAt ?? item.updatedAt);

                        return (
                          <article className="workspace-route__row" key={item.suggestionId}>
                            <span className="workspace-route__dot" aria-hidden="true" />
                            <span className="workspace-route__main">
                              <strong>{displayText(item.payloadJson, typeLabel)}</strong>
                              <span>{dateLabel ? t("agent.page.typeDateSeparator", { date: dateLabel, type: typeLabel }) : typeLabel}</span>
                            </span>
                            <StatusBadge tone="success">{t("agent.page.statusApprovedLabel")}</StatusBadge>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
            </section>
          ) : null}

          {state.selectedRoomId ? (
            <section className="workspace-route__section" aria-labelledby="room-memory-title">
              <details className={styles.archive}>
                <summary className={styles.archiveHead}>
                  <h2 className={styles.archiveTitle} id="room-memory-title">{t("agent.page.roomMemoryTitle")}</h2>
                  <span className={styles.archiveCount}>{t("agent.page.suggestionsCount", { count: state.roomMemorySummaries.length })}</span>
                  <ChevronDown aria-hidden className={styles.archiveChevron} size={16} strokeWidth={2} />
                </summary>
                <div className={styles.archiveBody}>
                  <p className={styles.sectionDesc}>{t("agent.page.roomMemoryDesc")}</p>
                  {state.roomMemorySummaries.length === 0 ? (
                    <p className={styles.archiveEmpty}>{t("agent.page.roomMemoryEmpty")}</p>
                  ) : (
                    <div className="workspace-route__list">
                      {state.roomMemorySummaries.map((item) => {
                        // 원시 시퀀스 번호 대신 요약 생성 시점과 대화 건수로 표시한다.
                        const memoryDateLabel = relativeDate(item.createdAt);
                        const rangeLabel = t("agent.page.memoryRangeSummary", {
                          count: Math.max(item.toSequence - item.fromSequence + 1, 1),
                        });

                        return (
                          <article className="workspace-route__row" key={item.id}>
                            <span className="workspace-route__dot" aria-hidden="true" />
                            <span className="workspace-route__main">
                              <strong>
                                {memoryDateLabel ? t("agent.page.typeDateSeparator", { date: memoryDateLabel, type: rangeLabel }) : rangeLabel}
                              </strong>
                              <span>{displayJsonText(item.summaryJson, t("agent.page.roomMemoryContentFallback"))}</span>
                            </span>
                            <StatusBadge tone={item.status === "APPROVED" ? "approved" : "pending"}>
                              {item.status === "APPROVED" ? t("agent.page.statusApproved") : t("agent.page.statusDraft")}
                            </StatusBadge>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
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
