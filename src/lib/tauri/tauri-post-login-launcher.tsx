"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  AUTH_SESSION_CHANGE_EVENT,
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

    async function launchAuthenticatedSurfaces() {
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      const hasAuthenticatedSession = Boolean(session);
      if (!hasAuthenticatedSession) {
        await stopTauriAuthenticatedSurfaces();
        return;
      }

      void launchTauriAuthenticatedSurfaces().catch(() => undefined);
    }

    const handleAuthSessionChange = () => void launchAuthenticatedSurfaces();

    void launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, [isDesktopWidgetSurface]);

  return null;
}
