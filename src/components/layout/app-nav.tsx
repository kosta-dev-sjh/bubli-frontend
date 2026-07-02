"use client";

import {
  CalendarDays,
  Files,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navIcons: Record<(typeof siteConfig.appNav)[number]["href"], LucideIcon> = {
  "/app": LayoutDashboard,
  "/app/agent": Sparkles,
  "/app/calendar": CalendarDays,
  "/app/project-rooms": FolderKanban,
  "/app/resources": Files,
  "/app/settings": Settings,
};

const navLabelKey: Record<(typeof siteConfig.appNav)[number]["href"], MessageKey> = {
  "/app": "nav.dashboard",
  "/app/agent": "nav.candidates",
  "/app/calendar": "nav.calendar",
  "/app/project-rooms": "nav.projectRooms",
  "/app/resources": "nav.resources",
  "/app/settings": "nav.settings",
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
    return `/app/project-rooms/${activeRoomId}`;
  }

  if (href === "/app/agent" || href === "/app/calendar") {
    return `${href}?roomId=${encodeURIComponent(activeRoomId)}`;
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
        const isActive = isActiveNavItem(item.href, pathname);
        const href = navHref(item.href, activeRoomId);
        const label = t(navLabelKey[item.href]);

        return (
          <Link
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn("bubli-nav__item", isActive && "bubli-nav__item--active")}
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
            <span aria-hidden="true" className="bubli-nav__tooltip" data-label={label} />
          </Link>
        );
      })}
    </nav>
  );
}
