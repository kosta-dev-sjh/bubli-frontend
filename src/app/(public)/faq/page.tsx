"use client";

import { AppWindow, Database, FolderLock, MessageCircle, ShieldCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageHeading } from "@/components/ui/page-heading";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const faqItems: { icon: typeof AppWindow; questionKey: MessageKey; answerKey: MessageKey }[] = [
  { icon: AppWindow, questionKey: "public.faq.q1", answerKey: "public.faq.a1" },
  { icon: FolderLock, questionKey: "public.faq.q2", answerKey: "public.faq.a2" },
  { icon: ShieldCheck, questionKey: "public.faq.q3", answerKey: "public.faq.a3" },
  { icon: MessageCircle, questionKey: "public.faq.q4", answerKey: "public.faq.a4" },
  { icon: Database, questionKey: "public.faq.q5", answerKey: "public.faq.a5" },
];

export default function FaqPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeading title={t("public.faq.title")} description={t("public.faq.description")} />
      <section className="public-faq" aria-label={t("public.faq.sectionAria")}>
        <GlassPanel className="public-faq__intro">
          <Chip selected>{t("public.faq.introChip")}</Chip>
          <h2>{t("public.faq.introTitle")}</h2>
          <p>{t("public.faq.introBody")}</p>
        </GlassPanel>
        <div className="public-faq__list">
          {faqItems.map((item) => {
            const Icon = item.icon;

            return (
              <GlassPanel as="article" className="public-faq__item" key={item.questionKey}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <h3>{t(item.questionKey)}</h3>
                  <p>{t(item.answerKey)}</p>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </section>
    </>
  );
}
