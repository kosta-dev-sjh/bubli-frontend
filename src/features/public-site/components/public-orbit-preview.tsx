"use client";

import type { CSSProperties, PointerEvent } from "react";

import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const orbitItems: { className: string; labelKey: MessageKey; titleKey: MessageKey }[] = [
  { className: "public-orbit-preview__node--file", labelKey: "public.orbit.node1Label", titleKey: "public.orbit.node1Title" },
  { className: "public-orbit-preview__node--agent", labelKey: "public.orbit.node2Label", titleKey: "public.orbit.node2Title" },
  { className: "public-orbit-preview__node--approve", labelKey: "public.orbit.node3Label", titleKey: "public.orbit.node3Title" },
  { className: "public-orbit-preview__node--todo", labelKey: "public.orbit.node4Label", titleKey: "public.orbit.node4Title" },
];

const widgetItems: { labelKey: MessageKey; titleKey: MessageKey }[] = [
  { labelKey: "public.orbit.widget1Label", titleKey: "public.orbit.widget1Title" },
  { labelKey: "public.orbit.widget2Label", titleKey: "public.orbit.widget2Title" },
  { labelKey: "public.orbit.widget3Label", titleKey: "public.orbit.widget3Title" },
];

function setPointerVars(element: HTMLElement, x: number, y: number) {
  element.style.setProperty("--orbit-x", x.toFixed(3));
  element.style.setProperty("--orbit-y", y.toFixed(3));
}

function handlePointerMove(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  setPointerVars(event.currentTarget, x, y);
}

function handlePointerLeave(event: PointerEvent<HTMLElement>) {
  setPointerVars(event.currentTarget, 0, 0);
}

export function PublicOrbitPreview() {
  const { t } = useI18n();

  return (
    <section
      className="public-orbit-preview"
      aria-label={t("public.orbit.aria")}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={{ "--orbit-x": 0, "--orbit-y": 0 } as CSSProperties}
    >
      <div className="public-orbit-preview__scene">
        <div className="public-orbit-preview__bubble" aria-hidden="true">
          <img src="/assets/bubble-sky.webp" alt="" />
        </div>

        <div className="public-orbit-preview__ring" aria-hidden="true" />

        {orbitItems.map((item) => (
          <div className={`public-orbit-preview__node ${item.className}`} key={item.titleKey}>
            <span>{t(item.labelKey)}</span>
            <b>{t(item.titleKey)}</b>
          </div>
        ))}

        <div className="public-orbit-preview__workspace">
          <div className="public-orbit-preview__bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <b>{t("public.orbit.barTitle")}</b>
          </div>
          <div className="public-orbit-preview__flow">
            <article>
              <span>{t("public.orbit.flow1Label")}</span>
              <b>{t("public.orbit.flow1Title")}</b>
              <small>{t("public.orbit.flow1Sub")}</small>
            </article>
            <article>
              <span>{t("public.orbit.flow2Label")}</span>
              <b>{t("public.orbit.flow2Title")}</b>
              <small>{t("public.orbit.flow2Sub")}</small>
            </article>
            <article>
              <span>{t("public.orbit.flow3Label")}</span>
              <b>{t("public.orbit.flow3Title")}</b>
              <small>{t("public.orbit.flow3Sub")}</small>
            </article>
          </div>
        </div>

        <div className="public-orbit-preview__widgets" aria-label={t("public.orbit.widgetsAria")}>
          {widgetItems.map((item) => (
            <article key={item.labelKey}>
              <span>{t(item.labelKey)}</span>
              <b>{t(item.titleKey)}</b>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
