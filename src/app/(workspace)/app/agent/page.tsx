"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  ListChecks,
  MessageSquareText,
  NotebookPen,
  Pause,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { StatusTone } from "@/components/ui/status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentApi } from "@/features/agent/api/agentApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged, useDataRefresh } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { useActiveProjectRoom } from "@/lib/use-active-project-room";
import { setActiveProjectRoomId } from "@/lib/workspace-active-room";
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
  RoomAiDocumentResponse,
} from "@/types/api/agent";
import type { AiDocumentStatus } from "@/types/api/resource";
import type { RoomMemorySummaryResponse } from "@/types/api/chat";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

import styles from "./page.module.css";

type AgentPageState =
  | { kind: "loading" }
  | {
      confirmedRequirements: AgentSuggestionResponse[];
      contractReferences: AgentSuggestionResponse[];
      dailySummaries: DailySummaryResponse[];
      generatedDocuments: GeneratedDocumentResponse[];
      heldSuggestions: AgentSuggestionResponse[];
      kind: "ready";
      roomAiDocuments: RoomAiDocumentResponse[];
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

// 알림 피드의 분야(모바일 알림창의 앱 아이콘처럼 항목마다 하나씩 붙는다).
type FeedCategory = "daily" | "document" | "requirement" | "schedule" | "task";

type FeedFilter = FeedCategory | "ALL" | "HELD";

type FeedItem = {
  badge: { label: string; tone: StatusTone } | null;
  body: string | null;
  category: FeedCategory;
  dailySummaryApproved: boolean;
  dailySummaryId: string | null;
  documentId: string | null;
  evidenceSource: boolean;
  evidenceText: string | null;
  expandable: boolean;
  id: string;
  kind: "aiDocument" | "confirmed" | "dailySummary" | "generatedDocument" | "held" | "memory" | "suggestion";
  roomLabel: string | null;
  sortAt: number;
  sourceLabel: string | null;
  suggestion: AgentSuggestionResponse | null;
  summary: string | null;
  timeLabel: string | null;
  title: string;
  typeTag: string;
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

// 후보 종류 → 알림 분야 매핑. 승인하면 무엇이 되는지가 분야의 기준이다.
const suggestionCategories: Record<AgentSuggestionType, FeedCategory> = {
  CONTRACT_FIELD: "requirement",
  CONTRACT_REVIEW: "requirement",
  DAILY_SUMMARY: "daily",
  DOCUMENT_DRAFT: "document",
  MEMO: "task",
  QUESTION: "requirement",
  REQUIREMENT: "requirement",
  REVIEW_ITEM: "requirement",
  SCHEDULE: "schedule",
  TASK: "task",
  TODO: "task",
  WBS: "task",
};

const categoryIcons: Record<FeedCategory, LucideIcon> = {
  daily: NotebookPen,
  document: FileText,
  requirement: ClipboardList,
  schedule: CalendarDays,
  task: ListChecks,
};

const filterLabelKeys: Record<Exclude<FeedFilter, "ALL" | "HELD">, MessageKey> = {
  daily: "agent.page.filterDaily",
  document: "agent.page.filterDocument",
  requirement: "agent.page.filterRequirement",
  schedule: "agent.page.filterSchedule",
  task: "agent.page.filterTask",
};

const statusLabelKeys: Record<AgentSuggestionStatus, MessageKey> = {
  APPROVED: "agent.page.statusApprovedLabel",
  DRAFT: "agent.page.statusDraftLabel",
  HELD: "agent.page.statusHeldLabel",
  REJECTED: "agent.page.statusRejectedLabel",
};

const aiDocumentStatusLabelKeys: Record<AiDocumentStatus, MessageKey> = {
  ANALYZED: "agent.page.aiDocStatusAnalyzed",
  ANALYZING: "agent.page.aiDocStatusAnalyzing",
  FAILED: "agent.page.aiDocStatusFailed",
  NONE: "agent.page.aiDocStatusNone",
  READY: "agent.page.aiDocStatusReady",
};

function aiDocumentStatusTone(status: AiDocumentStatus): StatusTone {
  if (status === "ANALYZED") return "approved";
  if (status === "FAILED") return "warning";
  return "pending";
}

const jobStatusLabelKeys: Record<AgentJobStatus, MessageKey> = {
  CANCELED: "agent.timeline.statusCanceled",
  FAILED: "agent.timeline.statusFailed",
  PENDING: "agent.timeline.statusPending",
  RUNNING: "agent.timeline.statusRunning",
  SUCCEEDED: "agent.timeline.statusSucceeded",
};

function statusTone(status: AgentSuggestionStatus): StatusTone {
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

// 사람이 읽을 문장인지 확인한다. JSON 조각·식별자·코드 형태는 화면에 절대 내보내지 않는다.
function isReadableSentence(value: string) {
  const text = value.trim();
  if (text.length < 2) return false;
  if (/[{}[\]]/.test(text)) return false;
  if (/"\s*:/.test(text)) return false;
  if (/^[0-9a-fA-F-]{16,}$/.test(text)) return false;
  if (text.length > 12 && /^[A-Za-z0-9_.-]+$/.test(text)) return false;
  return true;
}

// 근거(evidenceJson)에서 사람이 읽을 문장만 고른다.
// 백엔드 근거에는 sourceText(문서 인용)·analysisSummary(분석 요약) 외에
// jobId·promptVersion·modelName 같은 기술 필드가 섞여 있어 whitelist로만 추출한다.
const EVIDENCE_TEXT_KEYS = ["sourceText", "analysisSummary", "summary", "quote", "reason", "detail", "text"];

function evidenceDisplay(evidence: Record<string, unknown> | null | undefined) {
  if (!evidence || Object.keys(evidence).length === 0) return { fromSource: false, text: null as string | null };

  for (const key of EVIDENCE_TEXT_KEYS) {
    const value = evidence[key];
    if (typeof value === "string" && isReadableSentence(value)) return { fromSource: false, text: value.trim() };
    if (Array.isArray(value)) {
      const lines = value.filter((entry): entry is string => typeof entry === "string" && isReadableSentence(entry));
      if (lines.length > 0) return { fromSource: false, text: lines.slice(0, 2).join(", ") };
    }
  }

  // 읽을 문장이 없으면 원본 출처 칩으로 대체한다(중괄호·키 노출 금지).
  return { fromSource: true, text: null as string | null };
}

// JSON 문자열(하루 정리·대화 요약)에서 사람이 읽을 문장만 줄 단위로 뽑는다.
function readableJsonLines(value: string): string[] {
  const lines: string[] = [];
  const visit = (node: unknown) => {
    if (lines.length >= 8) return;
    if (typeof node === "string") {
      if (isReadableSentence(node)) lines.push(node.trim());
      return;
    }
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    if (node && typeof node === "object") {
      for (const entry of Object.values(node)) visit(entry);
    }
  };

  try {
    visit(JSON.parse(value));
  } catch {
    if (isReadableSentence(value)) lines.push(value.trim());
  }

  return lines;
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
};
const AGENT_PAGE_EVENT_SOURCE = "agent-page";

// 진행 중 AI 작업은 5초 간격으로 자동 확인한다(수동 확인 버튼은 보조 수단).
const JOB_POLL_INTERVAL_MS = 5000;

function AgentPageContent() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const { roomId: activeRoomId } = useActiveProjectRoom();
  const [state, setState] = useState<AgentPageState>({ kind: "loading" });
  const [filter, setFilter] = useState<FeedFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
  const [jobEventMessage, setJobEventMessage] = useState<string | null>(null);

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

      return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? "ko-KR", { day: "numeric", month: "short" }).format(date);
    },
    [locale, t],
  );

  const load = useCallback(async (roomId: string | null) => {
    setNotice(null);
    setSelectedDocument(null);
    setExpandedId(null);
    setState((current) => {
      if (current.kind === "ready") {
        return {
          ...current,
          confirmedRequirements: [],
          contractReferences: [],
          dailySummaries: [],
          generatedDocuments: [],
          heldSuggestions: [],
          roomAiDocuments: [],
          roomMemorySummaries: [],
          selectedRoomId: roomId,
          suggestions: [],
        };
      }
      return { kind: "loading" };
    });

    try {
      const [roomPage, suggestions, heldSuggestions, dailySummaryPage, generatedDocumentPage, roomMemorySummaries, confirmedRequirements, contractReferences, roomAiDocuments] = await Promise.all([
        projectRoomApi.list(),
        roomId ? agentApi.listRoomSuggestions(roomId, { status: "DRAFT" }) : agentApi.listPersonalSuggestions({ status: "DRAFT" }),
        // 보류한 후보도 함께 불러와 보류함 필터에서 다시 볼 수 있게 한다.
        (roomId ? agentApi.listRoomSuggestions(roomId, { status: "HELD" }) : agentApi.listPersonalSuggestions({ status: "HELD" })).catch(
          (error: unknown) => {
            if (error instanceof ApiClientError && error.status === 401) throw error;
            return [] as AgentSuggestionResponse[];
          },
        ),
        agentApi.listDailySummaries(),
        roomId ? agentApi.listRoomGeneratedDocuments(roomId) : agentApi.listGeneratedDocuments(),
        roomId ? chatApi.listRoomMemorySummaries(roomId) : Promise.resolve([]),
        roomId
          ? agentApi.listRoomConfirmedRequirements(roomId).catch((error: unknown) => {
              if (error instanceof ApiClientError && error.status === 401) throw error;
              return [] as AgentSuggestionResponse[];
            })
          : Promise.resolve([] as AgentSuggestionResponse[]),
        // 승인된 계약 근거(계약 필드·계약 검토)도 함께 불러와 피드에서 다시 찾을 수 있게 한다.
        roomId
          ? agentApi.listRoomContractReferences(roomId).catch((error: unknown) => {
              if (error instanceof ApiClientError && error.status === 401) throw error;
              return [] as AgentSuggestionResponse[];
            })
          : Promise.resolve([] as AgentSuggestionResponse[]),
        roomId
          ? agentApi
              .listRoomAiDocuments(roomId)
              .then((page) => page.items)
              .catch((error: unknown) => {
                if (error instanceof ApiClientError && error.status === 401) throw error;
                return [] as RoomAiDocumentResponse[];
              })
          : Promise.resolve([] as RoomAiDocumentResponse[]),
      ]);
      const selectedRoom = roomId ? roomPage.items.find((room) => room.id === roomId) : null;
      if (selectedRoom) {
        setActiveProjectRoomId(selectedRoom.id, selectedRoom.name);
      }

      setState({
        confirmedRequirements,
        contractReferences,
        dailySummaries: dailySummaryPage.items,
        generatedDocuments: generatedDocumentPage.items,
        heldSuggestions,
        kind: "ready",
        roomAiDocuments,
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
          contractReferences: [],
          dailySummaries: [],
          generatedDocuments: [],
          heldSuggestions: [],
          kind: "ready",
          roomAiDocuments: [],
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
    const initialRoomId = searchParams.get("roomId") ?? activeRoomId;
    const timeoutId = window.setTimeout(() => {
      void load(initialRoomId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeRoomId, load, searchParams]);

  const refreshAgent = useCallback(() => {
    const roomId = state.kind === "ready" ? state.selectedRoomId : searchParams.get("roomId") ?? activeRoomId;
    void load(roomId);
  }, [activeRoomId, load, searchParams, state]);

  useDataRefresh({ domains: ["agent"], ignoreSource: AGENT_PAGE_EVENT_SOURCE, onRefresh: refreshAgent });

  // 화면의 모든 항목을 알림 피드 하나로 합친다(최신순).
  const feedItems = useMemo<FeedItem[]>(() => {
    if (state.kind !== "ready") return [];

    const roomLabelOf = (roomId: string | null) =>
      roomId ? state.rooms.find((room) => room.id === roomId)?.name ?? t("agent.page.groupUnknownRoom") : null;

    const sourceLabelOf = (suggestion: AgentSuggestionResponse) =>
      suggestion.resourceId
        ? t("agent.page.sourceFile")
        : suggestion.roomId
          ? t("agent.page.sourceRoom")
          : t("agent.page.scopePersonal");

    const items: FeedItem[] = [];

    for (const suggestion of state.suggestions) {
      const typeLabel = t(typeLabelKeys[suggestion.suggestionType]);
      const title = displayText(suggestion.payloadJson, typeLabel);
      const evidence = evidenceDisplay(suggestion.evidenceJson);

      items.push({
        badge: suggestion.status === "DRAFT" ? null : { label: t(statusLabelKeys[suggestion.status]), tone: statusTone(suggestion.status) },
        body: null,
        category: suggestionCategories[suggestion.suggestionType],
        dailySummaryApproved: false,
        dailySummaryId: null,
        documentId: null,
        evidenceSource: evidence.fromSource,
        evidenceText: evidence.text,
        expandable: false,
        id: `suggestion-${suggestion.suggestionId}`,
        kind: "suggestion",
        roomLabel: state.selectedRoomId ? null : roomLabelOf(suggestion.roomId),
        sortAt: Date.parse(suggestion.createdAt) || 0,
        sourceLabel: sourceLabelOf(suggestion),
        suggestion,
        summary: displaySecondaryText(suggestion.payloadJson, title),
        timeLabel: relativeDate(suggestion.createdAt),
        title,
        // 승인하면 무엇이 되는지를 카드에서 바로 보여주는 태그.
        typeTag: t("agent.page.becomes", { type: typeLabel }),
      });
    }

    for (const confirmed of state.confirmedRequirements) {
      const typeLabel = t(typeLabelKeys[confirmed.suggestionType]);
      const confirmedAt = confirmed.reviewedAt ?? confirmed.updatedAt;

      items.push({
        badge: { label: t("agent.page.statusApprovedLabel"), tone: "success" },
        body: null,
        category: "requirement",
        dailySummaryApproved: false,
        dailySummaryId: null,
        documentId: null,
        evidenceSource: false,
        evidenceText: null,
        expandable: false,
        id: `confirmed-${confirmed.suggestionId}`,
        kind: "confirmed",
        roomLabel: null,
        sortAt: Date.parse(confirmedAt) || 0,
        sourceLabel: null,
        suggestion: null,
        summary: null,
        timeLabel: relativeDate(confirmedAt),
        title: displayText(confirmed.payloadJson, typeLabel),
        typeTag: typeLabel,
      });
    }

    // 승인된 계약 근거(계약 필드·계약 검토) — 승인 뒤에도 피드에서 근거를 다시 확인할 수 있다.
    for (const reference of state.contractReferences) {
      const typeLabel = t(typeLabelKeys[reference.suggestionType]);
      const referencedAt = reference.reviewedAt ?? reference.updatedAt;
      const title = displayText(reference.payloadJson, typeLabel);
      const evidence = evidenceDisplay(reference.evidenceJson);

      items.push({
        badge: { label: t("agent.page.statusApprovedLabel"), tone: "success" },
        body: null,
        category: "requirement",
        dailySummaryApproved: false,
        dailySummaryId: null,
        documentId: null,
        evidenceSource: evidence.fromSource,
        evidenceText: evidence.text,
        expandable: false,
        id: `contract-${reference.suggestionId}`,
        kind: "confirmed",
        roomLabel: null,
        sortAt: Date.parse(referencedAt) || 0,
        sourceLabel: t("agent.page.tagContractReference"),
        suggestion: null,
        summary: displaySecondaryText(reference.payloadJson, title),
        timeLabel: relativeDate(referencedAt),
        title,
        typeTag: typeLabel,
      });
    }

    for (const summary of state.dailySummaries) {
      const lines = readableJsonLines(summary.summaryJson);

      items.push({
        badge: {
          label: summary.status === "APPROVED" ? t("agent.page.statusApproved") : t("agent.page.statusDraft"),
          tone: summary.status === "APPROVED" ? "approved" : "pending",
        },
        body: lines.length > 1 ? lines.join("\n") : null,
        category: "daily",
        dailySummaryApproved: summary.status === "APPROVED",
        dailySummaryId: summary.id,
        documentId: null,
        evidenceSource: false,
        evidenceText: null,
        expandable: lines.length > 1,
        id: `daily-${summary.id}`,
        kind: "dailySummary",
        roomLabel: null,
        sortAt: Date.parse(summary.createdAt) || Date.parse(summary.summaryDate) || 0,
        sourceLabel: null,
        suggestion: null,
        summary: lines[0] ?? t("agent.page.dailyContentFallback"),
        timeLabel: relativeDate(summary.createdAt),
        title: summary.summaryDate,
        typeTag: t("agent.page.filterDaily"),
      });
    }

    for (const document of state.generatedDocuments) {
      items.push({
        badge: null,
        body: null,
        category: "document",
        dailySummaryApproved: false,
        dailySummaryId: null,
        documentId: document.id,
        evidenceSource: false,
        evidenceText: null,
        expandable: true,
        id: `document-${document.id}`,
        kind: "generatedDocument",
        roomLabel: null,
        sortAt: Date.parse(document.updatedAt) || Date.parse(document.createdAt) || 0,
        sourceLabel: null,
        suggestion: null,
        summary: document.documentType,
        timeLabel: relativeDate(document.updatedAt || document.createdAt),
        title: document.title,
        typeTag: t("agent.page.tagGeneratedDocument"),
      });
    }

    for (const aiDocument of state.roomAiDocuments) {
      const confidence =
        typeof aiDocument.detectedConfidence === "number"
          ? t("agent.page.aiDocsConfidence", { percent: Math.round(aiDocument.detectedConfidence * 100) })
          : null;

      items.push({
        badge: { label: t(aiDocumentStatusLabelKeys[aiDocument.status]), tone: aiDocumentStatusTone(aiDocument.status) },
        body: null,
        category: "document",
        dailySummaryApproved: false,
        dailySummaryId: null,
        documentId: null,
        evidenceSource: false,
        evidenceText: null,
        expandable: false,
        id: `aidoc-${aiDocument.id}`,
        kind: "aiDocument",
        roomLabel: null,
        sortAt: Date.parse(aiDocument.updatedAt) || 0,
        sourceLabel: null,
        suggestion: null,
        summary: confidence,
        timeLabel: relativeDate(aiDocument.updatedAt),
        title: aiDocument.documentType?.trim() || t("agent.page.aiDocsTypeFallback"),
        typeTag: t("agent.page.tagAiDocument"),
      });
    }

    for (const memory of state.roomMemorySummaries) {
      const lines = readableJsonLines(memory.summaryJson);

      items.push({
        badge: {
          label: memory.status === "APPROVED" ? t("agent.page.statusApproved") : t("agent.page.statusDraft"),
          tone: memory.status === "APPROVED" ? "approved" : "pending",
        },
        body: lines.length > 1 ? lines.join("\n") : null,
        category: "daily",
        dailySummaryApproved: false,
        dailySummaryId: null,
        documentId: null,
        evidenceSource: false,
        evidenceText: null,
        expandable: lines.length > 1,
        id: `memory-${memory.id}`,
        kind: "memory",
        roomLabel: null,
        sortAt: Date.parse(memory.createdAt) || 0,
        sourceLabel: null,
        suggestion: null,
        summary: lines[0] ?? t("agent.page.roomMemoryContentFallback"),
        timeLabel: relativeDate(memory.createdAt),
        title: t("agent.page.memoryRangeSummary", { count: Math.max(memory.toSequence - memory.fromSequence + 1, 1) }),
        typeTag: t("agent.page.tagMemory"),
      });
    }

    return items.sort((a, b) => b.sortAt - a.sortAt);
  }, [relativeDate, state, t]);

  // 보류한 후보는 보류함 필터를 눌렀을 때만 보여준다.
  const heldItems = useMemo<FeedItem[]>(() => {
    if (state.kind !== "ready") return [];

    return state.heldSuggestions
      .map((suggestion): FeedItem => {
        const typeLabel = t(typeLabelKeys[suggestion.suggestionType]);
        const heldAt = suggestion.reviewedAt ?? suggestion.updatedAt;
        const title = displayText(suggestion.payloadJson, typeLabel);

        return {
          badge: { label: t("agent.page.statusHeldLabel"), tone: "warning" },
          body: null,
          category: suggestionCategories[suggestion.suggestionType],
          dailySummaryApproved: false,
          dailySummaryId: null,
          documentId: null,
          evidenceSource: false,
          evidenceText: null,
          expandable: false,
          id: `held-${suggestion.suggestionId}`,
          kind: "held",
          roomLabel: null,
          sortAt: Date.parse(heldAt) || 0,
          sourceLabel: null,
          suggestion: null,
          summary: displaySecondaryText(suggestion.payloadJson, title),
          timeLabel: relativeDate(heldAt),
          title,
          typeTag: typeLabel,
        };
      })
      .sort((a, b) => b.sortAt - a.sortAt);
  }, [relativeDate, state, t]);

  const filterChips = useMemo(() => {
    const countOf = (category: FeedCategory) => feedItems.filter((item) => item.category === category).length;
    const categories: FeedCategory[] = ["requirement", "task", "schedule", "document", "daily"];

    return [
      { count: feedItems.length, key: "ALL" as FeedFilter, label: t("agent.page.filterAll") },
      ...categories.map((category) => ({ count: countOf(category), key: category as FeedFilter, label: t(filterLabelKeys[category]) })),
      { count: heldItems.length, key: "HELD" as FeedFilter, label: t("agent.page.filterHeld") },
    ];
  }, [feedItems, heldItems, t]);

  const visibleItems = useMemo(() => {
    if (filter === "HELD") return heldItems;
    if (filter === "ALL") return feedItems;
    return feedItems.filter((item) => item.category === filter);
  }, [feedItems, filter, heldItems]);

  // 카드가 목록에서 사라진 뒤에도 무슨 일이 일어났는지 알 수 있게 처리 결과를 안내한다.
  const reviewNoticeKeys: Record<"APPROVE" | "HOLD" | "REJECT", MessageKey> = useMemo(
    () => ({
      APPROVE: "agent.page.reviewApprovedNotice",
      HOLD: "agent.page.reviewHeldNotice",
      REJECT: "agent.page.reviewRejectedNotice",
    }),
    [],
  );

  const review = useCallback(async (suggestionId: string, action: "APPROVE" | "HOLD" | "REJECT") => {
    setUpdatingId(suggestionId);

    try {
      await agentApi.updateSuggestion(suggestionId, { action });
      await load(selectedRoomId);
      notifyDataChanged("agent", { source: AGENT_PAGE_EVENT_SOURCE });
      setNotice(t(reviewNoticeKeys[action]));
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
      setNotice(t(reviewNoticeKeys[action]));
    } finally {
      setUpdatingId(null);
    }
  }, [load, reviewNoticeKeys, selectedRoomId, t]);

  const approveDailySummary = useCallback(async (summaryId: string) => {
    setDailyUpdatingId(summaryId);
    try {
      await agentApi.updateDailySummary(summaryId, { action: "APPROVE" });
      await load(selectedRoomId);
      notifyDataChanged("agent", { source: AGENT_PAGE_EVENT_SOURCE });
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
      setJobEventMessage(null);
      notifyDataChanged("agent", { source: AGENT_PAGE_EVENT_SOURCE });
      setNotice(t("agent.page.summaryStarted"));
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
      setJobEventMessage(null);
      notifyDataChanged("agent", { source: AGENT_PAGE_EVENT_SOURCE });
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
    if (!activeJob || checkingJob) return;

    setCheckingJob(true);
    try {
      const job = await agentApi.getJob(activeJob.jobId);
      if (job.status === "SUCCEEDED") {
        setActiveJob(null);
        setJobEventMessage(null);
        await load(selectedRoomId);
        setNotice(t("agent.page.jobDone"));
        return;
      }

      if (job.status === "FAILED" || job.status === "CANCELED") {
        setActiveJob(null);
        setJobEventMessage(null);
        setNotice(job.errorMessage && job.errorMessage.trim().length > 0 ? job.errorMessage : t("agent.page.jobFailed"));
        return;
      }

      setActiveJob({ jobId: job.jobId, status: job.status });

      // 아직 진행 중이면 최근 작업 이벤트 한 줄을 같이 보여준다(무슨 단계인지 안내).
      // 백엔드는 이벤트를 createdAt 오름차순으로 주므로 뒤에서부터 메시지를 찾는다.
      try {
        const eventPage = await agentApi.getJobEvents(job.jobId);
        const latest = [...eventPage.items]
          .reverse()
          .find((event) => typeof event.message === "string" && event.message.trim().length > 0);
        setJobEventMessage(latest?.message?.trim() ?? null);
      } catch {
        setJobEventMessage(null);
      }
    } catch {
      setNotice(t("agent.page.errorJobCheck"));
    } finally {
      setCheckingJob(false);
    }
  }, [activeJob, checkingJob, load, selectedRoomId, t]);

  // 진행 중 작업은 주기적으로 자동 확인해 "확인 버튼만 누르다 끝나는" 흐름을 없앤다.
  useEffect(() => {
    if (!activeJob) return;

    const intervalId = window.setInterval(() => {
      void checkActiveJob();
    }, JOB_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [activeJob, checkActiveJob]);

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
    <section className={`workspace-route ${styles.page}`} aria-labelledby="agent-title">
      <header className={`workspace-route__header ${styles.header}`}>
        <div>
          <h1 id="agent-title">{t("agent.page.title")}</h1>
          <p className={styles.subtitle}>{t("agent.page.subtitle")}</p>
        </div>
        {state.kind === "ready" ? (
          // 생성 버튼은 후보를 만드는 입구이므로 목록이 아니라 헤더에 함께 둔다.
          <div className={`workspace-route__actions ${styles.headerActions}`}>
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
            {state.selectedRoomId ? (
              <Button
                icon={<Wand2 size={14} strokeWidth={1.9} />}
                loading={generatingRequirements}
                onClick={() => void startGenerateRequirements()}
                size="sm"
                variant="secondary"
              >
                {t("agent.page.generateRequirements")}
              </Button>
            ) : null}
            <Button
              icon={<Sparkles size={14} strokeWidth={1.9} />}
              loading={startingSummaryJob}
              onClick={() => void startDailySummary()}
              size="sm"
              variant="secondary"
            >
              {t("agent.page.createTodaySummary")}
            </Button>
          </div>
        ) : null}
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
            <GlassPanel className={`workspace-route__panel ${styles.noticePanel}`}>
              {/* 처리 결과·작업 진행은 화면리더에도 바로 전달한다. */}
              <div aria-live="polite" className={styles.jobNotice} role="status">
                {notice ? <strong>{notice}</strong> : null}
                {activeJob ? (
                  <>
                    <StatusBadge tone={activeJob.status === "RUNNING" ? "agent" : "pending"}>
                      {t("agent.page.jobStatusLabel", { status: t(jobStatusLabelKeys[activeJob.status]) })}
                    </StatusBadge>
                    {jobEventMessage ? (
                      <span className={styles.jobEventLine}>{t("agent.page.jobLatestEvent", { message: jobEventMessage })}</span>
                    ) : null}
                    <Button loading={checkingJob} onClick={() => void checkActiveJob()} size="sm" variant="quiet">
                      {t("agent.page.jobCheck")}
                    </Button>
                  </>
                ) : null}
              </div>
            </GlassPanel>
          ) : null}

          {/* 알림 카테고리처럼 분야 칩으로만 나눈다(단락 제목 없음). */}
          <div aria-label={t("agent.page.filterAria")} className={styles.filters} role="group">
            {filterChips.map((chip) => (
              <button
                aria-pressed={filter === chip.key}
                className={styles.filterChip}
                data-active={filter === chip.key ? "true" : undefined}
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                type="button"
              >
                <span>{chip.label}</span>
                <span className={styles.filterCount}>{chip.count}</span>
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            filter === "ALL" ? (
              <GlassPanel className={`workspace-route__panel ${styles.emptyPanel}`}>
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
              <p className={styles.filterEmpty}>{filter === "HELD" ? t("agent.page.heldEmpty") : t("agent.page.filterEmpty")}</p>
            )
          ) : (
            <div aria-label={t("agent.page.feedAria")} className={styles.feed}>
              {visibleItems.map((item) => {
                const Icon = item.kind === "memory" ? MessageSquareText : categoryIcons[item.category];
                const expanded = expandedId === item.id;
                const reviewable = item.kind === "suggestion" && item.suggestion?.status === "DRAFT";
                const reviewBusy = item.suggestion ? updatingId === item.suggestion.suggestionId : false;
                const documentOpen = item.kind === "generatedDocument" && selectedDocument?.id === item.documentId;

                return (
                  <article className={styles.row} key={item.id}>
                    <span aria-hidden className={styles.iconTile} data-category={item.category}>
                      <Icon size={17} strokeWidth={2} />
                    </span>
                    <div className={styles.rowMain}>
                      <div className={styles.rowTop}>
                        {item.kind === "generatedDocument" && item.documentId ? (
                          // 생성 문서는 제목을 누르면 본문 미리보기가 열린다.
                          <button
                            aria-expanded={documentOpen}
                            className={styles.rowTitleButton}
                            disabled={openingDocumentId === item.documentId}
                            onClick={() => (documentOpen ? setSelectedDocument(null) : void openDocument(item.documentId ?? ""))}
                            type="button"
                          >
                            <strong className={styles.rowTitle}>{item.title}</strong>
                            <ChevronDown aria-hidden className={styles.rowChevron} data-open={documentOpen ? "true" : undefined} size={14} strokeWidth={2.1} />
                          </button>
                        ) : item.expandable ? (
                          <button
                            aria-expanded={expanded}
                            className={styles.rowTitleButton}
                            onClick={() => setExpandedId(expanded ? null : item.id)}
                            type="button"
                          >
                            <strong className={styles.rowTitle}>{item.title}</strong>
                            <ChevronDown aria-hidden className={styles.rowChevron} data-open={expanded ? "true" : undefined} size={14} strokeWidth={2.1} />
                          </button>
                        ) : (
                          <strong className={styles.rowTitle}>{item.title}</strong>
                        )}
                        {item.timeLabel ? <span className={styles.rowTime}>{item.timeLabel}</span> : null}
                      </div>
                      {expanded && item.body ? (
                        <p className={styles.rowBody}>{item.body}</p>
                      ) : item.summary ? (
                        <p className={styles.rowSummary}>{item.summary}</p>
                      ) : null}
                      {item.evidenceText ? (
                        <p className={styles.rowEvidence}>{t("agent.page.evidenceLine", { text: item.evidenceText })}</p>
                      ) : item.evidenceSource ? (
                        <span className={styles.rowEvidenceChip}>{t("agent.page.evidenceSource")}</span>
                      ) : null}
                      <div className={styles.rowMeta}>
                        <span className={styles.rowTags}>
                          <span className={styles.tag} data-category={item.category}>
                            {item.typeTag}
                          </span>
                          {item.sourceLabel ? <span className={styles.tagPlain}>{item.sourceLabel}</span> : null}
                          {item.roomLabel ? <span className={styles.tagPlain}>{item.roomLabel}</span> : null}
                          {item.badge ? <StatusBadge tone={item.badge.tone}>{item.badge.label}</StatusBadge> : null}
                        </span>
                        {reviewable && item.suggestion ? (
                          <span className={styles.rowActions}>
                            <Button
                              disabled={reviewBusy}
                              icon={<Check aria-hidden size={14} strokeWidth={2} />}
                              onClick={() => void review(item.suggestion?.suggestionId ?? "", "APPROVE")}
                              size="sm"
                              title={t("agent.page.approveHint")}
                              variant="primary"
                            >
                              {t("agent.page.approve")}
                            </Button>
                            <Button
                              disabled={reviewBusy}
                              icon={<Pause aria-hidden size={14} strokeWidth={2} />}
                              onClick={() => void review(item.suggestion?.suggestionId ?? "", "HOLD")}
                              size="sm"
                              title={t("agent.page.holdHint")}
                              variant="quiet"
                            >
                              {t("agent.page.hold")}
                            </Button>
                            <Button
                              disabled={reviewBusy}
                              icon={<X aria-hidden size={14} strokeWidth={2} />}
                              onClick={() => void review(item.suggestion?.suggestionId ?? "", "REJECT")}
                              size="sm"
                              title={t("agent.page.rejectHint")}
                              variant="quiet"
                            >
                              {t("agent.page.reject")}
                            </Button>
                          </span>
                        ) : null}
                        {item.kind === "dailySummary" && item.dailySummaryId ? (
                          <span className={styles.rowActions}>
                            <Button
                              disabled={item.dailySummaryApproved}
                              loading={dailyUpdatingId === item.dailySummaryId}
                              onClick={() => void approveDailySummary(item.dailySummaryId ?? "")}
                              size="sm"
                              variant="quiet"
                            >
                              {t("agent.page.approve")}
                            </Button>
                          </span>
                        ) : null}
                        {item.kind === "generatedDocument" && item.documentId ? (
                          <span className={styles.rowActions}>
                            <Button
                              icon={<Download aria-hidden size={14} strokeWidth={1.9} />}
                              loading={exportingDocumentId === item.documentId}
                              onClick={() => void exportDocument(item.documentId ?? "")}
                              size="sm"
                              variant="quiet"
                            >
                              {t("agent.page.export")}
                            </Button>
                          </span>
                        ) : null}
                      </div>
                      {documentOpen && selectedDocument ? (
                        <div className={styles.docPreview}>
                          <div className={styles.docPreviewHead}>
                            <span>{selectedDocument.documentType}</span>
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
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
