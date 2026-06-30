import type { WidgetBubbleType as TauriWidgetBubbleType } from "@/lib/tauri/commands";
import type { WidgetBubbleType as ApiWidgetBubbleType } from "@/types/api/widget";

export const WIDGET_BUBBLE_TYPES = [
  "todo",
  "schedule",
  "timer",
  "memo",
  "chat",
  "agent",
  "resource",
  "alert",
] as const satisfies readonly TauriWidgetBubbleType[];

export const WIDGET_API_BUBBLE_TYPES = [
  "TODO",
  "SCHEDULE",
  "TIMER",
  "MEMO",
  "CHAT",
  "AGENT",
  "RESOURCE",
  "ALERT",
] as const satisfies readonly ApiWidgetBubbleType[];

const apiToLocalBubbleType: Record<ApiWidgetBubbleType, TauriWidgetBubbleType> = {
  AGENT: "agent",
  ALERT: "alert",
  CHAT: "chat",
  MEMO: "memo",
  RESOURCE: "resource",
  SCHEDULE: "schedule",
  TIMER: "timer",
  TODO: "todo",
};

const localToApiBubbleType: Record<TauriWidgetBubbleType, ApiWidgetBubbleType> = {
  agent: "AGENT",
  alert: "ALERT",
  chat: "CHAT",
  memo: "MEMO",
  resource: "RESOURCE",
  schedule: "SCHEDULE",
  timer: "TIMER",
  todo: "TODO",
};

export function toLocalWidgetBubbleType(bubbleType: ApiWidgetBubbleType): TauriWidgetBubbleType {
  return apiToLocalBubbleType[bubbleType];
}

export function toApiWidgetBubbleType(bubbleType: TauriWidgetBubbleType): ApiWidgetBubbleType {
  return localToApiBubbleType[bubbleType];
}

