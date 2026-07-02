"use client";

import { settingsApi } from "@/features/settings/api/settingsApi";
import { getStoredAuthSession } from "@/lib/auth/auth-session";
import { recordCurrentActivityContext } from "@/lib/local/activity-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const ACTIVITY_CAPTURE_INTERVAL_MS = 30_000;

let activityTimer: number | null = null;
let activityTickInFlight = false;

export function startTauriActivityRuntime() {
  if (!isTauriRuntime()) return;
  if (activityTimer) return;

  void recordConsentedActivityTick();
  activityTimer = window.setInterval(() => {
    void recordConsentedActivityTick();
  }, ACTIVITY_CAPTURE_INTERVAL_MS);
}

export function stopTauriActivityRuntime() {
  if (!activityTimer) return;

  window.clearInterval(activityTimer);
  activityTimer = null;
}

export function refreshTauriActivityRuntime() {
  if (!isTauriRuntime() || !activityTimer) return;

  void recordConsentedActivityTick();
}

async function recordConsentedActivityTick() {
  if (activityTickInFlight) return;

  const session = getStoredAuthSession();
  if (!session) {
    stopTauriActivityRuntime();
    return;
  }

  activityTickInFlight = true;
  try {
    const privacy = await settingsApi.getPrivacyConsents();
    if (!privacy.activityDetectionEnabled) {
      return;
    }

    await recordCurrentActivityContext({ consentGranted: true });
  } catch {
    // Keep this runtime quiet: settings UI exposes manual activity failures.
  } finally {
    activityTickInFlight = false;
  }
}
