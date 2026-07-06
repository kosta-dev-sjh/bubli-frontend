"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AUTH_SESSION_CHANGE_EVENT,
  getStoredAuthSession,
  getStoredAuthSessionDiagnostics,
  readTauriAuthSessionDiagnostics,
  restoreStoredAuthSessionFromTauri,
} from "@/lib/auth/auth-session";
import { stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import {
  assertTauriRealGoogleAuthWidgetQa,
  readTauriAuthWidgetQaSnapshot,
} from "@/lib/tauri/tauri-auth-widget-qa";
import { startWidgetDataChangedBridge } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const runtimeSmokeEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const authDiagnosticsEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS === "true";
const realOAuthQaEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";

declare global {
  interface Window {
    __BUBLI_TAURI_AUTH_QA__?: {
      assertRealGoogleAuthWidgetSnapshot: typeof assertTauriRealGoogleAuthWidgetQa;
      getLocalSessionDiagnostics: typeof getStoredAuthSessionDiagnostics;
      readAuthWidgetSnapshot: typeof readTauriAuthWidgetQaSnapshot;
      readTauriMirrorDiagnostics: typeof readTauriAuthSessionDiagnostics;
    };
  }
}

export function TauriPostLoginLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktopWidgetSurface = pathname === "/desktop-widget" || pathname.startsWith("/desktop-widget/");

  // 메인(하이브리드) 창 ↔ 위젯 버블 창 데이터 변경 이벤트 브릿지:
  // window bubli:data-changed → tauri emit(열린 버블이 즉시 조용한 재조회), tauri 수신(버블 안
  // 액션) → window 재발행(useDataRefresh 구독 표면 갱신). 위젯 창 자신은 page가 직접 emit/listen한다.
  useEffect(() => {
    if (!isTauriRuntime() || isDesktopWidgetSurface || runtimeSmokeEnabled) {
      return;
    }

    return startWidgetDataChangedBridge();
  }, [isDesktopWidgetSurface]);

  useEffect(() => {
    if (!isTauriRuntime() || isDesktopWidgetSurface || runtimeSmokeEnabled) {
      return;
    }

    let disposed = false;
    let routingRun = 0;

    async function routeRestoredDesktopSession() {
      const currentRun = ++routingRun;
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      if (disposed || currentRun !== routingRun) {
        return;
      }

      if (!session) {
        await stopTauriAuthenticatedSurfaces();
        return;
      }

      if (!pathname.startsWith("/app")) {
        router.replace("/app/");
      }
    }

    const handleAuthSessionChange = () => void routeRestoredDesktopSession();

    void routeRestoredDesktopSession();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      disposed = true;
      routingRun += 1;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isDesktopWidgetSurface, pathname, router]);

  useEffect(() => {
    if (!isTauriRuntime() || isDesktopWidgetSurface || runtimeSmokeEnabled || !pathname.startsWith("/app")) {
      return;
    }

    let disposed = false;

    async function redirectMissingSessionToLogin() {
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      if (disposed || session) {
        return;
      }

      await stopTauriAuthenticatedSurfaces().catch(() => undefined);
      if (disposed) {
        return;
      }

      router.replace("/login");
      window.setTimeout(() => {
        if (!disposed && window.location.pathname.startsWith("/app")) {
          window.location.replace("/login");
        }
      }, 250);
    }

    void redirectMissingSessionToLogin();

    return () => {
      disposed = true;
    };
  }, [isDesktopWidgetSurface, pathname, router]);

  useEffect(() => {
    if (
      !(authDiagnosticsEnabled || realOAuthQaEnabled) ||
      !isTauriRuntime() ||
      isDesktopWidgetSurface ||
      runtimeSmokeEnabled
    ) {
      return;
    }

    window.__BUBLI_TAURI_AUTH_QA__ = {
      assertRealGoogleAuthWidgetSnapshot: assertTauriRealGoogleAuthWidgetQa,
      getLocalSessionDiagnostics: getStoredAuthSessionDiagnostics,
      readAuthWidgetSnapshot: readTauriAuthWidgetQaSnapshot,
      readTauriMirrorDiagnostics: readTauriAuthSessionDiagnostics,
    };

    return () => {
      delete window.__BUBLI_TAURI_AUTH_QA__;
    };
  }, [isDesktopWidgetSurface]);

  return null;
}
