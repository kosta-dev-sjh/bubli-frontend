import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { AgentJobType } from "@/types/api/agent";
import type { NotificationResponse } from "@/types/api/notification";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

// 백엔드가 알림 제목/본문에 "AI 작업이 완료되었습니다. jobType=ANALYZE_RESOURCE, jobId=..."처럼
// 원시 잡 메타데이터나 응답 객체를 그대로 내려주는 경우가 있다. 사용자에게는 이 기술 문자열 대신
// 잡 종류에 맞는 문구와 실제 결과 미리보기만 보여준다(백엔드가 정리되기 전까지의 프론트 방어막).
const JOB_TITLE_KEY: Record<AgentJobType, MessageKey> = {
  ANALYZE_RESOURCE: "notification.job.analyzeResource",
  DAILY_SUMMARY: "notification.job.dailySummary",
  DOCUMENT_DRAFT: "notification.job.documentDraft",
  GENERATE_QUESTIONS: "notification.job.generateQuestions",
  GENERATE_REQUIREMENTS: "notification.job.generateRequirements",
  GENERATE_TASKS: "notification.job.generateTasks",
  GENERATE_WBS: "notification.job.generateWbs",
  REVIEW_CONTRACT_DOCUMENTS: "notification.job.reviewContract",
};

const JOB_FAILED_TITLE_KEY: Partial<Record<AgentJobType, MessageKey>> = {
  ANALYZE_RESOURCE: "notification.job.analyzeResourceFailed",
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
  "filename",
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
  "resourceName",
  "resourceSummaryId",
  "resourceTitle",
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
const RESOURCE_TITLE_KEYS = ["resourceTitle", "resourceName", "filename", "fileName", "originalName"] as const;
const RESOURCE_TITLE_HINT_KEYS = ["label", "name", "title"] as const;
const RESOURCE_TITLE_KEY_PATTERN = new RegExp(
  `(?:^|[,{\n]\\s*)["']?(${[...RESOURCE_TITLE_KEYS, ...RESOURCE_TITLE_HINT_KEYS].join("|")})["']?\\s*[:=]\\s*([\\s\\S]*?)(?=,\\s*["']?(?:${RESPONSE_KEYS_PATTERN}|${RESOURCE_TITLE_KEYS.join("|")}|${RESOURCE_TITLE_HINT_KEYS.join("|")})["']?\\s*[:=]|[}\\]\n]|$)`,
  "gi",
);
const RESOURCE_FILE_NAME_PATTERN = /(?:^|[\s"'([{=:])([^,;:{}"'`<>]+?\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|hwp|hwpx|png|jpe?g|gif|webp|zip))(?:\s*[:：,;)\]}]|$)/i;

// "jobType=", "agent-job-analyze-resource", "message=AI 작업..." 조각이 들어 있으면 원시 잡 응답으로 간주한다.
const RAW_JOB_PATTERN = /\bjob(?:type|id)\s*[:=]|agent-job-[a-z0-9-]+|(?:^|[,{\s])message\s*[:=]\s*AI\s*작업/i;
const JOB_TYPE_PATTERN = /jobtype\s*[:=]\s*["']?([a-z_]+)/i;
const JOB_SLUG_PATTERN = /agent-job-([a-z0-9-]+)/i;
const JOB_METADATA_FIELD_PATTERN =
  /(?:^|[,\s.;{])\s*["']?(?:jobtype|jobid|resourcetitle|resourcename|filename|message)["']?\s*[:=]\s*.*?(?=(?:[,\s.;]+["']?(?:jobtype|jobid|resourcetitle|resourcename|filename|message)["']?\s*[:=])|[}\]]|$)/gi;
const JOB_METADATA_KEY_PATTERN = /\b(jobtype|jobid|resourcetitle|resourcename|filename|message)\s*[:=]/gi;
const JOB_FAILED_PATTERN = /(실패|오류|에러|failed|failure|fail|error|exception|失敗|エラー)/i;
const RESPONSE_ENVELOPE_PATTERN = /(?:^|[{,]\s*)(?:success|code|message|data|payload|result|items)\s*[:=]/i;
const JOB_BOILERPLATE_PATTERN =
  /(작업(?:\s*실행)?이\s*(완료|실패)|AI\s*작업|ai\s*(?:job|task)\s*(?:completed|finished|failed)|agent\s*job\s*execution\s*(?:completed|failed)|作業が(?:完了|失敗)|ジョブ.*(?:完了|失敗)|agent-job-|job(?:type|id)\s*[:=]|success\s*[:=]|message\s*[:=]|code\s*[:=])/i;
const JOB_TEXT_HINTS: Array<[AgentJobType, RegExp]> = [
  ["ANALYZE_RESOURCE", /(자료\s*분석|material\s*analysis|resource\s*analysis|analy[sz]e\s*resource|資料分析)/i],
  ["GENERATE_WBS", /\bWBS\b/i],
  ["GENERATE_TASKS", /(할\s*일|task\s*candidate|tasks?\s*(?:generated|ready)|タスク)/i],
  ["GENERATE_REQUIREMENTS", /(요구사항|requirements?|要件)/i],
  ["REVIEW_CONTRACT_DOCUMENTS", /(문서\s*검토|계약(?:서)?\s*검토|contract\s*review|document\s*review|契約|文書レビュー)/i],
  ["GENERATE_QUESTIONS", /(질문|questions?|質問)/i],
  ["DAILY_SUMMARY", /(하루\s*정리|daily\s*summary|一日のまとめ)/i],
  ["DOCUMENT_DRAFT", /(문서\s*초안|document\s*draft|draft\s*document|文書の下書き)/i],
];

type JobMetadata = Partial<Record<"filename" | "jobid" | "jobtype" | "message" | "resourcename" | "resourcetitle", string>>;
type NotificationSourceType = NotificationResponse["sourceType"];

const NOTIFICATION_INBOX_EXCLUDED_SOURCE_TYPES = new Set<NotificationSourceType>([
  "MESSAGE",
  "VOICE_CALL",
  "VOICE_CALL_CANCELED",
  "VOICE_CALL_DECLINED",
]);

export function hasRawJobMetadata(notification: Pick<NotificationResponse, "title" | "body">): boolean {
  return RAW_JOB_PATTERN.test(`${notification.title ?? ""} ${notification.body ?? ""}`);
}

function hasUserFacingRawJobMetadata(notification: Pick<NotificationResponse, "title" | "body">): boolean {
  const combined = `${notification.title ?? ""} ${notification.body ?? ""}`;
  return Boolean(resolveJobType(combined, parseJobMetadata(combined)));
}

export function isDisplayableNotification(
  notification: Pick<NotificationResponse, "body" | "status" | "title">,
): boolean {
  return notification.status !== "ARCHIVED" && (!hasRawJobMetadata(notification) || hasUserFacingRawJobMetadata(notification));
}

export function isDisplayableUnreadNotification(
  notification: Pick<NotificationResponse, "body" | "status" | "title">,
): boolean {
  return notification.status === "UNREAD" && isDisplayableNotification(notification);
}

export function isNotificationInboxItem(
  notification: Pick<NotificationResponse, "body" | "sourceType" | "status" | "title">,
): boolean {
  return isDisplayableNotification(notification) && !NOTIFICATION_INBOX_EXCLUDED_SOURCE_TYPES.has(notification.sourceType);
}

export function isUnreadNotificationInboxItem(
  notification: Pick<NotificationResponse, "body" | "sourceType" | "status" | "title">,
): boolean {
  return notification.status === "UNREAD" && isNotificationInboxItem(notification);
}

function looksLikeResponseEnvelope(value: string): boolean {
  const text = value.trim();
  return (/^[{[]/.test(text) && /[:=]/.test(text)) || RESPONSE_ENVELOPE_PATTERN.test(text);
}

function isReadablePreviewText(value: string): boolean {
  const text = value.trim();
  if (text.length < 2) return false;
  if (JOB_BOILERPLATE_PATTERN.test(text)) return false;
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

function looksLikeResourceFileName(value: string): boolean {
  return /\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|hwp|hwpx|png|jpe?g|gif|webp|zip)\b/i.test(value);
}

function cleanResourceTitle(value: string): string | null {
  const inlineFileName = value.match(RESOURCE_FILE_NAME_PATTERN)?.[1];
  const text = (inlineFileName ?? value)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.:;\s]+|[,;:\s]+$/g, "")
    .trim();

  if (!text || JOB_BOILERPLATE_PATTERN.test(text) || looksLikeResponseEnvelope(text)) return null;

  const shortText = text.length > 150 ? `${text.slice(0, 147).trim()}...` : text;
  return cleanPreviewText(shortText);
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

function collectResourceTitleFromJson(node: unknown): string | null {
  if (typeof node === "string") {
    const fileName = node.match(RESOURCE_FILE_NAME_PATTERN)?.[1];
    return fileName ? cleanResourceTitle(fileName) : null;
  }

  if (Array.isArray(node)) {
    for (const entry of node) {
      const title = collectResourceTitleFromJson(entry);
      if (title) return title;
    }
    return null;
  }

  if (!node || typeof node !== "object") return null;

  const record = node as Record<string, unknown>;

  for (const key of RESOURCE_TITLE_KEYS) {
    const value = record[key];
    if (typeof value === "string") {
      const title = cleanResourceTitle(value);
      if (title) return title;
    }
  }

  for (const key of RESOURCE_TITLE_HINT_KEYS) {
    const value = record[key];
    if (typeof value === "string" && looksLikeResourceFileName(value)) {
      const title = cleanResourceTitle(value);
      if (title) return title;
    }
  }

  for (const key of PREVIEW_CONTAINER_KEYS) {
    const title = collectResourceTitleFromJson(record[key]);
    if (title) return title;
  }

  return null;
}

function collectResourceTitleFromKeyValue(value: string): string | null {
  for (const match of value.matchAll(RESOURCE_TITLE_KEY_PATTERN)) {
    const key = match[1] ?? "";
    const rawValue = match[2] ?? "";
    if (RESOURCE_TITLE_HINT_KEYS.includes(key as (typeof RESOURCE_TITLE_HINT_KEYS)[number]) && !looksLikeResourceFileName(rawValue)) {
      continue;
    }

    const title = cleanResourceTitle(rawValue);
    if (title) return title;
  }

  return null;
}

function extractResourceTitle(value: string): string | null {
  const text = value.trim();
  if (!text) return null;

  if (looksLikeResponseEnvelope(text)) {
    try {
      const title = collectResourceTitleFromJson(JSON.parse(text));
      if (title) return title;
    } catch {
      const title = collectResourceTitleFromKeyValue(text);
      if (title) return title;
    }
  }

  const keyValueTitle = collectResourceTitleFromKeyValue(text);
  if (keyValueTitle) return keyValueTitle;

  return cleanResourceTitle(text.match(RESOURCE_FILE_NAME_PATTERN)?.[1] ?? "");
}

function normalizeMetadataValue(value?: string): string {
  return (value ?? "")
    .replace(/^[\s,;:.]+/g, "")
    .replace(/[\s,;.]+$/g, "")
    .trim();
}

function parseJobMetadata(value: string): JobMetadata {
  const matches = Array.from(value.matchAll(JOB_METADATA_KEY_PATTERN));
  const metadata: JobMetadata = {};

  matches.forEach((match, index) => {
    const key = match[1]?.toLowerCase() as keyof JobMetadata | undefined;
    if (!key || metadata[key]) return;

    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? value.length;
    metadata[key] = normalizeMetadataValue(value.slice(start, end));
  });

  return metadata;
}

function resolveJobType(value: string, metadata?: JobMetadata): AgentJobType | undefined {
  const metadataType = metadata?.jobtype?.toUpperCase();
  if (metadataType && metadataType in JOB_TITLE_KEY) return metadataType as AgentJobType;

  const explicitType = value.match(JOB_TYPE_PATTERN)?.[1]?.toUpperCase();
  if (explicitType && explicitType in JOB_TITLE_KEY) return explicitType as AgentJobType;

  const slugType = value.match(JOB_SLUG_PATTERN)?.[1]?.replace(/-/g, "_").toUpperCase();
  if (slugType && slugType in JOB_TITLE_KEY) return slugType as AgentJobType;

  const hintedType = JOB_TEXT_HINTS.find(([, pattern]) => pattern.test(value))?.[0];
  if (hintedType) return hintedType;

  return undefined;
}

function notificationTitleKey(jobType: AgentJobType | undefined, failed: boolean): MessageKey {
  if (failed) {
    return (jobType && JOB_FAILED_TITLE_KEY[jobType]) || "notification.job.failedTitle";
  }
  return jobType && jobType in JOB_TITLE_KEY ? JOB_TITLE_KEY[jobType] : "notification.job.doneTitle";
}

function isBoilerplateMessage(value: string): boolean {
  return value === "" || JOB_BOILERPLATE_PATTERN.test(value) || looksLikeResponseEnvelope(value);
}

// "…, jobType=X, jobId=Y, resourceTitle=Z, message=..." 같은 조각을 제거해 사람이 쓴 문장만 남긴다.
function stripRawJobMetadata(value: string): string {
  return value
    .replace(JOB_METADATA_FIELD_PATTERN, " ")
    .replace(/[.,]?\s*job(?:type|id)\s*[:=]\s*[^,\n}]*/gi, "")
    .replace(/[.,]?\s*message\s*[:=]\s*AI\s*작업\s*agent-job-[^,\n}]*/gi, "")
    .replace(/agent-job-[a-z0-9-]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.,]+$/g, "")
    .trim();
}

export type FormattedNotification = { title: string; body: string | null };

type FormatNotificationInput = Pick<NotificationResponse, "title" | "body"> & {
  jobType?: AgentJobType | null;
  resourceTitle?: string | null;
  sourceType?: NotificationResponse["sourceType"];
};

function extractProjectRoomName(value: string): string | null {
  return cleanPreviewText(value.match(/(.+?)\s*프로젝트룸에\s*초대/)?.[1] ?? "") ?? null;
}

function extractChatRoomName(value: string): string | null {
  return cleanPreviewText(value.match(/(.+?)\s*그룹\s*채팅에\s*초대/)?.[1] ?? "") ?? null;
}

function targetBody(t: TranslateFn, key: MessageKey, value: string | null | undefined) {
  const cleaned = cleanPreviewText(value ?? "");
  return cleaned ? t(key, { name: cleaned }) : null;
}

function jobTargetBody(t: TranslateFn, jobType: AgentJobType | undefined, resourceTitle: string) {
  if (!resourceTitle) return null;
  return t(jobType === "ANALYZE_RESOURCE" ? "notification.job.analyzeResourceTarget" : "notification.job.resourceTarget", { title: resourceTitle });
}

function formatJobBody(
  t: TranslateFn,
  input: {
    bodyCandidate: string;
    failed: boolean;
    jobType: AgentJobType | undefined;
    resourceTitle: string;
    responsePreview: string | null;
  },
) {
  const target = jobTargetBody(t, input.jobType, input.resourceTitle);
  if (input.failed) return target || t("notification.job.failedBody");
  if (target) return target;
  if (input.jobType === "ANALYZE_RESOURCE") return t("notification.job.doneBody");

  const cleanedCandidate = isBoilerplateMessage(input.bodyCandidate) ? null : cleanPreviewText(input.bodyCandidate);
  return input.responsePreview || cleanedCandidate || t("notification.job.doneBody");
}

function resolveJobResourceTitle(input: { metadata?: JobMetadata; providedResourceTitle: string; rawBody: string; rawTitle: string }) {
  return (
    input.providedResourceTitle ||
    cleanResourceTitle(input.metadata?.resourcetitle ?? "") ||
    cleanResourceTitle(input.metadata?.resourcename ?? "") ||
    cleanResourceTitle(input.metadata?.filename ?? "") ||
    extractResourceTitle(input.rawBody) ||
    extractResourceTitle(input.rawTitle) ||
    ""
  );
}

function notificationSourceTitle(rawTitle: string, fallback: string): string {
  const cleaned = cleanPreviewText(rawTitle);
  if (!cleaned || JOB_BOILERPLATE_PATTERN.test(cleaned)) return fallback;
  return cleaned;
}

function formatNotificationBySourceType(
  t: TranslateFn,
  notification: FormatNotificationInput,
  input: { rawBody: string; rawTitle: string; resourceTitle: string; responsePreview: string | null },
): FormattedNotification | null {
  const { rawBody, rawTitle, resourceTitle, responsePreview } = input;

  switch (notification.sourceType) {
    case "FRIEND_REQUEST":
      return {
        title: t("notification.type.friendRequest"),
        body: targetBody(t, "notification.target.person", rawTitle) || responsePreview || rawBody || null,
      };
    case "FRIEND_ACCEPTED":
      return {
        title: t("notification.type.friendAccepted"),
        body: targetBody(t, "notification.target.person", rawTitle) || responsePreview || rawBody || null,
      };
    case "ROOM_INVITE":
      return {
        title: t("notification.type.roomInvite"),
        body: targetBody(t, "notification.target.projectRoom", extractProjectRoomName(rawBody)) || responsePreview || rawBody || null,
      };
    case "CHAT_INVITE": {
      const chatRoomName = extractChatRoomName(rawBody);
      return {
        title: t(chatRoomName ? "notification.type.chatInvite" : "notification.type.directChat"),
        body:
          targetBody(t, chatRoomName ? "notification.target.chatRoom" : "notification.target.person", chatRoomName || rawTitle) ||
          responsePreview ||
          rawBody ||
          null,
      };
    }
    case "COMMENT":
      return {
        title: t("notification.type.comment"),
        body: resourceTitle ? t("notification.job.resourceTarget", { title: resourceTitle }) : responsePreview || rawBody || null,
      };
    case "RESOURCE":
      return {
        title: notificationSourceTitle(rawTitle, t("notification.type.resource")),
        body: resourceTitle ? t("notification.job.resourceTarget", { title: resourceTitle }) : responsePreview || rawBody || null,
      };
    default:
      return null;
  }
}

/**
 * 알림의 제목/본문을 표시용으로 정리한다. 원시 잡 메타데이터가 감지되면 잡 종류에 맞는
 * 친화 문구로 대체하고, 아니면 원문을 그대로 사용한다.
 */
export function formatNotificationContent(
  t: TranslateFn,
  notification: FormatNotificationInput,
): FormattedNotification {
  const rawTitle = (notification.title ?? "").trim();
  const rawBody = (notification.body ?? "").trim();
  const responsePreview = extractResponsePreview(rawBody) || extractResponsePreview(rawTitle);
  const providedJobType = notification.jobType ?? undefined;
  const providedResourceTitle = normalizeMetadataValue(notification.resourceTitle ?? "");
  const combined = `${rawTitle} ${rawBody}`;

  if (!hasRawJobMetadata(notification)) {
    const inferredJobType = providedJobType ?? resolveJobType(combined);
    const sourceResourceTitle = resolveJobResourceTitle({ providedResourceTitle, rawBody, rawTitle });
    const canBeJobNotification = notification.sourceType === "AGENT" || notification.sourceType === "RESOURCE" || !notification.sourceType;
    const looksLikeAgentJob =
      Boolean(providedJobType) ||
      JOB_BOILERPLATE_PATTERN.test(combined) ||
      (canBeJobNotification && Boolean(inferredJobType)) ||
      (notification.sourceType === "AGENT" &&
        (JOB_FAILED_PATTERN.test(combined) || looksLikeResponseEnvelope(rawBody) || looksLikeResponseEnvelope(rawTitle)));

    if (looksLikeAgentJob) {
      const jobType = inferredJobType;
      const failed = JOB_FAILED_PATTERN.test(combined);
      return {
        title: t(notificationTitleKey(jobType, failed)),
        body: formatJobBody(t, {
          bodyCandidate: rawBody || rawTitle,
          failed,
          jobType,
          resourceTitle: sourceResourceTitle,
          responsePreview,
        }),
      };
    }

    const typed = formatNotificationBySourceType(t, notification, {
      rawBody,
      rawTitle,
      resourceTitle: sourceResourceTitle,
      responsePreview,
    });
    if (typed) return typed;

    return { title: rawTitle, body: responsePreview || rawBody || null };
  }

  const metadata = parseJobMetadata(combined);
  const jobType = providedJobType ?? resolveJobType(combined, metadata);
  const failed = JOB_FAILED_PATTERN.test(combined);
  const titleKey = notificationTitleKey(jobType, failed);
  const resourceTitle = resolveJobResourceTitle({ metadata, providedResourceTitle, rawBody, rawTitle });
  const message = normalizeMetadataValue(metadata.message);

  // 원문에 잡 메타데이터를 뺀 사람이 쓴 문장이 남아 있으면 본문으로 살리고,
  // 흔한 보일러플레이트("AI 작업이 완료...")만 남으면 일반 안내 문구로 대체한다.
  const remainder = stripRawJobMetadata(rawBody) || stripRawJobMetadata(rawTitle);
  const bodyCandidate = responsePreview || message || remainder;

  return {
    title: t(titleKey),
    body: formatJobBody(t, {
      bodyCandidate,
      failed,
      jobType,
      resourceTitle,
      responsePreview,
    }),
  };
}
