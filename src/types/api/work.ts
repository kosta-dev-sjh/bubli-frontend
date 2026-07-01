export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";

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
  assigneeUserId?: string | null;
  createdAt: string;
  dueDate?: string | null;
  id: string;
  parentId?: string | null;
  roomId: string;
  sortOrder: number;
  status?: TaskStatus;
  title: string;
  updatedAt: string;
};

export type WbsItemCreateRequest = {
  assigneeUserId?: string | null;
  dueDate?: string | null;
  parentId?: string | null;
  title: string;
};

export type WbsItemUpdateRequest = Partial<WbsItemCreateRequest> & {
  status?: TaskStatus;
};

export type WbsItemReorderRequest = {
  items: Array<{
    id: string;
    parentId?: string | null;
    sortOrder: number;
  }>;
};

export type WbsBoardResponse = {
  roomId: string;
  tasks: TaskResponse[];
  wbsItems: WbsItemResponse[];
};

export type DashboardWorkResponse = {
  todaySchedules: ScheduleResponse[];
  todayTasks: TaskResponse[];
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
