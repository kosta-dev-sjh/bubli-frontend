"use client";

import { GlassPanel } from "@/components/ui/glass-panel";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const fontRules: { titleKey: MessageKey; sampleKey: MessageKey; bodyKey: MessageKey }[] = [
  { titleKey: "public.font.rule1Title", sampleKey: "public.font.rule1Sample", bodyKey: "public.font.rule1Body" },
  { titleKey: "public.font.rule2Title", sampleKey: "public.font.rule2Sample", bodyKey: "public.font.rule2Body" },
  { titleKey: "public.font.rule3Title", sampleKey: "public.font.rule3Sample", bodyKey: "public.font.rule3Body" },
];

export function FontStrategyPanel() {
  const { t } = useI18n();

  return (
    <section className="font-strategy" aria-label={t("public.font.aria")}>
      <div className="font-strategy__grid">
        {fontRules.map((rule) => (
          <GlassPanel className="font-strategy__card" key={rule.titleKey}>
            <b>{t(rule.titleKey)}</b>
            <div className="font-strategy__sample">{t(rule.sampleKey)}</div>
            <p>{t(rule.bodyKey)}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
