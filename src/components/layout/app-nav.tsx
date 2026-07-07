"use client";

import {
  CalendarDays,
  Files,
  FolderKanban,
  MessageCircle,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { projectRoomRoute } from "@/lib/project-room-routes";
import { cn } from "@/lib/utils";

const navIcons: Record<(typeof siteConfig.appNav)[number]["href"], LucideIcon> = {
  "/app/agent": Sparkles,
  "/app/calendar": CalendarDays,
  "/app/chat": MessageCircle,
  "/app/project-rooms": FolderKanban,
  "/app/resources": Files,
  "/app/settings": Settings,
};

// 네비 라벨은 siteConfig(단일 언어)에 있으므로 href → 번역 키로 매핑해 t()로 표시한다.
const navLabelKeys: Record<(typeof siteConfig.appNav)[number]["href"], MessageKey> = {
  "/app/agent": "nav.candidates",
  "/app/calendar": "nav.calendar",
  "/app/chat": "nav.chat",
  "/app/project-rooms": "nav.projectRooms",
  "/app/resources": "nav.resources",
  "/app/settings": "nav.settings",
};

// 워크스페이스 튜토리얼(코치 마크)이 탭을 하나씩 짚어갈 수 있도록 각 탭에 data-tour 앵커를 단다.
const navTourIds: Record<(typeof siteConfig.appNav)[number]["href"], string> = {
  "/app/agent": "nav-agent",
  "/app/calendar": "nav-calendar",
  "/app/chat": "nav-chat",
  "/app/project-rooms": "nav-project-rooms",
  "/app/resources": "nav-resources",
  "/app/settings": "nav-settings",
};

function isActiveNavItem(href: string, pathname: string) {
  if (href === "/app") {
    return pathname === "/app";
  }

  if (href === "/app/project-rooms") {
    return pathname.startsWith("/app/project-rooms");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavProps = {
  activeRoomId?: string | null;
};

function navHref(href: (typeof siteConfig.appNav)[number]["href"], activeRoomId?: string | null) {
  if (!activeRoomId) return href;

  if (href === "/app/project-rooms") {
    return projectRoomRoute(activeRoomId, "work");
  }

  if (href === "/app/agent" || href === "/app/calendar") {
    return `${href}?roomId=${encodeURIComponent(activeRoomId)}`;
  }

  if (href === "/app/chat") {
    return `${href}?roomId=${encodeURIComponent(activeRoomId)}&mode=room`;
  }

  return href;
}

export function AppNav({ activeRoomId }: AppNavProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { t } = useI18n();

  return (
    <nav aria-label={t("nav.appLabel")} className="bubli-nav">
      {siteConfig.appNav.map((item) => {
        const Icon = navIcons[item.href];
        const label = t(navLabelKeys[item.href]);
        const isActive = isActiveNavItem(item.href, pathname);
        const href = navHref(item.href, activeRoomId);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn("bubli-nav__item", isActive && "bubli-nav__item--active")}
            data-tour={navTourIds[item.href]}
            href={href}
            key={item.href}
          >
            <motion.span
              className="bubli-nav__icon"
              transition={reduceMotion ? undefined : { duration: 0.18, ease: "easeOut" }}
              whileHover={reduceMotion ? undefined : { scale: 1.08, y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94, y: 0 }}
              aria-hidden="true"
            >
              <Icon size={18} strokeWidth={1.75} />
            </motion.span>
            <span className="bubli-nav__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
