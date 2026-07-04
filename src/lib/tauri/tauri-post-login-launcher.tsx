"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { authApi } from "@/features/auth/api/authApi";
import { ApiClientError } from "@/lib/api/errors";
import {
  AUTH_SESSION_CHANGE_EVENT,
  clearStoredAuthSession,
  getStoredAuthSession,
  restoreStoredAuthSessionFromTauri,
} from "@/lib/auth/auth-session";
import { launchTauriAuthenticatedSurfaces, stopTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export function TauriPostLoginLauncher() {
  const pathname = usePathname();
  const isDesktopWidgetSurface = pathname === "/desktop-widget" || pathname.startsWith("/desktop-widget/");

  useEffect(() => {
    if (!isTauriRuntime() || isDesktopWidgetSurface) {
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

  return null;
}
