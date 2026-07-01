"use client";

import { useEffect } from "react";

import {
  AUTH_SESSION_CHANGE_EVENT,
  getStoredAuthSession,
  restoreStoredAuthSessionFromTauri,
} from "@/lib/auth/auth-session";
import { stopActivityAutoCapture } from "@/lib/local/activity-auto-capture";
import { stopManagedFolderAutoSync } from "@/lib/local/managed-folder-auto-sync";
import { launchTauriAuthenticatedSurfaces } from "@/lib/tauri/authenticated-surfaces";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

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
    };
  }, []);

  return null;
}
