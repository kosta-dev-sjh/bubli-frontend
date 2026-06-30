import { readCurrentActivityContext } from "@/lib/local/activity-client";
import { getLocalCacheReadiness } from "@/lib/local/local-cache-client";
import { searchPersonalLocalFiles } from "@/lib/local/managed-folder-client";
import { getLocalSyncOutboxSummary } from "@/lib/sync/local-sync-client";
import type { LocalAdapterSmokeResult } from "@/types/local";

export async function smokeLocalAdapterContracts(): Promise<LocalAdapterSmokeResult> {
  const [folderSearch, outbox] = await Promise.all([
    searchPersonalLocalFiles({ limit: 1, query: "" }),
    getLocalSyncOutboxSummary(),
  ]);

  return {
    activity: await readCurrentActivityContext({ consentGranted: false }),
    cache: getLocalCacheReadiness(),
    folderSearch,
    outbox,
  };
}
