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

// POST /api/activity/current-app — record the current app/window context.
// Consent-gated (user_privacy_consents ACTIVITY_CONTEXT). The values come from
// the Tauri read_activity_context IPC; no full-screen or keystroke capture.
export type ActivityCurrentAppRequest = {
  appName: string;
  windowTitle?: string | null;
  durationSeconds?: number | null;
  roomId?: string | null;
  taskId?: string | null;
};
