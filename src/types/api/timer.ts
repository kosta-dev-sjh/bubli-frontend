export type TimerType = "GENERAL" | "WORK";

export type TimeLogStatus = "RUNNING" | "PAUSED" | "STOPPED" | "RECOVERY_NEEDED";

export type TimeLogResponse = {
  createdAt?: string;
  durationSeconds?: number | null;
  endedAt?: string | null;
  id: string;
  idempotencyKey?: string | null;
  lastHeartbeatAt?: string | null;
  lastStartedAt?: string | null;
  recoveredFromTimeLogId?: string | null;
  roomId?: string | null;
  startedAt: string;
  status: TimeLogStatus;
  timerType?: TimerType | null;
  updatedAt?: string;
  userId?: string | null;
};

export type StartTimeLogRequest = {
  idempotencyKey: string;
  recoveredFromTimeLogId?: string | null;
  roomId?: string | null;
  timerType?: TimerType | null;
};
