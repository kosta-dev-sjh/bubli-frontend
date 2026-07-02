"use client";

import { useEffect } from "react";

import {
  AUTH_SESSION_CHANGE_EVENT,
  getStoredAuthSession,
  restoreStoredAuthSessionFromTauri,
} from "@/lib/auth/auth-session";
import { stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import {
  closeTauriAuthenticatedSurfaces,
  launchTauriAuthenticatedSurfaces,
} from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { stopWidgetUsageAutoSync } from "@/lib/widget/widget-usage-auto-sync";

export function TauriPostLoginLauncher() {
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    async function launchAuthenticatedSurfaces() {
      const session = getStoredAuthSession() ?? (await restoreStoredAuthSessionFromTauri());
      const hasAuthenticatedSession = Boolean(session);
      if (!hasAuthenticatedSession) {
        stopActivityAutoCapture();
        stopManagedFolderAutoSync();
        stopWidgetUsageAutoSync();
        void closeTauriAuthenticatedSurfaces();
        return;
      }

      void launchTauriAuthenticatedSurfaces().catch(() => undefined);
    }

    const handleAuthSessionChange = () => void launchAuthenticatedSurfaces();

    void launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
      stopActivityAutoCapture();
      stopManagedFolderAutoSync();
      stopWidgetUsageAutoSync();
    };
  }, []);

  return null;
}
