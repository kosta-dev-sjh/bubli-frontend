"use client";

import { Apple, Check, Download, MonitorDown } from "lucide-react";
import Link from "next/link";

import { DecorBubble } from "@/components/bubbles";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PublicHero } from "@/features/public-site/components/public-hero";
import { PublicHomeFlow } from "@/features/public-site/components/public-home-flow";
import { Reveal } from "@/features/public-site/components/reveal";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const featureCards: { kickerKey: MessageKey; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { kickerKey: "public.home.card1Kicker", titleKey: "public.home.card1Title", bodyKey: "public.home.card1Body" },
  { kickerKey: "public.home.card2Kicker", titleKey: "public.home.card2Title", bodyKey: "public.home.card2Body" },
  { kickerKey: "public.home.card3Kicker", titleKey: "public.home.card3Title", bodyKey: "public.home.card3Body" },
];

const faqItems: { qKey: MessageKey; aKey: MessageKey }[] = [
  { qKey: "public.home.faq1Q", aKey: "public.home.faq1A" },
  { qKey: "public.home.faq2Q", aKey: "public.home.faq2A" },
  { qKey: "public.home.faq3Q", aKey: "public.home.faq3A" },
  { qKey: "public.home.faq4Q", aKey: "public.home.faq4A" },
];

export default function HomePage() {
  const { t } = useI18n();

  return (
    <>
      <section className="landing-hero" id="hero">
        <video
          aria-hidden="true"
          autoPlay
          className="landing-hero__video"
          loop
          muted
          playsInline
          poster="/landing/hero-bg.png"
        >
          <source src="/landing/ambient-loop.mp4" type="video/mp4" />
        </video>
        <span aria-hidden="true" className="landing-hero__veil" />
        <div className="landing-hero__content">
          <PublicHero />
        </div>
      </section>

      <section className="landing-section" id="features">
        <header className="landing-section__head">
          <h2>{t("public.home.flowHeadTitle")}</h2>
          <p>{t("public.home.flowHeadSub")}</p>
        </header>
        <PublicHomeFlow />
      </section>

      <Reveal>
        <section className="landing-section" id="why">
          <DecorBubble floating size="lg" style={{ top: "6%", right: "3%" }} />
          <DecorBubble floating size="sm" style={{ bottom: "10%", left: "2%" }} />
          <header className="landing-section__head landing-section__head--left">
            <Chip>{t("public.home.whyChip")}</Chip>
            <h2>{t("public.home.whyTitle")}</h2>
            <p>{t("public.home.whySub")}</p>
          </header>
          <div className="landing-feature-grid">
            {featureCards.map((card) => {
              return (
                <GlassPanel className="landing-feature-card" key={card.titleKey}>
                  <DecorBubble size="md" />
                  <span className="landing-feature-card__kicker">{t(card.kickerKey)}</span>
                  <h3>{t(card.titleKey)}</h3>
                  <p>{t(card.bodyKey)}</p>
                </GlassPanel>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section landing-desktop" id="desktop">
          <DecorBubble floating size="md" style={{ top: "4%", left: "40%" }} />
          <div className="landing-desktop__copy">
            <Chip>{t("public.home.desktopChip")}</Chip>
            <h2>{t("public.home.desktopTitle")}</h2>
            <p>{t("public.home.desktopBody")}</p>
            <ul className="landing-desktop__list">
              <li>
                <span className="landing-desktop__list-mark" aria-hidden="true">01</span>
                {t("public.home.desktopList1")}
              </li>
              <li>
                <span className="landing-desktop__list-mark" aria-hidden="true">02</span>
                {t("public.home.desktopList2")}
              </li>
              <li>
                <span className="landing-desktop__list-mark" aria-hidden="true">03</span>
                {t("public.home.desktopList3")}
              </li>
            </ul>
            <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/#download">
              {t("public.home.desktopCta")}
            </Link>
          </div>
          <GlassPanel className="landing-desktop__visual" padded={false}>
            <div className="landing-app-preview" aria-label={t("public.home.previewAria")}>
              {/* 선택 탭이 아니라 "세 플랫폼 모두 지원"을 알리는 정적 배지 행이다. */}
              <div aria-hidden="true" className="landing-app-preview__platforms">
                <span className="landing-app-preview__platforms-label">
                  {t("public.home.previewSupported")}
                </span>
                <span className="landing-app-preview__platform">
                  <Check size={13} strokeWidth={2.8} />
                  {t("public.home.previewTabMac")}
                </span>
                <span className="landing-app-preview__platform">
                  <Check size={13} strokeWidth={2.8} />
                  {t("public.home.previewTabWin")}
                </span>
                <span className="landing-app-preview__platform">
                  <Check size={13} strokeWidth={2.8} />
                  {t("public.home.previewTabWeb")}
                </span>
              </div>
              <div className="landing-app-preview__stage">
                <div className="landing-app-preview__chrome" aria-hidden="true">
                  <div className="landing-app-preview__bar">
                    <span />
                    <span />
                    <span />
                    <b>{t("public.home.previewBarTitle")}</b>
                  </div>
                  <div className="landing-app-preview__body">
                    <aside>
                      <span />
                      <span className="is-on" />
                      <span />
                      <span />
                    </aside>
                    <main>
                      <div className="landing-app-preview__summary">
                        <span>{t("public.home.previewSummary1")}</span>
                        <span>{t("public.home.previewSummary2")}</span>
                        <span>{t("public.home.previewSummary3")}</span>
                      </div>
                      <div className="landing-app-preview__lane">
                        <b>{t("public.home.previewLane1Title")}</b>
                        <small>{t("public.home.previewLane1Sub")}</small>
                      </div>
                      <div className="landing-app-preview__lane">
                        <b>{t("public.home.previewLane2Title")}</b>
                        <small>{t("public.home.previewLane2Sub")}</small>
                      </div>
                    </main>
                  </div>
                </div>
                <div className="landing-app-preview__widget" aria-hidden="true">
                  <div>
                    <b>{t("public.home.previewWidgetTitle")}</b>
                    <small>{t("public.home.previewWidgetSub")}</small>
                  </div>
                </div>
                <div className="landing-app-preview__dock" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <b>Bubli</b>
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section landing-download" id="download">
          <div className="landing-download__stage">
            <DecorBubble floating size="lg" style={{ top: "10%", right: "6%" }} />
            <DecorBubble floating size="sm" style={{ bottom: "14%", left: "4%" }} />
            <header className="landing-download__head">
              <span className="landing-download__label">{t("public.home.downloadLabel")}</span>
              <div>
                <strong>{t("public.home.downloadTitle")}</strong>
                <h2>
                  <span>{t("public.home.downloadHead1")}</span>
                  <span>{t("public.home.downloadHead2")}</span>
                </h2>
                <p>{t("public.home.downloadSub")}</p>
                {/* 웹으로 바로 시작하는 경로 — 다운로드 CTA 옆에 정식 보조 버튼으로 노출한다. */}
                <div className="landing-download__actions">
                  <Link className="bubli-button bubli-button--lg" href="/login">
                    {t("public.home.downloadLogin")}
                  </Link>
                </div>
              </div>
            </header>

            <div className="landing-download__scene" aria-label={t("public.home.downloadSceneAria")}>
              <article className="landing-download__terminal">
                <div className="landing-download__terminal-bar" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <b>bubli-desktop.app</b>
                </div>
                <div className="landing-download__terminal-body">
                  <div>
                    <span>{t("public.home.downloadTermTodo")}</span>
                    <b>{t("public.home.downloadTermTodoValue")}</b>
                  </div>
                  <div>
                    <span>{t("public.home.downloadTermNext")}</span>
                    <b>{t("public.home.downloadTermNextValue")}</b>
                  </div>
                  <div>
                    <span>{t("public.home.downloadTermTimer")}</span>
                    <b>{t("public.home.downloadTermTimerValue")}</b>
                  </div>
                </div>
              </article>
              <Link aria-label={t("public.home.downloadMacAria")} className="landing-download__float landing-download__float--primary" href="/download">
                <span className="landing-download__float-os" aria-hidden="true">
                  <Apple size={24} strokeWidth={2.15} />
                </span>
                <span>{t("public.home.downloadMac")}</span>
                <span className="landing-download__float-download" aria-hidden="true">
                  <Download size={20} strokeWidth={2.2} />
                </span>
              </Link>
              <Link aria-label={t("public.home.downloadWinAria")} className="landing-download__float landing-download__float--soft" href="/download">
                <span className="landing-download__float-os" aria-hidden="true">
                  <MonitorDown size={23} strokeWidth={2.1} />
                </span>
                <span>{t("public.home.downloadWin")}</span>
                <span className="landing-download__float-download" aria-hidden="true">
                  <Download size={20} strokeWidth={2.2} />
                </span>
              </Link>
              <div className="landing-download__float landing-download__float--bubble" aria-hidden="true">
                {t("public.home.downloadBubble")}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section landing-faq" id="faq">
          <DecorBubble floating size="md" style={{ top: "10%", right: "5%" }} />
          <header className="landing-section__head">
            <Chip>{t("public.home.faqChip")}</Chip>
            <h2>{t("public.home.faqTitle")}</h2>
          </header>
          <div className="landing-faq__list">
            {faqItems.map((item) => (
              <GlassPanel className="landing-faq__item" key={item.qKey}>
                <h3>{t(item.qKey)}</h3>
                <p>{t(item.aKey)}</p>
              </GlassPanel>
            ))}
          </div>
        </section>
      </Reveal>

      <footer className="landing-footer">
        <span className="landing-footer__brand bubli-wordmark">Bubli</span>
        <span className="landing-footer__copy">{t("public.footer.tagline")}</span>
        <nav aria-label={t("public.footer.navAria")} className="landing-footer__links">
          <Link href="/#features">{t("public.footer.features")}</Link>
          <Link href="/#download">{t("public.footer.download")}</Link>
          <Link href="/#faq">{t("public.footer.faq")}</Link>
          <Link href="/login">{t("public.footer.login")}</Link>
        </nav>
      </footer>
    </>
  );
}
