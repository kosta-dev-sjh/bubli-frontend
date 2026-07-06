import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { AgentJobType } from "@/types/api/agent";
import type { NotificationResponse } from "@/types/api/notification";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

// 백엔드가 알림 제목/본문에 "AI 작업이 완료되었습니다. jobType=ANALYZE_RESOURCE, jobId=..."처럼
// 원시 잡 메타데이터를 그대로 내려주는 경우가 있다. 사용자에게는 이 기술 문자열 대신
// 잡 종류에 맞는 사람이 읽을 문구를 보여준다(백엔드가 정리되기 전까지의 프론트 방어막).
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

// "jobType=" 또는 "jobId=" 조각이 들어 있으면 원시 잡 메타데이터로 간주한다.
const RAW_JOB_PATTERN = /\bjob(?:type|id)\s*=/i;
const JOB_TYPE_PATTERN = /jobtype\s*=\s*([a-z_]+)/i;

// "…, jobType=X, jobId=Y" 같은 조각을 제거해 사람이 쓴 앞머리 문장만 남긴다.
function stripRawJobMetadata(value: string): string {
  return value
    .replace(/[.,]?\s*job(?:type|id)\s*=\s*[^,\n]*/gi, "")
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
  const combined = `${rawTitle} ${rawBody}`;

  if (!RAW_JOB_PATTERN.test(combined)) {
    return { title: rawTitle, body: rawBody || null };
  }

  const jobType = combined.match(JOB_TYPE_PATTERN)?.[1]?.toUpperCase() as AgentJobType | undefined;
  const titleKey = jobType && jobType in JOB_TITLE_KEY ? JOB_TITLE_KEY[jobType] : "notification.job.doneTitle";

  // 원문에 잡 메타데이터를 뺀 사람이 쓴 문장이 남아 있으면 본문으로 살리고,
  // 흔한 보일러플레이트("AI 작업이 완료...")만 남으면 일반 안내 문구로 대체한다.
  const remainder = stripRawJobMetadata(rawBody) || stripRawJobMetadata(rawTitle);
  const isBoilerplate = remainder === "" || /(작업이\s*완료|task\s*finished|作業が完了)/i.test(remainder);

  return {
    title: t(titleKey),
    body: isBoilerplate ? t("notification.job.doneBody") : remainder,
  };
}
