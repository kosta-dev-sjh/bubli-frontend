"use client";

import { Bell, CheckCircle2, Clock3, FileText, MessageSquare, MonitorUp, Pin, Settings2, Sparkles, StickyNote, Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DesktopWidgetBubble } from "@/features/widget/components/desktop-widget-bubble";
import { widgetPreviewBubbles } from "@/features/widget/desktop-widget-preview-data";
import { tauriCommands, type WidgetBubbleType, type WidgetWindowMode, type WidgetWindowState } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { recordLocalWidgetUsageEvent, rollupLocalWidgetUsage, stageLocalWidgetUsageSummary } from "@/lib/widget/widget-local-client";

import styles from "./page.module.css";

type WidgetRuntimeState = {
  isTauri: boolean;
  widgetWindow: WidgetWindowState | null;
};

const modeLabels: Record<WidgetWindowMode, string> = {
  DEFAULT: "기본",
  GHOST: "고스트",
  MINIMIZED: "최소화",
  TRANSLUCENT: "반투명",
};

const modeOptions: WidgetWindowMode[] = ["DEFAULT", "TRANSLUCENT", "GHOST", "MINIMIZED"];

const featureIcons: Record<WidgetBubbleType, typeof CheckCircle2> = {
  agent: Sparkles,
  alert: Bell,
  chat: MessageSquare,
  memo: StickyNote,
  resource: FileText,
  schedule: Clock3,
  timer: Timer,
  todo: CheckCircle2,
};

function resolvePreviewBubble(value: WidgetWindowState["activeBubble"] | null | undefined, fallback: WidgetBubbleType): WidgetBubbleType {
  return widgetPreviewBubbles.some((bubble) => bubble.id === value) ? (value as WidgetBubbleType) : fallback;
}

function requestedBubbleFromSearch(): WidgetBubbleType | null {
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("autoOpen");
  return widgetPreviewBubbles.some((bubble) => bubble.id === requested) ? (requested as WidgetBubbleType) : null;
}

function requestedModeFromSearch(): WidgetWindowMode | null {
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("autoMode");
  return modeOptions.includes(requested as WidgetWindowMode) ? (requested as WidgetWindowMode) : null;
}

function runtimeLabel(runtime: WidgetRuntimeState) {
  if (!runtime.isTauri) return "검토 화면";
  if (!runtime.widgetWindow) return "앱 대기";
  return runtime.widgetWindow.windowVisible ? "떠 있음" : "숨김";
}

export default function DesktopWidgetsPage() {
  const [runtime, setRuntime] = useState<WidgetRuntimeState>({ isTauri: false, widgetWindow: null });
  const [previewBubble, setPreviewBubble] = useState<WidgetBubbleType>("todo");
  const [previewMode, setPreviewMode] = useState<WidgetWindowMode>("DEFAULT");
  const [previewAlwaysOnTop, setPreviewAlwaysOnTop] = useState(true);
  const [previewWindowVisible, setPreviewWindowVisible] = useState(true);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const isTauri = isTauriRuntime();
      setRuntime((current) => ({ ...current, isTauri }));

      if (!isTauri) return;

      void tauriCommands
        .getWidgetWindowState()
        .then(async (widgetWindow) => {
          const requestedBubble = requestedBubbleFromSearch();
          const requestedMode = requestedModeFromSearch();

          if (requestedBubble) {
            const opened = await tauriCommands.openWidgetWindow({ bubbleType: requestedBubble });
            const nextWindow = requestedMode ? await tauriCommands.setWidgetWindowMode({ bubbleType: requestedBubble, mode: requestedMode }) : opened;
            setRuntime({ isTauri, widgetWindow: nextWindow });
            setPreviewBubble(resolvePreviewBubble(nextWindow.activeBubble, requestedBubble));
            setPreviewMode(nextWindow.mode);
            setPreviewAlwaysOnTop(nextWindow.alwaysOnTop);
            setPreviewWindowVisible(nextWindow.windowVisible);
            return;
          }

          setRuntime({ isTauri, widgetWindow });
          setPreviewBubble(resolvePreviewBubble(widgetWindow.activeBubble, previewBubble));
          setPreviewMode(widgetWindow.mode);
          setPreviewAlwaysOnTop(widgetWindow.alwaysOnTop);
          setPreviewWindowVisible(widgetWindow.windowVisible);
        })
        .catch(() => {
          setRuntime({ isTauri, widgetWindow: null });
        });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const recordUsage = useCallback(
    (bubbleType: WidgetBubbleType, eventType: string) => {
      if (!isTauriRuntime()) return;
      void recordLocalWidgetUsageEvent({ bubbleType, eventType, occurredAt: new Date().toISOString() });
    },
    [],
  );

  const rollupUsage = useCallback(async () => {
    const result = await rollupLocalWidgetUsage();
    if (result.status === "ready") {
      setUsageMessage(`사용량 집계 ${result.data.length}건`);
      return;
    }
    if (result.status === "unavailable") {
      setUsageMessage("데스크탑 앱에서 사용할 수 있습니다");
      return;
    }
    setUsageMessage(result.message ?? "집계를 처리했습니다");
  }, []);

  const syncUsageSummary = useCallback(async () => {
    const result = await stageLocalWidgetUsageSummary();
    if (result.status === "unavailable") {
      setUsageMessage("데스크탑 앱에서 사용할 수 있습니다");
      return;
    }
    if (result.status === "ready") {
      setUsageMessage("요약을 서버 전송 대기열에 올렸습니다");
      return;
    }
    setUsageMessage(result.message ?? "요약 동기화를 처리했습니다");
  }, []);

  const activeBubble = resolvePreviewBubble(runtime.widgetWindow?.activeBubble, previewBubble);
  const activeMode = runtime.widgetWindow?.mode ?? previewMode;
  const activeAlwaysOnTop = runtime.widgetWindow?.alwaysOnTop ?? previewAlwaysOnTop;
  const activeClickThrough = runtime.widgetWindow?.clickThrough ?? activeMode === "GHOST";
  const activeWindowVisible = runtime.widgetWindow?.windowVisible ?? previewWindowVisible;

  const currentSummary = useMemo(() => {
    const active = widgetPreviewBubbles.find((bubble) => bubble.id === activeBubble) ?? widgetPreviewBubbles[0];
    return `${active.label} · ${modeLabels[activeMode]} · ${active.notificationLabel}`;
  }, [activeBubble, activeMode]);

  const setWidgetMode = useCallback(
    async (mode: WidgetWindowMode) => {
      setPreviewMode(mode);
      setPreviewWindowVisible(true);
      recordUsage(activeBubble, "MODE_CHANGE");

      if (!runtime.isTauri) return;

      try {
        const widgetWindow = await tauriCommands.setWidgetWindowMode({ bubbleType: activeBubble, mode });
        setRuntime((current) => ({ ...current, widgetWindow }));
        setPreviewMode(widgetWindow.mode);
      } catch {
        setRuntime((current) => ({ ...current, widgetWindow: null }));
      }
    },
    [activeBubble, recordUsage, runtime.isTauri],
  );

  const openWidgetWindow = useCallback(
    async (bubbleType: WidgetBubbleType = activeBubble) => {
      setPreviewBubble(bubbleType);
      setPreviewMode("DEFAULT");
      setPreviewWindowVisible(true);
      recordUsage(bubbleType, "OPEN");

      if (!runtime.isTauri) return;

      try {
        const widgetWindow = await tauriCommands.openWidgetWindow({ bubbleType });
        setRuntime((current) => ({ ...current, widgetWindow }));
        setPreviewBubble(resolvePreviewBubble(widgetWindow.activeBubble, bubbleType));
        setPreviewMode(widgetWindow.mode);
        setPreviewAlwaysOnTop(widgetWindow.alwaysOnTop);
      } catch {
        setRuntime((current) => ({ ...current, widgetWindow: null }));
      }
    },
    [activeBubble, recordUsage, runtime.isTauri],
  );

  const closeWidgetWindow = useCallback(async () => {
    setPreviewMode("MINIMIZED");
    setPreviewWindowVisible(false);
    recordUsage(activeBubble, "CLOSE");

    if (!runtime.isTauri) return;

    try {
      const widgetWindow = await tauriCommands.closeWidgetWindow({ bubbleType: activeBubble });
      setRuntime((current) => ({ ...current, widgetWindow }));
      setPreviewMode(widgetWindow.mode);
    } catch {
      setRuntime((current) => ({ ...current, widgetWindow: null }));
    }
  }, [activeBubble, runtime.isTauri]);

  const toggleAlwaysOnTop = useCallback(async () => {
    const enabled = !activeAlwaysOnTop;
    setPreviewAlwaysOnTop(enabled);
    recordUsage(activeBubble, "PIN_TOGGLE");

    if (!runtime.isTauri) return;

    try {
      const widgetWindow = await tauriCommands.setWidgetAlwaysOnTop({ bubbleType: activeBubble, enabled });
      setRuntime((current) => ({ ...current, widgetWindow }));
      setPreviewAlwaysOnTop(widgetWindow.alwaysOnTop);
    } catch {
      setRuntime((current) => ({ ...current, widgetWindow: null }));
    }
  }, [activeAlwaysOnTop, activeBubble, recordUsage, runtime.isTauri]);

  return (
    <section className={styles.page} aria-labelledby="widget-title">
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Tauri 독립 버블 창</span>
          <h1 id="widget-title">데스크탑 버블 검토</h1>
        </div>
        <Link className={styles.settingsLink} href="/app/settings">
          <Settings2 size={16} strokeWidth={2} />
          설정
        </Link>
      </header>

      <div className={styles.statusStrip} aria-label="위젯 실행 상태">
        <span>{runtimeLabel(runtime)}</span>
        <strong>{currentSummary}</strong>
        <span>{activeAlwaysOnTop ? "상단 고정" : "일반 창"}</span>
      </div>

      <div className={styles.stage}>
        <div className={styles.desktopSurface} aria-label="데스크탑 위젯 프리뷰">
          <DesktopWidgetBubble
            activeBubble={activeBubble}
            alwaysOnTop={activeAlwaysOnTop}
            clickThrough={activeClickThrough}
            mode={activeMode}
            onClose={() => void closeWidgetWindow()}
            onModeChange={(mode) => void setWidgetMode(mode)}
            onOpenBubble={(bubbleType) => void openWidgetWindow(bubbleType)}
            onRestore={() => void openWidgetWindow(activeBubble)}
            onToggleAlwaysOnTop={() => void toggleAlwaysOnTop()}
            presentation="preview"
            windowVisible={activeWindowVisible}
          />
        </div>

        <aside className={styles.controlRail} aria-label="위젯 조작">
          <div className={styles.controlGroup}>
            <strong>창</strong>
            <div className={styles.actionRow}>
              <button onClick={() => void openWidgetWindow()} type="button">
                <MonitorUp size={15} strokeWidth={2} />
                열기
              </button>
              <button onClick={() => void closeWidgetWindow()} type="button">
                숨김
              </button>
              <button aria-pressed={activeAlwaysOnTop} onClick={() => void toggleAlwaysOnTop()} type="button">
                <Pin size={14} strokeWidth={2} />
                고정
              </button>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>상태</strong>
            <div className={styles.modeGrid}>
              {modeOptions.map((mode) => (
                <button aria-pressed={activeMode === mode} key={mode} onClick={() => void setWidgetMode(mode)} type="button">
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>버블</strong>
            <div className={styles.bubbleGrid}>
              {widgetPreviewBubbles.map((bubble) => {
                const Icon = featureIcons[bubble.id];

                return (
                  <button aria-pressed={activeBubble === bubble.id} key={bubble.id} onClick={() => void openWidgetWindow(bubble.id)} type="button">
                    <Icon size={14} strokeWidth={2} />
                    {bubble.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <strong>사용량</strong>
            <div className={styles.actionRow}>
              <button onClick={() => void rollupUsage()} type="button">
                집계
              </button>
              <button onClick={() => void syncUsageSummary()} type="button">
                요약 동기화
              </button>
            </div>
            {usageMessage ? <span>{usageMessage}</span> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
