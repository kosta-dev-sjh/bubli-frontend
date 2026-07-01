import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { TauriCommandName } from "@/lib/tauri/commands";
import type {
  LocalAdapterBlocked,
  LocalAdapterBlockedReason,
  LocalAdapterEnvironment,
  LocalAdapterFailed,
  LocalAdapterPending,
  LocalAdapterReady,
  LocalAdapterResult,
  LocalAdapterUnavailable,
} from "@/types/local";

export function getLocalAdapterEnvironment(): LocalAdapterEnvironment {
  if (isTauriRuntime()) {
    return "tauri";
  }

  return typeof window === "undefined" ? "server" : "browser";
}

export function unavailable(commandName?: TauriCommandName): LocalAdapterUnavailable {
  const environment = getLocalAdapterEnvironment();

  return {
    commandName,
    environment: environment === "tauri" ? "browser" : environment,
    message: "Tauri 앱이 아닐 때는 로컬 SQLite와 개인 폴더 기능을 사용할 수 없습니다.",
    reason: "requires_tauri",
    status: "unavailable",
  };
}

export function blocked(
  reason: LocalAdapterBlockedReason,
  message: string,
  commandName?: TauriCommandName,
): LocalAdapterBlocked {
  return {
    commandName,
    environment: getLocalAdapterEnvironment(),
    message,
    reason,
    status: "blocked",
  };
}

export function pending<TSummary>(
  summary: TSummary,
  message: string,
  commandName?: TauriCommandName,
): LocalAdapterPending<TSummary> {
  return {
    commandName,
    environment: "tauri",
    message,
    status: "pending",
    summary,
  };
}

export function ready<TData>(
  data: TData,
  commandName?: TauriCommandName,
  message?: string,
): LocalAdapterReady<TData> {
  return {
    commandName,
    data,
    environment: "tauri",
    message,
    status: "ready",
  };
}

export function failed(
  message: string,
  commandName?: TauriCommandName,
): LocalAdapterFailed {
  return {
    commandName,
    environment: getLocalAdapterEnvironment(),
    message,
    reason: "tauri_command_failed",
    status: "failed",
  };
}

export async function runTauriAdapter<TData>(
  commandName: TauriCommandName,
  action: () => Promise<TData>,
): Promise<LocalAdapterResult<TData>> {
  if (!isTauriRuntime()) {
    return unavailable(commandName);
  }

  try {
    return ready(await action(), commandName);
  } catch (error) {
    return failed(getErrorMessage(error), commandName);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "알 수 없는 Tauri 명령 오류가 발생했습니다.";
}

export function hasProjectRoomScope(input?: { roomId?: string | null }): boolean {
  return Boolean(input?.roomId);
}
