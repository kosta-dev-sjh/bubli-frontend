export type ActivityLogSource = "TAURI" | "USER_CONFIRMED" | "SYSTEM";

export type ActivityLogResponse = {
  appName?: string | null;
  capturedAt: string;
  durationSeconds?: number | null;
  id: string;
  roomId?: string | null;
  source: ActivityLogSource;
  taskId?: string | null;
  windowTitle?: string | null;
};

export type ActivityLogsTodayResponse = {
  items: ActivityLogResponse[];
  totalDurationSeconds?: number;
};
