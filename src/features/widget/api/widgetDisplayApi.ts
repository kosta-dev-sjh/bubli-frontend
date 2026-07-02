import { apiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/types/api/common";
import { withWidgetDevAuthHeaders } from "./widgetAuthHeaders";

export type WidgetTaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type WidgetResourceKind = "FILE" | "MEMO";
export type WidgetResourceStatus = "UPLOADING" | "READY" | "ANALYZING" | "ANALYZED" | "FAILED";
export type WidgetAgentSuggestionStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type WidgetAgentSuggestionType =
  | "REQUIREMENT"
  | "TODO"
  | "WBS"
  | "TASK"
  | "SCHEDULE"
  | "QUESTION"
  | "CONTRACT_FIELD"
  | "CONTRACT_REVIEW"
  | "REVIEW_ITEM"
  | "DOCUMENT_DRAFT"
  | "DAILY_SUMMARY"
  | "MEMO";
export type WidgetNotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export type WidgetTaskResponse = {
  assigneeUserId: string | null;
  createdAt: string;
  description: string | null;
  dueAt: string | null;
  id: string;
  ownerUserId: string | null;
  roomId: string | null;
  status: WidgetTaskStatus;
  title: string;
  updatedAt: string;
  wbsItemId: string | null;
};

export type WidgetScheduleResponse = {
  allDay: boolean;
  createdAt: string;
  endsAt: string | null;
  googleEventId: string | null;
  id: string;
  lastSyncedAt: string | null;
  ownerUserId: string;
  roomId: string | null;
  startsAt: string;
  syncStatus: "LOCAL_ONLY" | "SYNCED" | "SYNC_FAILED";
  taskId: string | null;
  title: string;
  updatedAt: string;
  wbsItemId: string | null;
};

export type WidgetResourceResponse = {
  createdAt: string;
  id: string;
  kind: WidgetResourceKind;
  ownerId: string;
  roomId: string | null;
  status: WidgetResourceStatus;
  title: string;
  updatedAt: string;
  visibility: "PERSONAL" | "ROOM_SHARED";
};

export type WidgetMemoResponse = {
  authorUserId: string;
  body: string;
  createdAt: string;
  id: string;
  roomId: string | null;
  status: "ACTIVE" | "DELETED";
  updatedAt: string;
};

export type WidgetAgentSuggestionResponse = {
  createdAt: string;
  evidenceJson: Record<string, unknown> | null;
  jobId: string | null;
  payloadJson: Record<string, unknown>;
  resourceId: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  roomId: string | null;
  status: WidgetAgentSuggestionStatus;
  suggestionId: string;
  suggestionType: WidgetAgentSuggestionType;
  updatedAt: string;
  userId: string;
};

export type WidgetNotificationResponse = {
  body: string | null;
  createdAt: string;
  id: string;
  readAt: string | null;
  sourceId: string | null;
  sourceType: "MESSAGE" | "COMMENT" | "RESOURCE" | "AGENT";
  status: WidgetNotificationStatus;
  title: string;
};

export type WidgetChatRoomResponse = {
  chatType: "ROOM" | "DIRECT";
  createdAt: string;
  id: string;
  name: string | null;
  roomId: string | null;
  status: "ACTIVE" | "CLOSED";
  updatedAt: string;
};

export type WidgetChatMessageResponse = {
  body: Record<string, unknown>;
  chatRoomId: string;
  clientMessageId: string;
  createdAt: string;
  id: string;
  messageType: "TEXT" | "FILE" | "AGENT_COMMAND" | "AGENT_RESPONSE" | "SYSTEM";
  resourceId: string | null;
  roomSequence: number;
  sender: {
    id: string | null;
    name: string;
    type: "USER" | "SYSTEM" | "AGENT";
  };
};

export type WidgetFriendResponse = {
  acceptedAt?: string | null;
  avatarUrl?: string | null;
  bubliId: string;
  name: string;
  userId?: string;
  friendUserId?: string;
};

export type WidgetTimeLogResponse = {
  createdAt: string;
  durationSeconds: number;
  endedAt: string | null;
  id: string;
  idempotencyKey: string;
  lastHeartbeatAt: string | null;
  lastStartedAt: string | null;
  recoveredFromTimeLogId: string | null;
  roomId: string | null;
  startedAt: string;
  status: "RUNNING" | "PAUSED" | "ENDED" | "NEEDS_RECOVERY";
  timerType: "GENERAL" | "WORK";
  updatedAt: string;
  userId: string;
};

export type WidgetDashboardWorkResponse = {
  agentSuggestionSummary: string[];
  runningTimer: WidgetTimeLogResponse | null;
  todaySchedules: WidgetScheduleResponse[];
  todayTasks: WidgetTaskResponse[];
  unreadNotificationCount: number;
  upcomingDeadlines: WidgetTaskResponse[];
};

export type WidgetProjectRoomResponse = {
  clientName: string | null;
  contractAmount: number | null;
  createdAt: string;
  createdByUserId: string;
  id: string;
  name: string;
  paidAt: string | null;
  paymentDueDate: string | null;
  paymentStatus: "NOT_RECORDED" | "PENDING" | "PAID" | "OVERDUE";
  status: "ACTIVE" | "CLOSED";
  updatedAt: string;
};

export type WidgetVoiceParticipantResponse = {
  id: string;
  joinedAt: string;
  leftAt: string | null;
  status: "JOINED" | "LEFT" | "DISCONNECTED";
  userId: string;
  userName: string;
};

export type WidgetVoiceRoomResponse = {
  createdAt: string;
  id: string;
  livekitRoomName: string;
  participants: WidgetVoiceParticipantResponse[];
  roomId: string | null;
  status: "OPEN" | "ENDED";
};

function widgetDisplayRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  return apiRequest<T>(path, {
    ...options,
    headers: withWidgetDevAuthHeaders(options.headers),
  });
}

function withRoom(path: string, roomId?: string | null) {
  if (!roomId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}roomId=${encodeURIComponent(roomId)}`;
}

export const widgetDisplayApi = {
  getDashboardWork() {
    return widgetDisplayRequest<WidgetDashboardWorkResponse>("/api/dashboard/work");
  },

  listDashboardTasks(size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetTaskResponse>>(`/api/dashboard/tasks?page=0&size=${size}`);
  },

  getProjectRoom(roomId: string) {
    return widgetDisplayRequest<WidgetProjectRoomResponse>(`/api/project-rooms/${roomId}`);
  },

  listSchedules(roomId?: string | null, size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetScheduleResponse>>(withRoom(`/api/schedules?page=0&size=${size}`, roomId));
  },

  listResources(roomId?: string | null, size = 6) {
    if (roomId) {
      return widgetDisplayRequest<PageResponse<WidgetResourceResponse>>(`/api/project-rooms/${roomId}/resources?page=0&size=${size}`);
    }
    return widgetDisplayRequest<PageResponse<WidgetResourceResponse>>(`/api/resources?scope=personal&page=0&size=${size}`);
  },

  listMemos(roomId?: string | null, size = 6) {
    if (roomId) {
      return widgetDisplayRequest<PageResponse<WidgetMemoResponse>>(`/api/project-rooms/${roomId}/memos?page=0&size=${size}`);
    }
    return widgetDisplayRequest<PageResponse<WidgetMemoResponse>>(`/api/memos?page=0&size=${size}`);
  },

  createMemo(body: string, roomId?: string | null) {
    if (roomId) {
      return widgetDisplayRequest<WidgetMemoResponse>(`/api/project-rooms/${roomId}/memos`, {
        body: { body },
        method: "POST",
      });
    }
    return widgetDisplayRequest<WidgetMemoResponse>("/api/memos", {
      body: { body },
      method: "POST",
    });
  },

  updateMemo(memoId: string, body: string) {
    return widgetDisplayRequest<WidgetMemoResponse>(`/api/memos/${memoId}`, {
      body: { body },
      method: "PATCH",
    });
  },

  deleteMemo(memoId: string) {
    return widgetDisplayRequest<null>(`/api/memos/${memoId}`, {
      method: "DELETE",
    });
  },

  listAgentSuggestions(roomId?: string | null) {
    if (roomId) {
      return widgetDisplayRequest<WidgetAgentSuggestionResponse[]>(`/api/project-rooms/${roomId}/agent/suggestions?status=DRAFT`);
    }
    return widgetDisplayRequest<WidgetAgentSuggestionResponse[]>("/api/agent/suggestions?status=DRAFT");
  },

  listNotifications(size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetNotificationResponse>>(`/api/notifications?page=0&size=${size}`);
  },

  listChatRooms(size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetChatRoomResponse>>(`/api/chat/rooms?page=0&size=${size}`);
  },

  listChatMessages(chatRoomId: string, size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetChatMessageResponse>>(`/api/chat/rooms/${chatRoomId}/messages?page=0&size=${size}`);
  },

  listFriends() {
    return widgetDisplayRequest<WidgetFriendResponse[]>("/api/friends");
  },

  getVoiceRoom(voiceRoomId: string) {
    return widgetDisplayRequest<WidgetVoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}`);
  },
} as const;
