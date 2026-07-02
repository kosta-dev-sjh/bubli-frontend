"use client";

import { Bot, FolderKanban, LayoutGrid, MessageCircle, PanelTop, SearchCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { HybridAppFrame } from "@/features/public-site/components/hybrid-app-frame";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const featureFlow: { icon: typeof Bot; labelKey: MessageKey; statusKey: MessageKey; bodyKey: MessageKey }[] = [
  { icon: FolderKanban, labelKey: "public.features.item1Label", statusKey: "public.features.item1Status", bodyKey: "public.features.item1Body" },
  { icon: SearchCheck, labelKey: "public.features.item2Label", statusKey: "public.features.item2Status", bodyKey: "public.features.item2Body" },
  { icon: Bot, labelKey: "public.features.item3Label", statusKey: "public.features.item3Status", bodyKey: "public.features.item3Body" },
  { icon: PanelTop, labelKey: "public.features.item4Label", statusKey: "public.features.item4Status", bodyKey: "public.features.item4Body" },
  { icon: MessageCircle, labelKey: "public.features.item5Label", statusKey: "public.features.item5Status", bodyKey: "public.features.item5Body" },
  { icon: LayoutGrid, labelKey: "public.features.item6Label", statusKey: "public.features.item6Status", bodyKey: "public.features.item6Body" },
];

export default function FeaturesPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeading
        title={t("public.features.title")}
        description={t("public.features.description")}
      />

      <section className="public-feature-flow" aria-label={t("public.features.flowAria")}>
        <GlassPanel className="public-feature-flow__intro">
          <Chip selected>{t("public.features.introChip")}</Chip>
          <h2>{t("public.features.introTitle")}</h2>
          <p>{t("public.features.introBody")}</p>
        </GlassPanel>

        <div className="public-feature-flow__grid">
          {featureFlow.map((feature) => {
            const Icon = feature.icon;

            return (
              <GlassPanel as="article" className="public-feature-flow__card" key={feature.labelKey}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <div className="public-feature-flow__card-head">
                    <h3>{t(feature.labelKey)}</h3>
                    <StatusBadge tone="personal">{t(feature.statusKey)}</StatusBadge>
                  </div>
                  <p>{t(feature.bodyKey)}</p>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </section>

      <div className="page-grid">
        <HybridAppFrame />
      </div>
    </>
  );
}
