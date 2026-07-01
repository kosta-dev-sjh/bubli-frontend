import type { TimeLogResponse } from "@/types/api/timer";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type WbsStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskSourceType = "USER" | "AGENT_SUGGESTION" | "RESOURCE";

export type TaskResponse = {
  assigneeUserId?: string | null;
  createdAt: string;
  description?: string | null;
  dueAt?: string | null;
  id: string;
  ownerUserId: string;
  roomId?: string | null;
  status: TaskStatus;
  title: string;
  updatedAt: string;
  wbsItemId?: string | null;
};

export type TaskCreateRequest = {
  assigneeUserId?: string | null;
  description?: string | null;
  dueAt?: string | null;
  roomId?: string | null;
  status?: TaskStatus;
  title: string;
  wbsItemId?: string | null;
};

export type TaskUpdateRequest = Partial<Pick<TaskCreateRequest, "assigneeUserId" | "description" | "dueAt" | "title" | "wbsItemId">> & {
  status?: TaskStatus;
};

export type WbsItemResponse = {
  createdAt: string;
  id: string;
  orderNo: number;
  parentId?: string | null;
  roomId: string;
  status: WbsStatus;
  title: string;
  updatedAt: string;
};

export type WbsItemCreateRequest = {
  orderNo?: number | null;
  parentId?: string | null;
  status?: WbsStatus;
  title: string;
};

export type WbsItemUpdateRequest = Partial<WbsItemCreateRequest> & {
  status?: WbsStatus;
};

export type WbsItemReorderRequest = {
  items: Array<{
    wbsItemId: string;
    parentId?: string | null;
    orderNo: number;
  }>;
};

export type WbsBoardResponse = {
  roomId?: string;
  tasks: TaskResponse[];
  wbsItems: WbsItemResponse[];
};

export type DashboardWorkResponse = {
  agentSuggestionSummary?: string[];
  runningTimer?: TimeLogResponse | null;
  todaySchedules: ScheduleResponse[];
  todayTasks: TaskResponse[];
  unreadNotificationCount?: number;
  upcomingDeadlines: TaskResponse[];
};

export type ScheduleSyncStatus = "LOCAL_ONLY" | "SYNCED" | "SYNC_FAILED";

export type ScheduleResponse = {
  allDay: boolean;
  createdAt: string;
  endsAt?: string | null;
  googleEventId?: string | null;
  id: string;
  lastSyncedAt?: string | null;
  ownerUserId: string;
  roomId?: string | null;
  startsAt: string;
  syncStatus: ScheduleSyncStatus;
  taskId?: string | null;
  title: string;
  updatedAt: string;
  wbsItemId?: string | null;
};
