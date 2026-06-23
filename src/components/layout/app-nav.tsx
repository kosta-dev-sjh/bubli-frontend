"use client";

import {
  Files,
  FolderKanban,
  LayoutDashboard,
  MessageCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const navIcons: Record<(typeof siteConfig.appNav)[number]["href"], LucideIcon> = {
  "/app": LayoutDashboard,
  "/app/chat": MessageCircle,
  "/app/projects": FolderKanban,
  "/app/resources": Files,
  "/app/settings": Settings,
};

function isActiveNavItem(href: string, pathname: string) {
  if (href === "/app") {
    return pathname === "/app";
  }

  if (href === "/app/projects") {
    return pathname.startsWith("/app/projects") || pathname.startsWith("/app/project-rooms");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="회원 앱" className="bubli-nav">
      {siteConfig.appNav.map((item) => {
        const Icon = navIcons[item.href];
        const isActive = isActiveNavItem(item.href, pathname);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn("bubli-nav__item", isActive && "bubli-nav__item--active")}
            href={item.href}
            key={item.href}
          >
            <span className="bubli-nav__icon" aria-hidden="true">
              <Icon size={17} strokeWidth={2.1} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
