import { activityApi } from "@/features/activity/api/activityApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { tauriCommands, TAURI_COMMANDS } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  blocked,
  failed,
  getErrorMessage,
  ready,
  runTauriAdapter,
  unavailable,
} from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
import type {
  ActivityBufferSyncAdapterResult,
  ActivityContextAdapterResult,
  ActivityContextReadInput,
  ActivityContextRecordAdapterResult,
  ActivityContextRecordInput,
} from "@/types/local";

export const LOCAL_ACTIVITY_RECORDED_EVENT = "bubli:local-activity-recorded";

type IncrementalActivityCheckpoint = {
  focusKey: string;
  recordedDurationSeconds: number;
};

type ActivityRecordSegment = {
  durationSeconds: number;
  endedAt: string;
  startedAt: string;
};

let incrementalActivityCheckpoint: IncrementalActivityCheckpoint | null = null;

export async function readCurrentActivityContext(
  input: ActivityContextReadInput,
): Promise<ActivityContextAdapterResult> {
  const commandName = TAURI_COMMANDS.readActivityContext;

  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  const serverConsentGranted = input.consentGranted
    ? await readServerActivityConsent().catch(() => false)
    : false;

  if (!serverConsentGranted) {
    const disabled = await mirrorNativeActivityConsent(false);
    if (!disabled) {
      return failed("Failed to disable native activity consent", commandName);
    }
    return blocked(
      "activity_consent_required",
      translate("local.activity.consentRequired"),
      commandName,
    );
  }

  return runTauriAdapter(commandName, async () => {
    await tauriCommands.setActivityContextConsent({ enabled: serverConsentGranted });
    return tauriCommands.readActivityContext();
  });
}

export async function recordCurrentActivityContext(
  input: ActivityContextRecordInput,
): Promise<ActivityContextRecordAdapterResult> {
  const commandName = TAURI_COMMANDS.recordActivityContext;
  await syncLocalActivityBufferToServer({ consentGranted: input.consentGranted, limit: 10 }).catch(() => undefined);

  const context = await readCurrentActivityContext(input);

  if (context.status !== "ready") {
    return context;
  }

  await syncLocalActivityBufferToServer({ consentGranted: input.consentGranted, limit: 10 }).catch(() => undefined);

  const capturedAt = parseIsoDate(context.data.capturedAt);
  const durationSeconds = Math.max(0, Math.trunc(context.data.durationSeconds ?? 0));
  const incremental = input.recordMode === "incremental";
  const segment = incremental
    ? resolveIncrementalActivitySegment(context.data.appName, context.data.windowTitle, durationSeconds, capturedAt)
    : {
        durationSeconds,
        endedAt: capturedAt.toISOString(),
        startedAt: new Date(capturedAt.getTime() - durationSeconds * 1000).toISOString(),
      };

  if (!segment) {
    return blocked(
      "activity_no_new_duration",
      translate("local.activity.noNewDwell"),
      commandName,
    );
  }

  const localActivity = await runTauriAdapter(TAURI_COMMANDS.recordActivityContext, () =>
    tauriCommands.recordActivityContext({
      appName: context.data.appName,
      capturedAt: context.data.capturedAt,
      durationSeconds: segment.durationSeconds,
      endedAt: segment.endedAt,
      roomId: input.roomId ?? null,
      startedAt: segment.startedAt,
      windowTitle: context.data.windowTitle ?? null,
    }),
  );

  if (localActivity.status !== "ready") {
    return localActivity;
  }
  rememberIncrementalActivityCheckpoint(context.data.appName, context.data.windowTitle, durationSeconds);

  let recordedActivity;
  try {
    recordedActivity = await activityApi.recordCurrentApp({
      appName: context.data.appName,
      durationSeconds: segment.durationSeconds,
      endedAt: segment.endedAt,
      localActivityId: localActivity.data.localActivityId,
      roomId: input.roomId ?? null,
      startedAt: segment.startedAt,
      windowTitle: context.data.windowTitle ?? null,
    });
  } catch (error) {
    await tauriCommands
      .markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        status: "FAILED",
      })
      .catch(() => undefined);
    return failed(getErrorMessage(error), commandName);
  }

  try {
    await tauriCommands.markActivityContextSynced({
      localActivityId: localActivity.data.localActivityId,
      serverActivityLogId: recordedActivity.id,
      status: "SYNCED",
    });
  } catch (error) {
    await tauriCommands
      .markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        status: "FAILED",
      })
      .catch(() => undefined);
    return failed(getErrorMessage(error), commandName);
  }

  const todayActivities = await activityApi.getToday().catch(() => []);
  notifyLocalActivityRecorded(todayActivities);

  return ready(
    {
      appName: context.data.appName,
      context: context.data,
      localActivityId: localActivity.data.localActivityId,
      recordedActivity,
      syncStatus: "SYNCED",
      todayActivities,
      windowTitle: context.data.windowTitle,
    },
    commandName,
    translate("local.activity.recorded"),
  );
}

export async function syncLocalActivityBufferToServer(input?: {
  consentGranted?: boolean;
  limit?: number;
}): Promise<ActivityBufferSyncAdapterResult> {
  const commandName = TAURI_COMMANDS.stageActivityContextsForSync;
  if (input?.consentGranted !== true) {
    return blocked(
      "activity_consent_required",
      translate("local.activity.consentRequired"),
      commandName,
    );
  }

  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageActivityContextsForSync({ limit: input.limit }),
  );

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.activities.length === 0) {
    return ready(
      {
        failedCount: 0,
        sentCount: 0,
        stagedCount: 0,
        syncedAt: staged.data.stagedAt,
      },
      commandName,
      translate("local.activity.noResend"),
    );
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const activity of staged.data.activities) {
    try {
      const recorded = await activityApi.recordCurrentApp({
        appName: activity.appName,
        durationSeconds: activity.durationSeconds ?? null,
        endedAt: activity.endedAt,
        localActivityId: activity.localActivityId,
        roomId: activity.roomId ?? null,
        startedAt: activity.startedAt,
        windowTitle: activity.windowTitle ?? null,
      });
      await tauriCommands.markActivityContextSynced({
        localActivityId: activity.localActivityId,
        serverActivityLogId: recorded.id,
        status: "SYNCED",
      });
      sentCount += 1;
    } catch {
      failedCount += 1;
      await tauriCommands
        .markActivityContextSynced({
          localActivityId: activity.localActivityId,
          status: "FAILED",
        })
        .catch(() => undefined);
    }
  }

  return ready(
    {
      failedCount,
      sentCount,
      stagedCount: staged.data.activities.length,
      syncedAt: new Date().toISOString(),
    },
    commandName,
    translate("local.activity.resent", { count: sentCount }),
  );
}

function parseIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function resolveIncrementalActivitySegment(
  appName: string,
  windowTitle: string | undefined,
  durationSeconds: number,
  capturedAt: Date,
): ActivityRecordSegment | null {
  const focusKey = `${appName}\u0000${windowTitle ?? ""}`;
  const previousDuration =
    incrementalActivityCheckpoint?.focusKey === focusKey
      ? Math.min(incrementalActivityCheckpoint.recordedDurationSeconds, durationSeconds)
      : 0;
  const nextDuration = Math.max(0, durationSeconds - previousDuration);

  if (nextDuration <= 0) {
    return null;
  }

  return {
    durationSeconds: nextDuration,
    endedAt: capturedAt.toISOString(),
    startedAt: new Date(capturedAt.getTime() - nextDuration * 1000).toISOString(),
  };
}

function rememberIncrementalActivityCheckpoint(
  appName: string,
  windowTitle: string | undefined,
  durationSeconds: number,
) {
  incrementalActivityCheckpoint = {
    focusKey: `${appName}\u0000${windowTitle ?? ""}`,
    recordedDurationSeconds: durationSeconds,
  };
}

export function resetIncrementalActivityCheckpoint() {
  incrementalActivityCheckpoint = null;
}

async function readServerActivityConsent() {
  const privacy = await settingsApi.getPrivacyConsents();
  return Boolean(privacy.activityDetectionEnabled);
}

async function mirrorNativeActivityConsent(enabled: boolean) {
  try {
    await tauriCommands.setActivityContextConsent({ enabled });
    return true;
  } catch {
    return false;
  }
}

function notifyLocalActivityRecorded(todayActivities: unknown[]) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(LOCAL_ACTIVITY_RECORDED_EVENT, {
      detail: { todayActivities },
    }),
  );
}
