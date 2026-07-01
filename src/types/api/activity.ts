export type ActivityLogResponse = {
  appName?: string | null;
  createdAt: string;
  durationSeconds?: number | null;
  endedAt?: string | null;
  id: string;
  roomId?: string | null;
  startedAt: string;
  userId: string;
  windowTitle?: string | null;
};

export type ActivityLogsTodayResponse = ActivityLogResponse[];

// POST /api/activity/current-app — record the current app/window context.
// Consent-gated (user_privacy_consents ACTIVITY_CONTEXT). The values come from
// the Tauri read_activity_context IPC; no full-screen or keystroke capture.
export type ActivityCurrentAppRequest = {
  appName: string;
  durationSeconds?: number | null;
  endedAt?: string | null;
  roomId?: string | null;
  startedAt: string;
  windowTitle?: string | null;
};
