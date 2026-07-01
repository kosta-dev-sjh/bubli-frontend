"use client";

import { settingsApi } from "@/features/settings/api/settingsApi";
import { recordCurrentActivityContext } from "@/lib/local/activity-client";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { getActiveProjectRoomId } from "@/lib/workspace-active-room";

const ACTIVITY_CAPTURE_INTERVAL_MS = 30_000;
const CONSENT_REFRESH_INTERVAL_MS = 60_000;

let captureIntervalId: number | null = null;
let captureInFlight = false;
let cachedConsent: boolean | null = null;
let cachedConsentCheckedAt = 0;

export function startActivityAutoCapture() {
  if (!isTauriRuntime()) return;
  if (captureIntervalId !== null) return;

  void captureActivityOnce();
  captureIntervalId = window.setInterval(() => {
    void captureActivityOnce();
  }, ACTIVITY_CAPTURE_INTERVAL_MS);
}

export function stopActivityAutoCapture() {
  if (captureIntervalId !== null) {
    window.clearInterval(captureIntervalId);
  }

  captureIntervalId = null;
  captureInFlight = false;
  cachedConsent = null;
  cachedConsentCheckedAt = 0;
}

export function isActivityAutoCaptureRunning() {
  return captureIntervalId !== null;
}

async function captureActivityOnce() {
  if (captureInFlight) return;

  captureInFlight = true;
  try {
    const consentGranted = await readActivityConsent();
    if (!consentGranted) return;

    await recordCurrentActivityContext({
      consentGranted,
      roomId: getActiveProjectRoomId(),
    });
  } catch {
    cachedConsent = null;
    cachedConsentCheckedAt = 0;
  } finally {
    captureInFlight = false;
  }
}

async function readActivityConsent() {
  const now = Date.now();
  if (cachedConsent !== null && now - cachedConsentCheckedAt < CONSENT_REFRESH_INTERVAL_MS) {
    return cachedConsent;
  }

  const privacy = await settingsApi.getPrivacyConsents();
  cachedConsent = Boolean(privacy.activityDetectionEnabled);
  cachedConsentCheckedAt = now;
  return cachedConsent;
}
