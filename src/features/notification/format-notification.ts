import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { AgentJobType } from "@/types/api/agent";
import type { NotificationResponse } from "@/types/api/notification";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

// 백엔드가 알림 제목/본문에 "AI 작업이 완료되었습니다. jobType=ANALYZE_RESOURCE, jobId=..."처럼
// 원시 잡 메타데이터나 응답 객체를 그대로 내려주는 경우가 있다. 사용자에게는 이 기술 문자열 대신
// 잡 종류에 맞는 문구와 실제 결과 미리보기만 보여준다(백엔드가 정리되기 전까지의 프론트 방어막).
const JOB_TITLE_KEY: Record<AgentJobType, MessageKey> = {
  ANALYZE_RESOURCE: "notification.job.analyzeResource",
  GENERATE_WBS: "notification.job.generateWbs",
  GENERATE_TASKS: "notification.job.generateTasks",
  GENERATE_REQUIREMENTS: "notification.job.generateRequirements",
  REVIEW_CONTRACT_DOCUMENTS: "notification.job.reviewContract",
  GENERATE_QUESTIONS: "notification.job.generateQuestions",
  DAILY_SUMMARY: "notification.job.dailySummary",
  DOCUMENT_DRAFT: "notification.job.documentDraft",
};

const PREVIEW_TEXT_KEYS = [
  "summary",
  "description",
  "content",
  "detail",
  "body",
  "text",
  "raw",
  "sourceText",
  "analysisSummary",
  "title",
  "name",
  "label",
  "question",
  "todoTitle",
  "taskTitle",
  "action",
  "requirement",
  "value",
];

const PREVIEW_CONTAINER_KEYS = [
  "data",
  "payload",
  "payloadJson",
  "result",
  "results",
  "items",
  "candidates",
  "suggestions",
  "extracted",
  "extractedFields",
  "fields",
  "checklist",
  "risks",
  "requirements",
  "questions",
  "tasks",
  "todos",
];

const TECHNICAL_KEYS = [
  "aiDocumentId",
  "code",
  "createdAt",
  "errorCode",
  "eventType",
  "finishedAt",
  "id",
  "jobId",
  "jobType",
  "message",
  "model",
  "modelName",
  "pageCount",
  "promptVersion",
  "resourceId",
  "resourceSummaryId",
  "roomId",
  "schemaVersion",
  "sourceId",
  "startedAt",
  "status",
  "success",
  "updatedAt",
  "userId",
];

const RESPONSE_KEYS_PATTERN = [...PREVIEW_TEXT_KEYS, ...PREVIEW_CONTAINER_KEYS, ...TECHNICAL_KEYS].join("|");

// "jobType=", "agent-job-analyze-resource", "message=AI 작업..." 조각이 들어 있으면 원시 잡 응답으로 간주한다.
const RAW_JOB_PATTERN = /\bjob(?:type|id)\s*[:=]|agent-job-[a-z0-9-]+|(?:^|[,{\s])message\s*[:=]\s*AI\s*작업/i;
const JOB_TYPE_PATTERN = /jobtype\s*[:=]\s*["']?([a-z_]+)/i;
const JOB_SLUG_PATTERN = /agent-job-([a-z0-9-]+)/i;
const RESPONSE_ENVELOPE_PATTERN = /(?:^|[{,]\s*)(?:success|code|message|data|payload|result|items)\s*[:=]/i;
const BOILERPLATE_PATTERN = /(작업이\s*완료|AI\s*작업|task\s*finished|作業が完了|agent-job-|job(?:type|id)\s*[:=]|success\s*[:=]|message\s*[:=]|code\s*[:=])/i;

export function hasRawJobMetadata(notification: Pick<NotificationResponse, "title" | "body">): boolean {
  return RAW_JOB_PATTERN.test(`${notification.title ?? ""} ${notification.body ?? ""}`);
}

function looksLikeResponseEnvelope(value: string): boolean {
  const text = value.trim();
  return (/^[{[]/.test(text) && /[:=]/.test(text)) || RESPONSE_ENVELOPE_PATTERN.test(text);
}

function isReadablePreviewText(value: string): boolean {
  const text = value.trim();
  if (text.length < 2) return false;
  if (BOILERPLATE_PATTERN.test(text)) return false;
  if (/[{}[\]]/.test(text)) return false;
  if (/"\s*:/.test(text)) return false;
  if (/^[0-9a-fA-F-]{16,}$/.test(text)) return false;
  if (text.length > 12 && /^[A-Za-z0-9_.:-]+$/.test(text)) return false;
  return true;
}

function cleanPreviewText(value: string): string | null {
  const text = value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;\s]+|[,;:\s]+$/g, "")
    .trim();

  return isReadablePreviewText(text) ? text : null;
}

function pushPreviewLine(lines: string[], value: string) {
  const cleaned = cleanPreviewText(value);
  if (!cleaned || lines.includes(cleaned)) return;
  lines.push(cleaned);
}

function collectPreviewLinesFromJson(node: unknown, lines: string[], keyHint?: string) {
  if (lines.length >= 3) return;

  if (typeof node === "string") {
    if (!keyHint || PREVIEW_TEXT_KEYS.includes(keyHint)) pushPreviewLine(lines, node);
    return;
  }

  if (typeof node === "number" || typeof node === "boolean") {
    if (keyHint && PREVIEW_TEXT_KEYS.includes(keyHint)) pushPreviewLine(lines, String(node));
    return;
  }

  if (Array.isArray(node)) {
    for (const entry of node) collectPreviewLinesFromJson(entry, lines, keyHint);
    return;
  }

  if (!node || typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  const label = ["label", "name", "field", "fieldName", "title"].map((key) => record[key]).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const value = record.value;
  if (label && value !== undefined) {
    pushPreviewLine(lines, `${label}: ${String(value)}`);
  }

  for (const key of PREVIEW_TEXT_KEYS) collectPreviewLinesFromJson(record[key], lines, key);
  for (const key of PREVIEW_CONTAINER_KEYS) collectPreviewLinesFromJson(record[key], lines);
}

function collectPreviewLinesFromKeyValue(value: string, lines: string[]) {
  const keyValuePattern = new RegExp(
    `(?:^|[,{\n]\\s*)(${PREVIEW_TEXT_KEYS.join("|")})\\s*[:=]\\s*([\\s\\S]*?)(?=,\\s*(?:${RESPONSE_KEYS_PATTERN})\\s*[:=]|[}\\]]|$)`,
    "gi",
  );

  for (const match of value.matchAll(keyValuePattern)) {
    if (lines.length >= 3) break;
    pushPreviewLine(lines, match[2] ?? "");
  }
}

function formatPreviewLines(lines: string[]): string | null {
  if (lines.length === 0) return null;
  const text = lines.slice(0, 2).join(" · ");
  return text.length > 150 ? `${text.slice(0, 147).trim()}...` : text;
}

function extractResponsePreview(value: string): string | null {
  if (!looksLikeResponseEnvelope(value)) return null;

  const lines: string[] = [];
  try {
    collectPreviewLinesFromJson(JSON.parse(value), lines);
  } catch {
    collectPreviewLinesFromKeyValue(value, lines);
  }

  return formatPreviewLines(lines);
}

function resolveJobType(value: string): AgentJobType | undefined {
  const explicitType = value.match(JOB_TYPE_PATTERN)?.[1]?.toUpperCase();
  if (explicitType && explicitType in JOB_TITLE_KEY) return explicitType as AgentJobType;

  const slugType = value.match(JOB_SLUG_PATTERN)?.[1]?.replace(/-/g, "_").toUpperCase();
  if (slugType && slugType in JOB_TITLE_KEY) return slugType as AgentJobType;

  return undefined;
}

// "…, jobType=X, jobId=Y" 같은 조각을 제거해 사람이 쓴 앞머리 문장만 남긴다.
function stripRawJobMetadata(value: string): string {
  return value
    .replace(/[.,]?\s*job(?:type|id)\s*[:=]\s*[^,\n}]*/gi, "")
    .replace(/[.,]?\s*message\s*[:=]\s*AI\s*작업\s*agent-job-[^,\n}]*/gi, "")
    .replace(/agent-job-[a-z0-9-]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.,]+$/g, "")
    .trim();
}

export type FormattedNotification = { title: string; body: string | null };

/**
 * 알림의 제목/본문을 표시용으로 정리한다. 원시 잡 메타데이터가 감지되면 잡 종류에 맞는
 * 친화 문구로 대체하고, 아니면 원문을 그대로 사용한다.
 */
export function formatNotificationContent(
  t: TranslateFn,
  notification: Pick<NotificationResponse, "title" | "body">,
): FormattedNotification {
  const rawTitle = (notification.title ?? "").trim();
  const rawBody = (notification.body ?? "").trim();
  const responsePreview = extractResponsePreview(rawBody) || extractResponsePreview(rawTitle);

  if (!hasRawJobMetadata(notification)) {
    return { title: rawTitle, body: responsePreview || rawBody || null };
  }

  const combined = `${rawTitle} ${rawBody}`;
  const jobType = resolveJobType(combined);
  const titleKey = jobType ? JOB_TITLE_KEY[jobType] : "notification.job.doneTitle";

  // 원문에 잡 메타데이터를 뺀 사람이 쓴 문장이 남아 있으면 본문으로 살리고,
  // 흔한 보일러플레이트("AI 작업이 완료...")만 남으면 일반 안내 문구로 대체한다.
  const remainder = stripRawJobMetadata(rawBody) || stripRawJobMetadata(rawTitle);
  const isBoilerplate = remainder === "" || BOILERPLATE_PATTERN.test(remainder) || looksLikeResponseEnvelope(remainder);

  return {
    title: t(titleKey),
    body: responsePreview || (isBoilerplate ? t("notification.job.doneBody") : remainder),
  };
}
