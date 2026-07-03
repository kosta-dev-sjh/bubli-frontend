"use client";

import {
  AppWindow,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  HardDrive,
  MessageCircle,
  MonitorDown,
  Sparkles,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./desktop-download-handoff-panel.module.css";

type SurfaceKind = "PUBLIC_SITE" | "MEMBER_WEB" | "DESKTOP_APP";
type CapabilityKind = "MEMBER_WEB_WINDOW" | "BUBBLE" | "DEVICE_FOLDER" | "COMMUNICATION";

type ProductSurface = {
  description: string;
  kind: SurfaceKind;
  label: string;
  title: string;
  tone: StatusTone;
};

type DesktopCapability = {
  description: string;
  kind: CapabilityKind;
  title: string;
};

type SafetyRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type DesktopDownloadHandoffPanelProps = HTMLAttributes<HTMLElement> & {
  capabilities: DesktopCapability[];
  rules: SafetyRule[];
  surfaces: ProductSurface[];
  title?: string;
};

const surfaceIcons: Record<SurfaceKind, typeof Globe2> = {
  DESKTOP_APP: MonitorDown,
  MEMBER_WEB: AppWindow,
  PUBLIC_SITE: Globe2,
};

const capabilityIcons: Record<CapabilityKind, typeof AppWindow> = {
  BUBBLE: Sparkles,
  COMMUNICATION: MessageCircle,
  DEVICE_FOLDER: HardDrive,
  MEMBER_WEB_WINDOW: AppWindow,
};

export const defaultDownloadSurfaces: ProductSurface[] = [
  {
    description: "서비스 소개, 기능 안내, 앱 다운로드, FAQ를 보여주는 비회원 진입 화면입니다.",
    kind: "PUBLIC_SITE",
    label: "로그인 전",
    title: "공개 사이트",
    tone: "personal",
  },
  {
    description: "로그인 후 프로젝트룸, 자료보드, WBS/작업판, 소통, 설정을 사용하는 실제 업무 화면입니다.",
    kind: "MEMBER_WEB",
    label: "로그인 후",
    title: "회원 작업 화면",
    tone: "room",
  },
  {
    description: "회원 작업 화면을 데스크탑에서 열고, 버블과 기기 기능을 같은 작업 흐름에 붙입니다.",
    kind: "DESKTOP_APP",
    label: "데스크탑",
    title: "데스크탑 앱",
    tone: "todo",
  },
];

export const defaultDesktopCapabilities: DesktopCapability[] = [
  {
    description: "메인 창은 회원 작업 화면을 열어 브라우저와 같은 업무 흐름을 보여줍니다.",
    kind: "MEMBER_WEB_WINDOW",
    title: "회원 작업 화면 열기",
  },
  {
    description: "TODO, 알림, 타이머, 소통 같은 작업 중 정보는 개인 버블로 띄웁니다.",
    kind: "BUBBLE",
    title: "버블 표시",
  },
  {
    description: "기기 폴더 선택, 파일 변경 감지, 기기 안 임시 저장, 복구 대기는 앱에서 처리합니다.",
    kind: "DEVICE_FOLDER",
    title: "기기 기능",
  },
  {
    description: "채팅과 보이스는 서버에서 받은 연결 정보로 웹과 앱 전용 창에서 이어집니다.",
    kind: "COMMUNICATION",
    title: "소통 연결",
  },
];

export const defaultDownloadRules: SafetyRule[] = [
  {
    description: "공개 사이트는 회원 데이터와 프로젝트룸 데이터를 요청하지 않습니다.",
    label: "공개 화면",
    tone: "personal",
  },
  {
    description: "에이전트 요청도 프론트와 데스크탑 앱 모두 같은 서버 흐름으로 처리합니다.",
    label: "서버 기준",
    tone: "approved",
  },
  {
    description: "보이스 연결 정보는 화면에서 만들지 않고 서버에서 발급받습니다.",
    label: "보이스 연결",
    tone: "room",
  },
];

const surfaceCopyKeys: Record<SurfaceKind, { titleKey: MessageKey; labelKey: MessageKey; descKey: MessageKey }> = {
  PUBLIC_SITE: {
    titleKey: "download.handoff.surface.public.title",
    labelKey: "download.handoff.surface.public.label",
    descKey: "download.handoff.surface.public.desc",
  },
  MEMBER_WEB: {
    titleKey: "download.handoff.surface.member.title",
    labelKey: "download.handoff.surface.member.label",
    descKey: "download.handoff.surface.member.desc",
  },
  DESKTOP_APP: {
    titleKey: "download.handoff.surface.desktop.title",
    labelKey: "download.handoff.surface.desktop.label",
    descKey: "download.handoff.surface.desktop.desc",
  },
};

const capabilityCopyKeys: Record<CapabilityKind, { titleKey: MessageKey; descKey: MessageKey }> = {
  MEMBER_WEB_WINDOW: { titleKey: "download.handoff.capability.web.title", descKey: "download.handoff.capability.web.desc" },
  BUBBLE: { titleKey: "download.handoff.capability.bubble.title", descKey: "download.handoff.capability.bubble.desc" },
  DEVICE_FOLDER: { titleKey: "download.handoff.capability.device.title", descKey: "download.handoff.capability.device.desc" },
  COMMUNICATION: { titleKey: "download.handoff.capability.comm.title", descKey: "download.handoff.capability.comm.desc" },
};

const ruleCopyKeys: Record<string, { labelKey: MessageKey; descKey: MessageKey }> = {
  "공개 화면": { labelKey: "download.handoff.rule.public.label", descKey: "download.handoff.rule.public.desc" },
  "서버 기준": { labelKey: "download.handoff.rule.server.label", descKey: "download.handoff.rule.server.desc" },
  "보이스 연결": { labelKey: "download.handoff.rule.voice.label", descKey: "download.handoff.rule.voice.desc" },
};

export function DesktopDownloadHandoffPanel({
  capabilities,
  className,
  rules,
  surfaces,
  title,
  ...props
}: DesktopDownloadHandoffPanelProps) {
  const { t } = useI18n();
  const panelTitle = title ?? t("download.handoff.defaultTitle");

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Download size={16} strokeWidth={2.1} />}>{t("download.handoff.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{panelTitle}</h2>
            <p className={styles.description}>{t("download.handoff.description")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<MonitorDown size={16} strokeWidth={2.1} />} variant="primary">
            {t("download.handoff.downloadApp")}
          </Button>
          <Button icon={<ExternalLink size={16} strokeWidth={2.1} />} variant="quiet">
            {t("download.handoff.loginWeb")}
          </Button>
        </div>
      </header>

      <section className={styles.surfaceRow} aria-label={t("download.handoff.surfaceAria")}>
        {surfaces.map((surface) => {
          const SurfaceIcon = surfaceIcons[surface.kind];
          const copy = surfaceCopyKeys[surface.kind];

          return (
            <article className={styles.surfaceCard} key={surface.kind}>
              <span className={styles.iconTile}>
                <SurfaceIcon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <div className={styles.surfaceTitle}>
                  <strong>{copy ? t(copy.titleKey) : surface.title}</strong>
                  <StatusBadge tone={surface.tone}>{copy ? t(copy.labelKey) : surface.label}</StatusBadge>
                </div>
                <p>{copy ? t(copy.descKey) : surface.description}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.handoff} aria-label={t("download.handoff.handoffAria")}>
        <div className={styles.devicePreview}>
          <div className={styles.windowBar}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.webviewFrame}>
            <div className={styles.webviewSidebar} />
            <div className={styles.webviewContent}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.bubblePreview}>{t("download.handoff.todoBubble")}</div>
            <div className={styles.bubblePreview}>{t("download.handoff.commBubble")}</div>
          </div>
        </div>

        <div className={styles.capabilityList}>
          {capabilities.map((capability) => {
            const CapabilityIcon = capabilityIcons[capability.kind];
            const copy = capabilityCopyKeys[capability.kind];

            return (
              <article key={capability.kind}>
                <span className={styles.iconTile}>
                  <CapabilityIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div>
                  <strong>{copy ? t(copy.titleKey) : capability.title}</strong>
                  <p>{copy ? t(copy.descKey) : capability.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label={t("download.handoff.ruleAria")}>
        {rules.map((rule) => {
          const copy = ruleCopyKeys[rule.label];

          return (
            <article key={rule.label}>
              <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
              <div>
                <StatusBadge tone={rule.tone}>{copy ? t(copy.labelKey) : rule.label}</StatusBadge>
                <p>{copy ? t(copy.descKey) : rule.description}</p>
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
