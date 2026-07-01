import { widgetApi } from "@/features/widget/api/widgetApi";
import { getLocalAdapterEnvironment } from "@/lib/local/adapter-result";
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

export type WidgetSummaryClientOptions = {
  fetchServerSummary?: () => Promise<WidgetSummaryResponse>;
  preferLocalCache?: boolean;
  readLocalSummary?: WidgetLocalSummaryReader;
};

export async function readWidgetSummary(
  options: WidgetSummaryClientOptions = {},
): Promise<WidgetSummaryClientResult> {
  const environment = getLocalAdapterEnvironment();
  const fetchServerSummary = options.fetchServerSummary ?? widgetApi.getSummary;
  const preferLocalCache = options.preferLocalCache ?? true;

  if (!preferLocalCache || !isTauriRuntime()) {
    return readServerWidgetSummary(fetchServerSummary, environment, "not_tauri_runtime");
  }

  if (!options.readLocalSummary) {
    return readServerWidgetSummary(fetchServerSummary, environment, "local_cache_reader_missing");
  }

  try {
    const localSummary = await options.readLocalSummary();

    if (localSummary) {
      return {
        data: localSummary,
        environment,
        source: "local-cache",
        status: "ready",
      };
    }

    return readServerWidgetSummary(fetchServerSummary, environment, "local_cache_empty");
  } catch {
    return readServerWidgetSummary(fetchServerSummary, environment, "local_cache_failed");
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
): Promise<WidgetSummaryClientReady | WidgetSummaryClientFailed> {
  try {
    return {
      data: await fetchServerSummary(),
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

