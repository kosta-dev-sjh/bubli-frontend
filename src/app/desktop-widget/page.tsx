"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { DesktopWidgetBubble, desktopWidgetBubbleTypes } from "@/features/widget/components/desktop-widget-bubble";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

function getRequestedBubble(value: string | null): WidgetBubbleType {
  return desktopWidgetBubbleTypes.includes(value as WidgetBubbleType) ? (value as WidgetBubbleType) : "todo";
}

function getRequestedMode(value: string | null): WidgetWindowMode {
  if (value === "GHOST" || value === "MINIMIZED" || value === "TRANSLUCENT") return value;
  return "DEFAULT";
}

function DesktopWidgetSurface() {
  const isTauri = isTauriRuntime();
  const searchParams = useSearchParams();
  const requestedBubble = getRequestedBubble(searchParams.get("bubble"));
  const requestedMode = getRequestedMode(searchParams.get("mode"));
  const [activeBubble, setActiveBubble] = useState<WidgetBubbleType>(requestedBubble);
  const [mode, setMode] = useState<WidgetWindowMode>(requestedMode);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);
  const [windowVisible, setWindowVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveBubble(requestedBubble);
      if (!isTauri) setMode(requestedMode);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isTauri, requestedBubble, requestedMode]);

  useEffect(() => {
    if (!isTauri) return;

    void tauriCommands
      .getWidgetWindowState({ bubbleType: requestedBubble })
      .then((state) => {
        setActiveBubble(state.activeBubble);
        setMode(state.mode);
        setAlwaysOnTop(state.alwaysOnTop);
        setClickThrough(state.clickThrough);
        setWindowVisible(state.windowVisible);
      })
      .catch(() => {
        // Browser previews and incomplete Tauri permissions should not break the widget surface.
      });
  }, [isTauri, requestedBubble]);

  const setWindowMode = useCallback(
    async (nextMode: WidgetWindowMode) => {
      setMode(nextMode);
      setClickThrough(nextMode === "GHOST");
      setWindowVisible(true);

      if (!isTauri) return;

      try {
        const state = await tauriCommands.setWidgetWindowMode({ bubbleType: activeBubble, mode: nextMode });
        setMode(state.mode);
        setAlwaysOnTop(state.alwaysOnTop);
        setClickThrough(state.clickThrough);
        setWindowVisible(state.windowVisible);
      } catch {
        // Browser preview fallback.
      }
    },
    [activeBubble, isTauri],
  );

  const toggleAlwaysOnTop = useCallback(async () => {
    const enabled = !alwaysOnTop;
    setAlwaysOnTop(enabled);

    if (!isTauri) return;

    try {
      const state = await tauriCommands.setWidgetAlwaysOnTop({ bubbleType: activeBubble, enabled });
      setAlwaysOnTop(state.alwaysOnTop);
    } catch {
      // Browser preview fallback.
    }
  }, [activeBubble, alwaysOnTop, isTauri]);

  const openBubbleWindow = useCallback(
    async (bubbleType: WidgetBubbleType) => {
      setActiveBubble(bubbleType);
      setMode("DEFAULT");
      setWindowVisible(true);

      if (!isTauri) return;

      try {
        const state = await tauriCommands.openWidgetWindow({ bubbleType });
        setActiveBubble(state.activeBubble);
        setMode(state.mode);
        setAlwaysOnTop(state.alwaysOnTop);
        setClickThrough(state.clickThrough);
        setWindowVisible(state.windowVisible);
      } catch {
        // Browser preview fallback.
      }
    },
    [isTauri],
  );

  const closeWindow = useCallback(async () => {
    setMode("MINIMIZED");
    setWindowVisible(false);

    if (!isTauri) return;

    try {
      const state = await tauriCommands.closeWidgetWindow({ bubbleType: activeBubble });
      setMode(state.mode);
      setAlwaysOnTop(state.alwaysOnTop);
      setClickThrough(state.clickThrough);
      setWindowVisible(state.windowVisible);
    } catch {
      // Browser preview fallback.
    }
  }, [activeBubble, isTauri]);

  return (
    <DesktopWidgetBubble
      activeBubble={activeBubble}
      alwaysOnTop={alwaysOnTop}
      clickThrough={clickThrough}
      mode={mode}
      onClose={closeWindow}
      onModeChange={(nextMode) => void setWindowMode(nextMode)}
      onOpenBubble={(bubbleType) => void openBubbleWindow(bubbleType)}
      onRestore={() => void openBubbleWindow(activeBubble)}
      onToggleAlwaysOnTop={() => void toggleAlwaysOnTop()}
      windowVisible={windowVisible}
    />
  );
}

export default function DesktopWidgetSurfacePage() {
  return (
    <Suspense fallback={null}>
      <DesktopWidgetSurface />
    </Suspense>
  );
}
