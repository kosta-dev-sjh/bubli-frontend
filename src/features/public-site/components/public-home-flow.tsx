"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const flowSteps: {
  bodyKey: MessageKey;
  headlineKey: MessageKey;
  labelKey: MessageKey;
  shortKey: MessageKey;
  titleKey: MessageKey;
}[] = [
  {
    bodyKey: "public.flow.step1Body",
    headlineKey: "public.flow.step1Headline",
    labelKey: "public.flow.step1Label",
    shortKey: "public.flow.step1Short",
    titleKey: "public.flow.step1Title",
  },
  {
    bodyKey: "public.flow.step2Body",
    headlineKey: "public.flow.step2Headline",
    labelKey: "public.flow.step2Label",
    shortKey: "public.flow.step2Short",
    titleKey: "public.flow.step2Title",
  },
  {
    bodyKey: "public.flow.step3Body",
    headlineKey: "public.flow.step3Headline",
    labelKey: "public.flow.step3Label",
    shortKey: "public.flow.step3Short",
    titleKey: "public.flow.step3Title",
  },
  {
    bodyKey: "public.flow.step4Body",
    headlineKey: "public.flow.step4Headline",
    labelKey: "public.flow.step4Label",
    shortKey: "public.flow.step4Short",
    titleKey: "public.flow.step4Title",
  },
];

type StickyMode = "before" | "fixed" | "after";

export function PublicHomeFlow() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stickyMode, setStickyMode] = useState<StickyMode>("before");
  const [stickyFrame, setStickyFrame] = useState<CSSProperties>({});
  const activeStep = flowSteps[activeIndex] ?? flowSteps[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    let frame = 0;
    const syncActiveStep = () => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const topOffset = window.matchMedia("(max-width: 640px)").matches ? 72 : 96;
      const sticky = section.querySelector<HTMLElement>(".public-home-flow__sticky");
      const stickyHeight = sticky?.offsetHeight ?? Math.min(window.innerHeight - topOffset, 760);
      const scrollable = Math.max(rect.height - window.innerHeight, 1);
      const nextProgress = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / scrollable));
      const next = Math.min(flowSteps.length - 1, Math.floor(nextProgress * flowSteps.length));
      setProgress(nextProgress);
      setActiveIndex(next);

      if (rect.top > topOffset) {
        setStickyMode("before");
        setStickyFrame({});
        return;
      }

      if (rect.bottom - stickyHeight <= topOffset) {
        setStickyMode("after");
        setStickyFrame({});
        return;
      }

      setStickyMode("fixed");
      setStickyFrame({
        left: rect.left,
        top: topOffset,
        width: rect.width,
      });
    };

    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveStep);
    };

    syncActiveStep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const flowStyle = { "--flow-progress": progress, ...stickyFrame } as CSSProperties;

  return (
    <section className="public-home-flow public-home-flow--story" aria-label={t("public.flow.aria")} ref={sectionRef}>
      <div className={cn("public-home-flow__sticky", `is-${stickyMode}`)} style={flowStyle}>
        <video aria-hidden="true" autoPlay className="public-home-flow__video" loop muted playsInline poster="/landing/hero-bg.png">
          <source src="/landing/slow-bubble-flow.mp4" type="video/mp4" />
        </video>
        <span aria-hidden="true" className="public-home-flow__veil" />
        <div className="public-home-flow__copy">
          <span className="public-home-flow__eyebrow">{t("public.flow.eyebrow")}</span>
          <h2>
            {t(activeStep.titleKey)}
            <br />
            <span>{t(activeStep.headlineKey)}</span>
          </h2>
          <p>{t(activeStep.bodyKey)}</p>
        </div>

        <div className="public-home-flow__story-visual" aria-live="polite" data-step={activeIndex}>
          <div className="public-home-flow__story-ring" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <article className="public-home-flow__story-card">
            <span>{t(activeStep.labelKey)}</span>
            <h3>{t(activeStep.titleKey)}</h3>
            <p>{t(activeStep.bodyKey)}</p>
          </article>
          <div className="public-home-flow__story-output" aria-hidden="true">
            <b>{activeIndex < 2 ? t("public.flow.outputTitlePending") : t("public.flow.outputTitleReady")}</b>
            <span>{activeIndex < 2 ? t("public.flow.outputSubPending") : t("public.flow.outputSubReady")}</span>
          </div>
          <div className="public-home-flow__story-trace" aria-hidden="true">
            {flowSteps.map((step, index) => (
              <span className={cn(index <= activeIndex && "is-on")} key={step.shortKey} />
            ))}
          </div>
        </div>
      </div>

      <div className="public-home-flow__scroll-track" aria-label={t("public.flow.trackAria")}>
        <div className="public-home-flow__steps">
          {flowSteps.map((step, index) => {
            return (
              <article className={cn("public-home-flow__step", index === activeIndex && "is-active")} key={step.titleKey}>
                <span className="public-home-flow__step-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="public-home-flow__step-meta">{t(step.shortKey)}</span>
                  <h3>{t(step.titleKey)}</h3>
                  <p>{t(step.bodyKey)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
