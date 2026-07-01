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
import type {
  ActivityContextAdapterResult,
  ActivityContextReadInput,
  ActivityContextRecordAdapterResult,
  ActivityContextRecordInput,
} from "@/types/local";

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
      "활동 감지는 사용자가 동의한 뒤에만 읽을 수 있습니다.",
      commandName,
    );
  }

  return runTauriAdapter(commandName, () => tauriCommands.readActivityContext());
}

export async function recordCurrentActivityContext(
  input: ActivityContextRecordInput,
): Promise<ActivityContextRecordAdapterResult> {
  const commandName = TAURI_COMMANDS.readActivityContext;
  const context = await readCurrentActivityContext(input);

  if (context.status !== "ready") {
    return context;
  }

  const capturedAt = parseIsoDate(context.data.capturedAt);
  const durationSeconds = Math.max(0, Math.trunc(context.data.durationSeconds ?? 0));
  const startedAt = new Date(capturedAt.getTime() - durationSeconds * 1000).toISOString();

  try {
    const recordedActivity = await activityApi.recordCurrentApp({
      appName: context.data.appName,
      durationSeconds,
      endedAt: capturedAt.toISOString(),
      roomId: input.roomId ?? null,
      startedAt,
      windowTitle: context.data.windowTitle ?? null,
    });
    const todayActivities = await activityApi.getToday();

    const localSyncMarked = await tauriCommands
      .markActivityEventSyncStatus({
        localEventId: context.data.localEventId,
        serverActivityId: recordedActivity.id,
        status: "SYNCED",
      })
      .then(() => true)
      .catch(() => false);

    return ready(
      {
        appName: context.data.appName,
        context: { ...context.data, syncStatus: localSyncMarked ? "SYNCED" : context.data.syncStatus },
        recordedActivity,
        todayActivities,
        windowTitle: context.data.windowTitle,
      },
      commandName,
      "현재 활동을 서버에 기록했습니다.",
    );
  } catch (error) {
    await tauriCommands
      .markActivityEventSyncStatus({
        localEventId: context.data.localEventId,
        status: "FAILED",
      })
      .catch(() => undefined);
    return failed(getErrorMessage(error), commandName);
  }
}

function parseIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}
