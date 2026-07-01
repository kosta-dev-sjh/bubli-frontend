import { widgetApi } from "@/features/widget/api/widgetApi";
import { recordWidgetUsageEvent, rollupWidgetUsage } from "@/lib/local";
import { stageWidgetUsageSummary } from "@/lib/sync";
import { toLocalWidgetBubbleType } from "@/lib/widget/widget-types";
import type {
  WidgetItemStateUpdateRequest,
  WidgetUsageRollupRequest,
  WidgetUsageRollupResponse,
} from "@/types/api/widget";
import type {
  WidgetUsageEventAdapterInput,
  WidgetUsageRollupAdapterInput,
  WidgetUsageRollupAdapterResult,
  WidgetUsageSummarySyncAdapterInput,
  WidgetUsageSummarySyncAdapterResult,
} from "@/types/local";

export type WidgetItemStateSaveInput = WidgetItemStateUpdateRequest & {
  itemStateId: string;
};

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

