import { apiRequest } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import type { AgentJobResponse } from "@/types/api/agent";
import type { PageResponse } from "@/types/api/common";
import type { FriendApiResponse, FriendRequestApiResponse, FriendSearchApiResponse } from "@/types/api/friend";
import type { NotificationResponse } from "@/types/api/notification";
import type { ResourceDownloadUrlResponse, ResourceResponse } from "@/types/api/resource";
import type { TimeLogResponse } from "@/types/api/timer";
import { withWidgetDevAuthHeaders } from "./widgetAuthHeaders";

const WIDGET_MEMO_PAGE_SIZE = 100;
const WIDGET_RESOURCE_PAGE_SIZE = 100;
const WIDGET_SCHEDULE_PAGE_SIZE = 100;

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
export type WidgetNotificationSourceType = Exclude<NotificationResponse["sourceType"], undefined>;

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
  sourceType: WidgetNotificationSourceType;
  status: WidgetNotificationStatus;
  title: string;
};

export type WidgetChatRoomResponse = {
  chatType: "ROOM" | "DIRECT" | "GROUP";
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

// 실제 백엔드 응답과 동일한 형태(userId 필수)라 별도 타입을 두지 않고 재사용한다 —
// 위젯 전용으로 다시 선언하면 chatType처럼 필드가 슬쩍 어긋나는 문제가 반복된다.
export type WidgetFriendResponse = FriendApiResponse;

export type WidgetTimeLogResponse = TimeLogResponse;

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
  chatRoomId?: string | null;
  createdAt: string;
  createdByUserId?: string | null;
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

function widgetScheduleWindow(now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 14);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export const widgetDisplayApi = {
  getDashboardWork() {
    return widgetDisplayRequest<WidgetDashboardWorkResponse>("/api/dashboard/work");
  },

  listDashboardTasks(size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetTaskResponse>>(`/api/dashboard/tasks?page=0&size=${size}`);
  },

  listTasks(roomId?: string | null, size = 6) {
    if (roomId) {
      return widgetDisplayRequest<PageResponse<WidgetTaskResponse>>(`/api/project-rooms/${roomId}/tasks?page=0&size=${size}`);
    }
    return widgetDisplayApi.listDashboardTasks(size);
  },

  // 내 할 일 탭: 개인 TODO + 나에게 배정된 룸 태스크(백엔드 /api/tasks = findVisibleTasksForUser).
  // '오늘 마감'으로 거르지 않는다 — 마감 없는 새 할 일도 포함해야 하므로 대시보드 today가 아닌 전체 목록을 받는다.
  listMyTasks(size = 30) {
    return widgetDisplayRequest<PageResponse<WidgetTaskResponse>>(`/api/tasks?page=0&size=${size}`);
  },

  // 프로젝트룸 탭: 선택 룸 보드 전체(담당자 미지정 칸반 포함). 표시 필터는 프론트에서.
  listRoomBoard(roomId: string, size = 50) {
    return widgetDisplayRequest<PageResponse<WidgetTaskResponse>>(`/api/project-rooms/${roomId}/tasks?page=0&size=${size}`);
  },

  getProjectRoom(roomId: string) {
    return widgetDisplayRequest<WidgetProjectRoomResponse>(`/api/project-rooms/${roomId}`);
  },

  // 개인 컨텍스트 TODO 행의 룸 칩(룸 이름) 표시용 — 내가 속한 프로젝트룸 목록.
  listProjectRooms(size = 50) {
    return widgetDisplayRequest<PageResponse<WidgetProjectRoomResponse>>(`/api/project-rooms?page=0&size=${size}`);
  },

  listSchedules(roomId?: string | null, size = 6) {
    const { from, to } = widgetScheduleWindow();
    const params = new URLSearchParams({
      from,
      page: "0",
      size: String(size),
      to,
    });
    if (roomId) params.set("roomId", roomId);

    return widgetDisplayRequest<PageResponse<WidgetScheduleResponse>>(`/api/schedules?${params.toString()}`);
  },

  async listAllSchedules(roomId?: string | null, size = WIDGET_SCHEDULE_PAGE_SIZE) {
    const { from, to } = widgetScheduleWindow();
    const items: WidgetScheduleResponse[] = [];
    let page = 0;
    let lastPage: PageResponse<WidgetScheduleResponse> | null = null;

    do {
      const params = new URLSearchParams({
        from,
        page: String(page),
        size: String(size),
        to,
      });
      if (roomId) params.set("roomId", roomId);

      lastPage = await widgetDisplayRequest<PageResponse<WidgetScheduleResponse>>(`/api/schedules?${params.toString()}`);
      items.push(...lastPage.items);
      page += 1;
    } while (lastPage.hasNext);

    return {
      ...(lastPage ?? { hasNext: false, page: 0, size, totalPages: 0 }),
      hasNext: false,
      items,
      page: 0,
      size: items.length,
    } satisfies PageResponse<WidgetScheduleResponse>;
  },

  listResources(roomId?: string | null, size = 6, page = 0) {
    if (roomId) {
      return widgetDisplayRequest<PageResponse<WidgetResourceResponse>>(`/api/project-rooms/${roomId}/resources?page=${page}&size=${size}`);
    }
    return widgetDisplayRequest<PageResponse<WidgetResourceResponse>>(`/api/resources?scope=personal&page=${page}&size=${size}`);
  },

  async listAllResources(roomId?: string | null, size = WIDGET_RESOURCE_PAGE_SIZE) {
    const items: WidgetResourceResponse[] = [];
    let page = 0;
    let lastPage: PageResponse<WidgetResourceResponse> | null = null;

    do {
      lastPage = await widgetDisplayApi.listResources(roomId, size, page);
      items.push(...lastPage.items);
      page += 1;
    } while (lastPage.hasNext);

    return {
      ...(lastPage ?? { hasNext: false, page: 0, size, totalPages: 0 }),
      hasNext: false,
      items,
      page: 0,
      size: items.length,
    } satisfies PageResponse<WidgetResourceResponse>;
  },

  analyzeResource(resourceId: string) {
    return widgetDisplayRequest<AgentJobResponse>("/api/ai/analyze-resource", {
      body: { resourceId },
      headers: {
        "Idempotency-Key": `widget-resource-analysis-${crypto.randomUUID()}`,
      },
      method: "POST",
    });
  },

  getAgentJob(jobId: string) {
    return widgetDisplayRequest<AgentJobResponse>(`/api/agent-jobs/${jobId}`);
  },

  getResource(resourceId: string) {
    return widgetDisplayRequest<ResourceResponse>(`/api/resources/${resourceId}`);
  },

  getResourceDownloadUrl(resourceId: string) {
    return widgetDisplayRequest<ResourceDownloadUrlResponse>(`/api/resources/${resourceId}/download-url`);
  },

  listMemos(roomId?: string | null, size = 6, page = 0) {
    if (roomId) {
      return widgetDisplayRequest<PageResponse<WidgetMemoResponse>>(`/api/project-rooms/${roomId}/memos?page=${page}&size=${size}`);
    }
    return widgetDisplayRequest<PageResponse<WidgetMemoResponse>>(`/api/memos?page=${page}&size=${size}`);
  },

  async listAllMemos(roomId?: string | null, size = WIDGET_MEMO_PAGE_SIZE) {
    const items: WidgetMemoResponse[] = [];
    let page = 0;
    let lastPage: PageResponse<WidgetMemoResponse> | null = null;

    do {
      lastPage = await widgetDisplayApi.listMemos(roomId, size, page);
      items.push(...lastPage.items);
      page += 1;
    } while (lastPage.hasNext);

    return {
      ...(lastPage ?? { hasNext: false, page: 0, size, totalPages: 0 }),
      hasNext: false,
      items,
      page: 0,
      size: items.length,
    } satisfies PageResponse<WidgetMemoResponse>;
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

  listNotifications(size = 6, page = 0, status?: WidgetNotificationStatus) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) params.set("status", status);
    return widgetDisplayRequest<PageResponse<WidgetNotificationResponse>>(`/api/notifications?${params.toString()}`);
  },

  listChatRooms(size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetChatRoomResponse>>(`/api/chat/rooms?page=0&size=${size}`);
  },

  createProjectRoomChatRoom(roomId: string) {
    return widgetDisplayRequest<WidgetChatRoomResponse>(`/api/project-rooms/${roomId}/chat-room`, {
      method: "POST",
    });
  },

  listChatMessages(chatRoomId: string, size = 6) {
    return widgetDisplayRequest<PageResponse<WidgetChatMessageResponse>>(`/api/chat/rooms/${chatRoomId}/messages?page=0&size=${size}`);
  },

  listFriends() {
    return widgetDisplayRequest<WidgetFriendResponse[]>("/api/friends");
  },

  listFriendRequests() {
    return widgetDisplayRequest<FriendRequestApiResponse[]>("/api/friend-requests");
  },

  async searchFriend(bubliId: string) {
    const query = new URLSearchParams({ bubliId }).toString();
    try {
      return await widgetDisplayRequest<FriendSearchApiResponse>(`/api/friends/search?${query}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getVoiceRoom(voiceRoomId: string) {
    return widgetDisplayRequest<WidgetVoiceRoomResponse>(`/api/voice/rooms/${voiceRoomId}`);
  },
} as const;
