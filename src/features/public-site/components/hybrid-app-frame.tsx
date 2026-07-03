"use client";

import { Globe2, MonitorDown, PanelTop } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const frames: { icon: typeof Globe2; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { icon: Globe2, titleKey: "public.hybrid.frame1Title", bodyKey: "public.hybrid.frame1Body" },
  { icon: PanelTop, titleKey: "public.hybrid.frame2Title", bodyKey: "public.hybrid.frame2Body" },
  { icon: MonitorDown, titleKey: "public.hybrid.frame3Title", bodyKey: "public.hybrid.frame3Body" },
];

export function HybridAppFrame() {
  const { t } = useI18n();

  return (
    <section className="hybrid-frame" aria-label={t("public.hybrid.aria")}>
      <div className="hybrid-frame__grid">
        {frames.map((frame) => {
          const Icon = frame.icon;
          return (
            <GlassPanel className="hybrid-frame__card" key={frame.titleKey}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <h3>{t(frame.titleKey)}</h3>
              <p>{t(frame.bodyKey)}</p>
              <div className="hybrid-frame__surface" aria-hidden="true">
                <span className="hybrid-frame__surface-line" style={{ width: "72%" }} />
                <span className="hybrid-frame__surface-line" style={{ width: "92%" }} />
                <span className="hybrid-frame__surface-line" style={{ width: "58%" }} />
              </div>
            </GlassPanel>
          );
        })}
      </div>
      <div className="hybrid-frame__note">
        <Chip>{t("public.hybrid.noteChip")}</Chip>
        <span>{t("public.hybrid.note")}</span>
      </div>
    </section>
  );
}
