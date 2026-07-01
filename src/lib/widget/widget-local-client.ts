import { widgetApi } from "@/features/widget/api/widgetApi";
import { failed, getErrorMessage, ready, runTauriAdapter } from "@/lib/local/adapter-result";
import { recordWidgetUsageEvent, rollupWidgetUsage } from "@/lib/local";
import { stageWidgetUsageSummary } from "@/lib/sync";
import {
  TAURI_COMMANDS,
  tauriCommands,
  type WidgetBubbleType,
  type WidgetUsageSummaryStagedRollup,
} from "@/lib/tauri/commands";
import { toApiWidgetBubbleType, toLocalWidgetBubbleType } from "@/lib/widget/widget-types";
import type {
  WidgetSettingsResponse,
  WidgetItemStateUpdateRequest,
  WidgetUsageRollupRequest,
  WidgetUsageRollupResponse,
  WidgetUsageSummarySaveRequest,
} from "@/types/api/widget";
import type {
  LocalAdapterResult,
  WidgetUsageEventAdapterInput,
  WidgetUsageRollupAdapterInput,
  WidgetUsageRollupAdapterResult,
  WidgetUsageSummarySyncAdapterInput,
  WidgetUsageSummarySyncAdapterResult,
} from "@/types/local";

export type WidgetItemStateSaveInput = WidgetItemStateUpdateRequest & {
  itemStateId: string;
};

export type WidgetUsageServerSyncResult = {
  failedCount: number;
  markedSyncedCount: number;
  responses: WidgetUsageRollupResponse[];
  sentCount: number;
  stagedCount: number;
  syncedAt: string;
};

type ServerUsageRollupMapping = {
  localRollupKey: string;
  request: WidgetUsageRollupRequest;
};

function getWidgetUsageDeviceId(): string {
  return "tauri-local-device";
}

function isLocalWidgetBubbleType(value: string): value is WidgetBubbleType {
  return ["agent", "alert", "chat", "memo", "resource", "schedule", "timer", "todo"].includes(value);
}

function toServerUsageRollupMappings(
  rollups: WidgetUsageSummaryStagedRollup[],
  settings: WidgetSettingsResponse,
  syncedAt: string,
): ServerUsageRollupMapping[] {
  const settingsByType = new Map(settings.bubbles.map((bubble) => [bubble.bubbleType, bubble]));
  const deviceId = getWidgetUsageDeviceId();

  return rollups.flatMap((rollup) => {
    if (!isLocalWidgetBubbleType(rollup.bubbleType)) {
      return [];
    }

    const apiBubbleType = toApiWidgetBubbleType(rollup.bubbleType);
    const setting = settingsByType.get(apiBubbleType);
    if (!setting) {
      return [];
    }

    return [
      {
        localRollupKey: rollup.rollupKey,
        request: {
          bubbleSettingId: setting.id,
          bubbleType: apiBubbleType,
          deviceId,
          interactionCount: Math.max(0, rollup.interactionCount ?? rollup.sourceEventCount),
          openCount: Math.max(0, rollup.openCount ?? 0),
          rollupKey: `${deviceId}:${setting.id}:${rollup.rollupKey}`,
          sourceEventCount: rollup.sourceEventCount,
          summaryDate: rollup.summaryDate,
          syncedAt,
          visibleSeconds: Math.max(0, rollup.visibleSeconds ?? rollup.sourceEventCount),
        },
      },
    ];
  });
}

function toUsageSummarySaveRequest(request: WidgetUsageRollupRequest): WidgetUsageSummarySaveRequest {
  return {
    bubbleSettingId: request.bubbleSettingId,
    deviceId: request.deviceId,
    interactionCount: request.interactionCount,
    openCount: request.openCount,
    rollupKey: request.rollupKey,
    summaryDate: request.summaryDate,
    syncedAt: request.syncedAt,
    visibleSeconds: request.visibleSeconds,
  };
}

export async function saveWidgetItemState(input: WidgetItemStateSaveInput): Promise<null> {
  const { itemStateId, ...body } = input;

  return widgetApi.updateItemState(itemStateId, body);
}

export async function recordLocalWidgetUsageEvent(input: WidgetUsageEventAdapterInput) {
  return recordWidgetUsageEvent(input);
}

export async function recordApiWidgetUsageEvent(
  input: Omit<WidgetUsageEventAdapterInput, "bubbleType"> & Pick<WidgetItemStateUpdateRequest, "bubbleType">,
) {
  return recordWidgetUsageEvent({
    ...input,
    bubbleType: toLocalWidgetBubbleType(input.bubbleType),
  });
}

export async function rollupLocalWidgetUsage(
  input?: WidgetUsageRollupAdapterInput,
): Promise<WidgetUsageRollupAdapterResult> {
  return rollupWidgetUsage(input);
}

export async function stageLocalWidgetUsageSummary(
  input?: WidgetUsageSummarySyncAdapterInput,
): Promise<WidgetUsageSummarySyncAdapterResult> {
  return stageWidgetUsageSummary(input);
}

export async function syncWidgetUsageRollupsToServer(
  rollups: WidgetUsageRollupRequest[],
): Promise<WidgetUsageRollupResponse[]> {
  return widgetApi.syncUsageRollups(rollups);
}

export async function syncLocalWidgetUsageSummaryToServer(
  input?: WidgetUsageSummarySyncAdapterInput,
): Promise<LocalAdapterResult<WidgetUsageServerSyncResult>> {
  const commandName = TAURI_COMMANDS.syncWidgetUsageSummary;
  const staged = await runTauriAdapter(commandName, () => tauriCommands.syncWidgetUsageSummary(input));

  if (staged.status !== "ready") {
    return staged;
  }

  if (staged.data.rollups.length === 0) {
    return ready(
      {
        failedCount: staged.data.failedCount,
        markedSyncedCount: 0,
        responses: [],
        sentCount: 0,
        stagedCount: 0,
        syncedAt: staged.data.syncedAt,
      },
      commandName,
      "No local widget usage rollups are waiting for server sync.",
    );
  }

  try {
    const settings = await widgetApi.getSettings();
    const syncedAt = new Date().toISOString();
    const mappings = toServerUsageRollupMappings(staged.data.rollups, settings, syncedAt);
    if (mappings.length === 0) {
      return failed("No staged widget usage rollups matched the current backend widget settings.", commandName);
    }

    const settled = await Promise.allSettled(
      mappings.map(async (mapping) => ({
        localRollupKey: mapping.localRollupKey,
        response: await widgetApi.saveUsageSummary(toUsageSummarySaveRequest(mapping.request)),
      })),
    );
    const successful = settled
      .filter((result): result is PromiseFulfilledResult<{ localRollupKey: string; response: WidgetUsageRollupResponse }> => result.status === "fulfilled")
      .map((result) => result.value);

    if (successful.length === 0) {
      return failed("All staged widget usage rollups failed to sync to the backend.", commandName);
    }

    const responses = successful.map((result) => result.response);
    const localRollupKeys = successful.map((result) => result.localRollupKey);
    const markResult = await tauriCommands.markWidgetUsageSummarySynced({ rollupKeys: localRollupKeys });
    const rejectedCount = settled.filter((result) => result.status === "rejected").length;
    const unmatchedCount = Math.max(0, staged.data.rollups.length - mappings.length);
    const failedCount = staged.data.failedCount + rejectedCount + unmatchedCount;

    return ready(
      {
        failedCount,
        markedSyncedCount: markResult.syncedCount,
        responses,
        sentCount: responses.length,
        stagedCount: staged.data.rollups.length,
        syncedAt,
      },
      commandName,
      failedCount > 0
        ? `Synced ${responses.length} widget usage rollup${responses.length === 1 ? "" : "s"} to the backend; ${failedCount} remain pending.`
        : `Synced ${responses.length} widget usage rollup${responses.length === 1 ? "" : "s"} to the backend.`,
    );
  } catch (error) {
    return failed(getErrorMessage(error), commandName);
  }
}
