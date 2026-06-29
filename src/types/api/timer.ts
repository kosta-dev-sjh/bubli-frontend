export type TimeLogStatus = "RUNNING" | "PAUSED" | "STOPPED" | "RECOVERY_NEEDED";

export type TimeLogResponse = {
  endedAt?: string | null;
  id: string;
  lastHeartbeatAt?: string | null;
  roomId?: string | null;
  startedAt: string;
  status: TimeLogStatus;
  taskId?: string | null;
  totalSeconds?: number | null;
  wbsItemId?: string | null;
};

export type StartTimeLogRequest = {
  idempotencyKey: string;
  roomId?: string | null;
  startedAt?: string;
  taskId?: string | null;
  wbsItemId?: string | null;
};

export type TimeLogTransitionRequest = {
  clientEventAt?: string;
  idempotencyKey?: string;
};

export type StopTimeLogRequest = TimeLogTransitionRequest & {
  endedAt?: string;
};

export type HeartbeatTimeLogRequest = {
  clientEventAt?: string;
  idempotencyKey?: string;
};
