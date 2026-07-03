"use client";

import Link from "next/link";

import { PublicOrbitPreview } from "@/features/public-site/components/public-orbit-preview";
import { useI18n } from "@/lib/i18n";

export function PublicHero() {
  const { t } = useI18n();
  const headline = (
    <>
      <span>{t("public.hero.taglineLead")},</span>
      <span>{t("public.hero.taglineRest")}</span>
    </>
  );

  return (
    <section className="public-hero" aria-label={t("public.hero.aria")}>
      <div className="public-hero__copy">
        <div className="public-hero__eyebrow" aria-label={t("public.hero.eyebrowAria")}>
          <b>{t("public.hero.eyebrow")}</b>
        </div>
        <h1>{headline}</h1>
        <p>
          {t("public.hero.descLine1")}
          <br />
          {t("public.hero.descLine2")}
        </p>
        <div className="public-hero__actions">
          <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/#download">
            {t("public.hero.download")}
          </Link>
          <Link className="bubli-button bubli-button--lg" href="/login">
            {t("common.login")}
          </Link>
        </div>
      </div>

      <PublicOrbitPreview />
    </section>
  );
}
