"use client";

import { BubbleCard } from "@/components/bubbles";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { BubbleType } from "@/components/bubbles/bubble-card";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

export type WidgetEightBubbleState = "ready" | "empty" | "loading" | "error";

const bubbles: Array<{
  items: MessageKey[];
  meta: MessageKey;
  progressLabel?: MessageKey;
  progressValue?: number;
  title: MessageKey;
  type: BubbleType;
}> = [
  { items: ["widget.eight.todo.item1", "widget.eight.todo.item2"], meta: "widget.eight.todo.meta", progressLabel: "widget.eight.todo.progress", progressValue: 38, title: "widget.bubble.todo", type: "todo" },
  { items: ["widget.eight.agent.item1", "widget.eight.agent.item2"], meta: "widget.eight.agent.meta", title: "widget.bubble.agent", type: "agent" },
  { items: ["widget.eight.chat.item1", "widget.eight.chat.item2"], meta: "widget.eight.chat.meta", title: "widget.bubble.chat", type: "communication" },
  { items: ["widget.eight.timer.item1"], meta: "widget.eight.timer.meta", progressLabel: "widget.eight.timer.progress", progressValue: 68, title: "widget.bubble.timer", type: "timer" },
  { items: ["widget.eight.memo.item1", "widget.eight.memo.item2"], meta: "widget.eight.memo.meta", title: "widget.bubble.memo", type: "memo" },
  { items: ["widget.eight.schedule.item1", "widget.eight.schedule.item2"], meta: "widget.eight.schedule.meta", title: "widget.bubble.scheduleWbs", type: "schedule" },
  { items: ["widget.eight.resource.item1", "widget.eight.resource.item2"], meta: "widget.eight.resource.meta", title: "widget.bubble.resource", type: "resource" },
  { items: ["widget.eight.notification.item1", "widget.eight.notification.item2"], meta: "widget.eight.notification.meta", title: "widget.bubble.notification", type: "notification" },
];

function WidgetEightBubbleStatePanel({ state }: { state: Exclude<WidgetEightBubbleState, "ready"> }) {
  const { t } = useI18n();
  const copyKey: Record<Exclude<WidgetEightBubbleState, "ready">, MessageKey> = {
    empty: "widget.eight.state.empty",
    error: "widget.eight.state.error",
    loading: "widget.eight.state.loading",
  };

  return (
    <GlassPanel className="widget-eight-state">
      <Chip selected>{state === "loading" ? t("widget.eight.chipLoading") : state === "empty" ? t("widget.eight.chipEmpty") : t("widget.eight.chipError")}</Chip>
      <h2>{t("widget.eight.stateTitle")}</h2>
      <p>{t(copyKey[state])}</p>
      <Button disabled={state === "loading"} variant={state === "error" ? "primary" : "quiet"}>
        {state === "error" ? t("widget.eight.reload") : t("widget.eight.settings")}
      </Button>
    </GlassPanel>
  );
}

export function WidgetEightBubbleSetPanel({ state = "ready" }: { state?: WidgetEightBubbleState }) {
  const { t } = useI18n();
  if (state !== "ready") {
    return <WidgetEightBubbleStatePanel state={state} />;
  }

  return (
    <section className="widget-eight" aria-label={t("widget.eight.sectionAria")}>
      <div className="widget-eight__head">
        <div>
          <Chip selected>{t("widget.eight.chip")}</Chip>
          <h2>{t("widget.eight.title")}</h2>
          <p>{t("widget.eight.body")}</p>
        </div>
        <Button variant="quiet">{t("widget.eight.reorder")}</Button>
      </div>
      <div className="widget-eight__grid">
        {bubbles.map((bubble) => (
          <BubbleCard
            key={bubble.type}
            items={bubble.items.map((item) => t(item))}
            meta={t(bubble.meta)}
            progressLabel={bubble.progressLabel ? t(bubble.progressLabel) : undefined}
            progressValue={bubble.progressValue}
            title={t(bubble.title)}
            type={bubble.type}
          />
        ))}
      </div>
    </section>
  );
}
