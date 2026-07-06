"use client";

import Link from "next/link";

import { useLiveAuthUser } from "@/features/auth/hooks/use-live-auth-user";
import { PublicOrbitPreview } from "@/features/public-site/components/public-orbit-preview";
import { useI18n } from "@/lib/i18n";

const windowsInstallerHref = "/downloads/windows/Bubli-Windows-latest.exe";

export function PublicHero() {
  const { t } = useI18n();
  const authUser = useLiveAuthUser();
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
          {authUser ? (
            <>
              <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/app">
                {t("public.session.openApp")}
              </Link>
              <Link className="bubli-button bubli-button--lg" download href={windowsInstallerHref}>
                {t("public.hero.download")}
              </Link>
            </>
          ) : (
            <>
              <Link className="bubli-button bubli-button--primary bubli-button--lg" download href={windowsInstallerHref}>
                {t("public.hero.download")}
              </Link>
              <Link className="bubli-button bubli-button--lg" href="/login">
                {t("common.login")}
              </Link>
            </>
          )}
        </div>
      </div>

      <PublicOrbitPreview />
    </section>
  );
}
