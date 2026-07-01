import { widgetApi } from "@/features/widget/api/widgetApi";
import { getLocalAdapterEnvironment } from "@/lib/local/adapter-result";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { WidgetSummaryResponse } from "@/types/api/widget";
import type { LocalAdapterEnvironment } from "@/types/local";

export type WidgetSummaryReadSource = "local-cache" | "server-api";

export type WidgetSummaryFallbackReason =
  | "local_cache_empty"
  | "local_cache_failed"
  | "local_cache_reader_missing"
  | "not_tauri_runtime";

export type WidgetSummaryClientReady = {
  data: WidgetSummaryResponse;
  environment: LocalAdapterEnvironment;
  fallbackReason?: WidgetSummaryFallbackReason;
  source: WidgetSummaryReadSource;
  status: "ready";
};

export type WidgetSummaryClientPending = {
  environment: "tauri";
  message: string;
  source: "local-cache";
  status: "pending";
  summary: {
    fallback: "server-api";
    reason: WidgetSummaryFallbackReason;
  };
};

export type WidgetSummaryClientFailed = {
  environment: LocalAdapterEnvironment;
  fallbackReason?: WidgetSummaryFallbackReason;
  message: string;
  source: WidgetSummaryReadSource;
  status: "failed";
};

export type WidgetSummaryClientResult =
  | WidgetSummaryClientReady
  | WidgetSummaryClientPending
  | WidgetSummaryClientFailed;

export type WidgetLocalSummaryReader = () => Promise<WidgetSummaryResponse | null> | WidgetSummaryResponse | null;
export type WidgetLocalSummaryWriter = (summary: WidgetSummaryResponse) => Promise<void> | void;

export type WidgetSummaryClientOptions = {
  fetchServerSummary?: () => Promise<WidgetSummaryResponse>;
  preferLocalCache?: boolean;
  readLocalSummary?: WidgetLocalSummaryReader;
  writeLocalSummary?: WidgetLocalSummaryWriter;
};

export async function readWidgetSummary(
  options: WidgetSummaryClientOptions = {},
): Promise<WidgetSummaryClientResult> {
  const environment = getLocalAdapterEnvironment();
  const fetchServerSummary = options.fetchServerSummary ?? widgetApi.getSummary;
  const preferLocalCache = options.preferLocalCache ?? true;
  const readLocalSummary =
    options.readLocalSummary ?? (isTauriRuntime() ? readLocalWidgetSummaryCache : undefined);
  const writeLocalSummary =
    options.writeLocalSummary ?? (isTauriRuntime() ? writeLocalWidgetSummaryCache : undefined);

  if (!preferLocalCache || !isTauriRuntime()) {
    return readServerWidgetSummary(fetchServerSummary, environment, "not_tauri_runtime", writeLocalSummary);
  }

  if (!readLocalSummary) {
    return readServerWidgetSummary(fetchServerSummary, environment, "local_cache_reader_missing", writeLocalSummary);
  }

  try {
    const localSummary = await readLocalSummary();

    if (localSummary) {
      return {
        data: localSummary,
        environment,
        source: "local-cache",
        status: "ready",
      };
    }

    return readServerWidgetSummary(fetchServerSummary, environment, "local_cache_empty", writeLocalSummary);
  } catch {
    return readServerWidgetSummary(fetchServerSummary, environment, "local_cache_failed", writeLocalSummary);
  }
}

export function getWidgetSummaryLocalCachePending(): WidgetSummaryClientPending {
  return {
    environment: "tauri",
    message: "로컬 위젯 표시 캐시 reader가 연결되면 SQLite summary를 먼저 읽고 서버 API를 fallback으로 씁니다.",
    source: "local-cache",
    status: "pending",
    summary: {
      fallback: "server-api",
      reason: "local_cache_reader_missing",
    },
  };
}

async function readServerWidgetSummary(
  fetchServerSummary: () => Promise<WidgetSummaryResponse>,
  environment: LocalAdapterEnvironment,
  fallbackReason?: WidgetSummaryFallbackReason,
  writeLocalSummary?: WidgetLocalSummaryWriter,
): Promise<WidgetSummaryClientReady | WidgetSummaryClientFailed> {
  try {
    const data = await fetchServerSummary();
    await writeLocalSummary?.(data);

    return {
      data,
      environment,
      fallbackReason,
      source: "server-api",
      status: "ready",
    };
  } catch (error) {
    return {
      environment,
      fallbackReason,
      message: error instanceof Error ? error.message : "위젯 summary를 읽지 못했습니다.",
      source: "server-api",
      status: "failed",
    };
  }
}

async function readLocalWidgetSummaryCache(): Promise<WidgetSummaryResponse | null> {
  const cached = await tauriCommands.readWidgetSummaryCache();
  if (!cached) return null;
  const parsed = JSON.parse(cached.summaryJson);
  return isWidgetSummaryResponse(parsed) ? parsed : null;
}

async function writeLocalWidgetSummaryCache(summary: WidgetSummaryResponse) {
  await tauriCommands.storeWidgetSummaryCache({
    summaryJson: JSON.stringify(summary),
  });
}

function isWidgetSummaryResponse(value: unknown): value is WidgetSummaryResponse {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<WidgetSummaryResponse>;
  return !!summary.context && typeof summary.context === "object" && Array.isArray(summary.bubbles);
}
