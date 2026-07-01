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
    title: "회원 웹 앱",
    tone: "room",
  },
  {
    description: "회원 웹 앱을 데스크탑에서 열고, 버블과 기기 기능을 같은 작업 흐름에 붙입니다.",
    kind: "DESKTOP_APP",
    label: "데스크탑",
    title: "데스크탑 앱",
    tone: "todo",
  },
];

export const defaultDesktopCapabilities: DesktopCapability[] = [
  {
    description: "메인 창은 회원 웹 앱을 열어 브라우저와 같은 화면을 보여줍니다.",
    kind: "MEMBER_WEB_WINDOW",
    title: "회원 웹 앱 열기",
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

export function DesktopDownloadHandoffPanel({
  capabilities,
  className,
  rules,
  surfaces,
  title = "데스크탑 앱 다운로드",
  ...props
}: DesktopDownloadHandoffPanelProps) {
  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Download size={16} strokeWidth={2.1} />}>공개 사이트</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              공개 사이트는 앱을 내려받는 입구이고, 실제 업무는 로그인 후 회원 웹 앱에서 이어집니다. 데스크탑 앱은 같은
              웹 화면을 열면서 버블, 기기 폴더, 기기 안 임시 저장 같은 앱 기능을 더합니다.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<MonitorDown size={16} strokeWidth={2.1} />} variant="primary">
            앱 다운로드
          </Button>
          <Button icon={<ExternalLink size={16} strokeWidth={2.1} />} variant="quiet">
            웹에서 로그인
          </Button>
        </div>
      </header>

      <section className={styles.surfaceRow} aria-label="서비스 진입 화면">
        {surfaces.map((surface) => {
          const SurfaceIcon = surfaceIcons[surface.kind];

          return (
            <article className={styles.surfaceCard} key={surface.kind}>
              <span className={styles.iconTile}>
                <SurfaceIcon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <div className={styles.surfaceTitle}>
                  <strong>{surface.title}</strong>
                  <StatusBadge tone={surface.tone}>{surface.label}</StatusBadge>
                </div>
                <p>{surface.description}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.handoff} aria-label="데스크탑 앱 기능 연결">
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
            <div className={styles.bubblePreview}>TODO 버블</div>
            <div className={styles.bubblePreview}>소통 버블</div>
          </div>
        </div>

        <div className={styles.capabilityList}>
          {capabilities.map((capability) => {
            const CapabilityIcon = capabilityIcons[capability.kind];

            return (
              <article key={capability.kind}>
                <span className={styles.iconTile}>
                  <CapabilityIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div>
                  <strong>{capability.title}</strong>
                  <p>{capability.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label="다운로드 화면 구현 기준">
        {rules.map((rule) => (
          <article key={rule.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
