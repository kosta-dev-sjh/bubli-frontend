"use client";

import { useEffect, useRef } from "react";

import { widgetApi, type WidgetBubbleSettingResponse } from "@/features/widget/api/widgetApi";
import { AUTH_SESSION_CHANGE_EVENT, getStoredAuthSession } from "@/lib/auth/auth-session";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

const startupBubbleOrder: WidgetBubbleType[] = ["todo", "chat", "agent", "timer", "memo", "schedule", "resource", "alert"];

const apiBubbleToWindowBubble: Record<WidgetBubbleSettingResponse["bubbleType"], WidgetBubbleType> = {
  AGENT: "agent",
  ALERT: "alert",
  CHAT: "chat",
  MEMO: "memo",
  RESOURCE: "resource",
  SCHEDULE: "schedule",
  TIMER: "timer",
  TODO: "todo",
};

function modeFromSetting(setting?: WidgetBubbleSettingResponse): WidgetWindowMode {
  if (!setting) return "DEFAULT";
  if (setting.minimized) return "MINIMIZED";
  if (setting.ghostMode) return "GHOST";
  if (setting.opacity !== null && setting.opacity !== undefined && setting.opacity < 0.95) return "TRANSLUCENT";
  return "DEFAULT";
}

function resolveStartupSetting(settings: WidgetBubbleSettingResponse[]) {
  const visibleSettings = settings.filter((setting) => setting.enabled && !setting.minimized);

  return startupBubbleOrder
    .map((bubbleType) => visibleSettings.find((setting) => apiBubbleToWindowBubble[setting.bubbleType] === bubbleType))
    .find(Boolean)
    ?? null;
}

async function openStartupWidget() {
  const settings = await widgetApi.getSettings().then((response) => response.bubbles).catch(() => []);
  const startupSetting = resolveStartupSetting(settings);
  const bubbleType = startupSetting ? apiBubbleToWindowBubble[startupSetting.bubbleType] : "todo";
  const mode = modeFromSetting(startupSetting ?? undefined);
  const windowId = bubbleType;

  const opened = await tauriCommands.openWidgetWindow({
    bubbleType,
    mode,
    windowId,
  });

  if (startupSetting && Number.isFinite(startupSetting.x) && Number.isFinite(startupSetting.y)) {
    return tauriCommands.setWidgetWindowPosition({
      bubbleType,
      windowId,
      x: startupSetting.x,
      y: startupSetting.y,
    });
  }

  return opened;
}

export function TauriPostLoginLauncher() {
  const launchedRef = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    function launchAuthenticatedSurfaces() {
      const hasAuthenticatedSession = Boolean(getStoredAuthSession());
      if (launchedRef.current || !hasAuthenticatedSession) {
        return;
      }

      launchedRef.current = true;

      void tauriCommands.appReady().catch(() => undefined);
      void openStartupWidget()
        .catch(() => {
          launchedRef.current = false;
        });
    }

    launchAuthenticatedSurfaces();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, launchAuthenticatedSurfaces);
    };
  }, []);

  return null;
}
