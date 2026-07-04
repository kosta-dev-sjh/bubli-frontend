import { widgetApi } from "@/features/widget/api/widgetApi";
import { getStoredAuthSession } from "@/lib/auth/auth-session";
import { getLocalAdapterEnvironment } from "@/lib/local/adapter-result";
import { translate } from "@/lib/i18n/translate";
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
  selectedRoomId?: string | null;
  writeLocalSummary?: WidgetLocalSummaryWriter;
};

export async function readWidgetSummary(
  options: WidgetSummaryClientOptions = {},
): Promise<WidgetSummaryClientResult> {
  const environment = getLocalAdapterEnvironment();
  const selectedRoomId = options.selectedRoomId?.trim() || null;
  const summaryCacheKey = getWidgetSummaryCacheKey(selectedRoomId);
  const fetchServerSummary = options.fetchServerSummary ?? (() => widgetApi.getSummary(selectedRoomId));
  const preferLocalCache = options.preferLocalCache ?? true;
  const readLocalSummary =
    options.readLocalSummary ?? (isTauriRuntime() ? () => readLocalWidgetSummaryCache(summaryCacheKey) : undefined);
  const writeLocalSummary =
    options.writeLocalSummary ?? (isTauriRuntime() ? (summary) => writeLocalWidgetSummaryCache(summary, summaryCacheKey) : undefined);

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
    message: translate("local.widget.readerPending"),
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
      message: error instanceof Error ? error.message : translate("local.widget.readFailed"),
      source: "server-api",
      status: "failed",
    };
  }
}

// ---------- 룸 이름 로컬 캐시 ----------
// 위젯 TODO 버블은 개인 컨텍스트에서 "나에게 할당된 룸 태스크"에 룸 칩(룸 이름)을 붙인다.
// 서버 summary/tasks 응답에는 roomId만 있고 이름이 없으므로, 프로젝트룸 목록 조회 결과를
// 같은 local_widget_display_cache 행(summary JSON)에 roomNames 필드로 병합 저장해
// 오프라인/서버 실패 시에도 칩 라벨을 복원할 수 있게 한다. Rust 쪽 validation은
// context/bubbles만 확인하므로 추가 필드는 그대로 통과한다.

export type WidgetRoomNameMap = Record<string, string>;

type CachedWidgetSummary = WidgetSummaryResponse & { roomNames?: WidgetRoomNameMap };

function isWidgetRoomNameMap(value: unknown): value is WidgetRoomNameMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((name) => typeof name === "string");
}

export async function readCachedWidgetRoomNames(selectedRoomId?: string | null): Promise<WidgetRoomNameMap | null> {
  if (!isTauriRuntime()) return null;

  const cacheKey = getWidgetSummaryCacheKey(selectedRoomId?.trim() || null);
  if (!cacheKey) return null;

  try {
    const cached = await tauriCommands.readWidgetSummaryCache({ cacheKey });
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached.summaryJson);
    if (!isWidgetSummaryResponse(parsed)) return null;
    const roomNames = (parsed as CachedWidgetSummary).roomNames;
    return isWidgetRoomNameMap(roomNames) ? roomNames : null;
  } catch {
    return null;
  }
}

export async function writeCachedWidgetRoomNames(
  roomNames: WidgetRoomNameMap,
  selectedRoomId?: string | null,
): Promise<void> {
  if (!isTauriRuntime()) return;

  const cacheKey = getWidgetSummaryCacheKey(selectedRoomId?.trim() || null);
  if (!cacheKey) return;

  try {
    // summary 캐시 행이 있어야 병합 저장할 수 있다(테이블 스키마/validation 유지 — 별도 마이그레이션 없음).
    const cached = await tauriCommands.readWidgetSummaryCache({ cacheKey });
    if (!cached) return;
    const parsed: unknown = JSON.parse(cached.summaryJson);
    if (!isWidgetSummaryResponse(parsed)) return;
    (parsed as CachedWidgetSummary).roomNames = roomNames;
    await tauriCommands.storeWidgetSummaryCache({ cacheKey, summaryJson: JSON.stringify(parsed) });
  } catch {
    // best-effort: 캐시 실패가 위젯 표시를 막지 않는다.
  }
}

async function readLocalWidgetSummaryCache(cacheKey: string | null): Promise<WidgetSummaryResponse | null> {
  if (!cacheKey) return null;

  const cached = await tauriCommands.readWidgetSummaryCache({ cacheKey });
  if (!cached) return null;
  const parsed = JSON.parse(cached.summaryJson);
  return isWidgetSummaryResponse(parsed) ? parsed : null;
}

async function writeLocalWidgetSummaryCache(summary: WidgetSummaryResponse, cacheKey: string | null) {
  if (!cacheKey) return;

  await tauriCommands.storeWidgetSummaryCache({
    cacheKey,
    summaryJson: JSON.stringify(summary),
  });
}

function getWidgetSummaryCacheKey(selectedRoomId?: string | null) {
  const token = getStoredAuthSession()?.accessToken ?? null;
  const subject = getJwtSubject(token);
  const contextScope = selectedRoomId?.trim() ? `room:${selectedRoomId.trim()}` : "context";
  if (subject) return `sub:${subject}:${contextScope}`;
  if (token?.trim()) return `token:${hashCacheToken(token)}:${contextScope}`;
  return null;
}

function getJwtSubject(token: string | null) {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(base64)) as { sub?: unknown };
    return typeof parsed.sub === "string" && parsed.sub.trim() ? parsed.sub.trim() : null;
  } catch {
    return null;
  }
}

function hashCacheToken(token: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isWidgetSummaryResponse(value: unknown): value is WidgetSummaryResponse {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<WidgetSummaryResponse>;
  return !!summary.context && typeof summary.context === "object" && Array.isArray(summary.bubbles);
}
