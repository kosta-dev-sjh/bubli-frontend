import { activityApi } from "@/features/activity/api/activityApi";
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

  if (!input.consentGranted) {
    return blocked(
      "activity_consent_required",
      translate("local.activity.consentRequired"),
      commandName,
    );
  }

  return runTauriAdapter(commandName, () => tauriCommands.readActivityContext());
}

export async function recordCurrentActivityContext(
  input: ActivityContextRecordInput,
): Promise<ActivityContextRecordAdapterResult> {
  const commandName = TAURI_COMMANDS.readActivityContext;
  await syncLocalActivityBufferToServer({ limit: 10 }).catch(() => undefined);

  const context = await readCurrentActivityContext(input);

  if (context.status !== "ready") {
    return context;
  }

  const capturedAt = parseIsoDate(context.data.capturedAt);
  const durationSeconds = Math.max(0, Math.trunc(context.data.durationSeconds ?? 0));
  const segment =
    input.recordMode === "incremental"
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
  if (input.recordMode !== "incremental") {
    rememberIncrementalActivityCheckpoint(context.data.appName, context.data.windowTitle, durationSeconds);
  }

  try {
    const recordedActivity = await activityApi.recordCurrentApp({
      appName: context.data.appName,
      durationSeconds: segment.durationSeconds,
      endedAt: segment.endedAt,
      roomId: input.roomId ?? null,
      startedAt: segment.startedAt,
      windowTitle: context.data.windowTitle ?? null,
    });
    await tauriCommands
      .markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        serverActivityLogId: recordedActivity.id,
        status: "SYNCED",
      })
      .catch(() => undefined);
    const todayActivities = await activityApi.getToday();

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
  } catch (error) {
    await tauriCommands
      .markActivityContextSynced({
        localActivityId: localActivity.data.localActivityId,
        status: "FAILED",
      })
      .catch(() => undefined);
    return failed(getErrorMessage(error), commandName);
  }
}

export async function syncLocalActivityBufferToServer(input?: {
  limit?: number;
}): Promise<ActivityBufferSyncAdapterResult> {
  const commandName = TAURI_COMMANDS.stageActivityContextsForSync;
  const staged = await runTauriAdapter(commandName, () =>
    tauriCommands.stageActivityContextsForSync(input),
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

  rememberIncrementalActivityCheckpoint(appName, windowTitle, durationSeconds);

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
