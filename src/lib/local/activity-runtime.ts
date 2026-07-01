"use client";

import { settingsApi } from "@/features/settings/api/settingsApi";
import { getStoredAuthSession } from "@/lib/auth/auth-session";
import { recordCurrentActivityContext, syncPendingActivityEventsToServer } from "@/lib/local/activity-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const ACTIVITY_CAPTURE_INTERVAL_MS = 60_000;

let activityRuntimeStarted = false;
let activityRuntimeTimer: number | null = null;
let activityRuntimeRunning = false;

async function canCaptureActivity() {
  if (!getStoredAuthSession()) {
    return false;
  }

  try {
    const privacy = await settingsApi.getPrivacyConsents();
    return Boolean(privacy.activityDetectionEnabled);
  } catch {
    return false;
  }
}

async function captureActivityOnce() {
  if (activityRuntimeRunning) {
    return;
  }

  activityRuntimeRunning = true;
  try {
    const consentGranted = await canCaptureActivity();
    if (!consentGranted) {
      return;
    }

    await recordCurrentActivityContext({ consentGranted });
    await syncPendingActivityEventsToServer({ consentGranted, limit: 10 });
  } finally {
    activityRuntimeRunning = false;
  }
}

export function startTauriActivityRuntime() {
  if (!isTauriRuntime() || activityRuntimeStarted) {
    return;
  }

  activityRuntimeStarted = true;
  void captureActivityOnce();
  activityRuntimeTimer = window.setInterval(() => {
    if (!getStoredAuthSession()) {
      stopTauriActivityRuntime();
      return;
    }
    void captureActivityOnce();
  }, ACTIVITY_CAPTURE_INTERVAL_MS);
}

export function stopTauriActivityRuntime() {
  if (activityRuntimeTimer !== null) {
    window.clearInterval(activityRuntimeTimer);
  }
  activityRuntimeTimer = null;
  activityRuntimeStarted = false;
  activityRuntimeRunning = false;
}
