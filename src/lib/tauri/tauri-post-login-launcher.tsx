"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { authApi } from "@/features/auth/api/authApi";
import { ApiClientError } from "@/lib/api/errors";
import {
  AUTH_SESSION_CHANGE_EVENT,
  clearStoredAuthSession,
  getStoredAuthSession,
  getStoredAuthSessionDiagnostics,
  readTauriAuthSessionDiagnostics,
  restoreStoredAuthSessionFromTauri,
} from "@/lib/auth/auth-session";
import { launchTauriAuthenticatedSurfaces, stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { startWidgetDataChangedBridge } from "@/lib/tauri/events";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const runtimeSmokeEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true";
const authDiagnosticsEnabled = process.env.NEXT_PUBLIC_BUBLI_TAURI_AUTH_DIAGNOSTICS === "true";

declare global {
  interface Window {
    __BUBLI_TAURI_AUTH_QA__?: {
      getLocalSessionDiagnostics: typeof getStoredAuthSessionDiagnostics;
      readTauriMirrorDiagnostics: typeof readTauriAuthSessionDiagnostics;
    };
  }
}

export function TauriPostLoginLauncher() {
  const pathname = usePathname();
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
    let validationRun = 0;

    async function launchAuthenticatedSurfaces() {
      const currentRun = ++validationRun;
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      if (disposed || currentRun !== validationRun) {
        return;
      }

      const hasAuthenticatedSession = Boolean(session);
      if (!hasAuthenticatedSession) {
        await stopTauriAuthenticatedSurfaces();
        return;
      }

      try {
        await authApi.getMe();
      } catch (error) {
        if (disposed || currentRun !== validationRun) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          await stopTauriAuthenticatedSurfaces();
          clearStoredAuthSession();
        }
        return;
      }

      if (disposed || currentRun !== validationRun) {
        return;
      }

      if (!getStoredAuthSession()) {
        await stopTauriAuthenticatedSurfaces();
        return;
      }

      void launchTauriAuthenticatedSurfaces().catch(() => undefined);
    }

    const handleAuthSessionChange = () => void launchAuthenticatedSurfaces();

    void launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      disposed = true;
      validationRun += 1;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isDesktopWidgetSurface]);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      !authDiagnosticsEnabled ||
      !isTauriRuntime() ||
      isDesktopWidgetSurface ||
      runtimeSmokeEnabled
    ) {
      return;
    }

    window.__BUBLI_TAURI_AUTH_QA__ = {
      getLocalSessionDiagnostics: getStoredAuthSessionDiagnostics,
      readTauriMirrorDiagnostics: readTauriAuthSessionDiagnostics,
    };

    return () => {
      delete window.__BUBLI_TAURI_AUTH_QA__;
    };
  }, [isDesktopWidgetSurface]);

  return null;
}
