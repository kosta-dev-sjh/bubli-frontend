"use client";

import { Apple, MonitorDown } from "lucide-react";
import Link from "next/link";

import { DecorBubble } from "@/components/bubbles";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

// 공개 라우트 계약(/download)의 실제 페이지.
// 설치 파일 배포 전에는 플랫폼 안내 + 로그인/기능 진입만 제공한다.
const platforms: { icon: typeof Apple; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { icon: Apple, titleKey: "public.download.macTitle", bodyKey: "public.download.macBody" },
  { icon: MonitorDown, titleKey: "public.download.winTitle", bodyKey: "public.download.winBody" },
];

export default function DownloadPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeading title={t("public.download.title")} description={t("public.download.description")} />
      <section className="public-download" aria-label={t("public.download.sectionAria")}>
        <GlassPanel className="public-download__intro">
          <DecorBubble size="md" />
          <Chip selected>{t("public.download.introChip")}</Chip>
          <h2>{t("public.download.introTitle")}</h2>
          <p>{t("public.download.introBody")}</p>
          <div className="public-download__actions">
            <Link className="bubli-button bubli-button--primary" href="/login">
              {t("public.download.ctaLogin")}
            </Link>
          </div>
        </GlassPanel>

        <div className="public-download__grid">
          {platforms.map((platform) => {
            const Icon = platform.icon;

            return (
              <GlassPanel as="article" className="public-download__item" key={platform.titleKey}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <div className="public-download__item-head">
                    <h3>{t(platform.titleKey)}</h3>
                    <StatusBadge tone="personal">{t("public.download.statusPreparing")}</StatusBadge>
                  </div>
                  <p>{t(platform.bodyKey)}</p>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </section>
    </>
  );
}
