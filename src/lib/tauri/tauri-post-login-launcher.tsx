"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { authApi } from "@/features/auth/api/authApi";
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

    async function launchAuthenticatedSurfaces() {
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      const hasAuthenticatedSession = Boolean(session);
      if (!hasAuthenticatedSession) {
        await stopTauriAuthenticatedSurfaces();
        return;
      }

      try {
        await authApi.getMe();
      } catch {
        await stopTauriAuthenticatedSurfaces();
        clearStoredAuthSession();
        return;
      }

      if (disposed) {
        return;
      }

      void launchTauriAuthenticatedSurfaces().catch(() => undefined);
    }

    const handleAuthSessionChange = () => void launchAuthenticatedSurfaces();

    void launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      disposed = true;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isDesktopWidgetSurface]);

  return null;
}
