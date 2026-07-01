"use client";

import Link from "next/link";
import type { PointerEvent, SVGProps } from "react";

import styles from "./public-download-section.module.css";

function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M16.36 12.8c-.03-3.01 2.46-4.46 2.57-4.53-1.4-2.05-3.58-2.33-4.35-2.36-1.85-.19-3.61 1.09-4.55 1.09-.94 0-2.39-1.06-3.93-1.03-2.02.03-3.88 1.18-4.92 3-2.1 3.65-.54 9.06 1.51 12.02 1 1.45 2.2 3.08 3.77 3.02 1.51-.06 2.08-.98 3.91-.98 1.82 0 2.34.98 3.94.95 1.63-.03 2.66-1.48 3.65-2.94 1.15-1.68 1.62-3.31 1.65-3.39-.04-.02-3.18-1.22-3.25-4.85ZM13.37 3.96c.83-1.01 1.39-2.41 1.24-3.81-1.2.05-2.66.8-3.52 1.8-.77.89-1.45 2.32-1.27 3.68 1.34.1 2.71-.68 3.55-1.67Z" />
    </svg>
  );
}

function WindowsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M3 5.1 10.7 4v7.3H3V5.1ZM12 3.8 21 2.5v8.8h-9V3.8ZM3 12.7h7.7V20L3 18.9v-6.2ZM12 12.7h9v8.8l-9-1.3v-7.5Z" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <path d="M20 7 10 17l-5-5" />
    </svg>
  );
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 9h16" />
      <rect width="16" height="15" x="4" y="5" rx="3" />
    </svg>
  );
}

function TimerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
      <path d="M10 2h4" />
      <path d="M12 14V9" />
      <path d="M18.4 6.6 20 5" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}

const platformCards = [
  {
    className: styles.platformMac,
    href: process.env.NEXT_PUBLIC_BUBLI_MACOS_DOWNLOAD_URL ?? "/#download",
    icon: AppleIcon,
    label: "macOS 앱 받기",
    os: "macOS",
    text: "Apple Silicon / Intel",
  },
  {
    className: styles.platformWindows,
    href: process.env.NEXT_PUBLIC_BUBLI_WINDOWS_DOWNLOAD_URL ?? "/#download",
    icon: WindowsIcon,
    label: "Windows 앱 받기",
    os: "Windows",
    text: "Windows 10 이상",
  },
];

const statusCards = [
  { icon: CheckIcon, label: "오늘 할 일", value: "업무 범위 확인" },
  { icon: CalendarIcon, label: "다음 일정", value: "18:00 리뷰 미팅" },
  { icon: TimerIcon, label: "타이머", value: "자료 정리 이어가기" },
];

export function PublicDownloadSection() {
  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    event.currentTarget.style.setProperty("--download-shift-x", `${(0.5 - x) * 24}px`);
    event.currentTarget.style.setProperty("--download-shift-y", `${(0.5 - y) * 20}px`);
    event.currentTarget.style.setProperty("--download-glow-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--download-glow-y", `${y * 100}%`);
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--download-shift-x", "0px");
    event.currentTarget.style.setProperty("--download-shift-y", "0px");
    event.currentTarget.style.setProperty("--download-glow-x", "74%");
    event.currentTarget.style.setProperty("--download-glow-y", "28%");
  }

  return (
    <section className={`landing-section ${styles.section}`} id="download">
      <div className={styles.stage} onPointerLeave={handlePointerLeave} onPointerMove={handlePointerMove}>
        <span className={`${styles.floatIcon} ${styles.floatTodo}`} aria-hidden="true">
          <CheckIcon />
        </span>
        <span className={`${styles.floatIcon} ${styles.floatCalendar}`} aria-hidden="true">
          <CalendarIcon />
        </span>
        <span className={`${styles.floatIcon} ${styles.floatTimer}`} aria-hidden="true">
          <TimerIcon />
        </span>

        <header className={styles.head}>
          <span className={styles.label}>Download</span>
          <div>
            <h2>
              <span>바탕화면에서</span>
              <span>오늘 일을 바로 봅니다</span>
            </h2>
            <p>할 일, 일정, 타이머만 화면 위에 가볍게 남깁니다.</p>
          </div>
        </header>

        <div className={styles.scene} aria-label="Bubli 앱 다운로드 미리보기">
          <article className={styles.appCard}>
            <div className={styles.appBar} aria-hidden="true">
              <span />
              <span />
              <span />
              <b>Bubli 데스크탑</b>
            </div>
            <div className={styles.appBody}>
              <div className={styles.widgetSummary}>
                <span>오늘 보기</span>
                <strong>작업 중에도 필요한 것만 화면 위에 남깁니다.</strong>
                <small>TODO · 일정 · 타이머 · 자료 제안</small>
              </div>
              {statusCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div className={styles.statusRow} key={card.label}>
                    <Icon />
                    <span>{card.label}</span>
                    <b>{card.value}</b>
                  </div>
                );
              })}
            </div>
          </article>
          <div className={styles.platforms} aria-label="운영체제별 앱 다운로드">
            {platformCards.map((card) => {
              const Icon = card.icon;
              const hasReleaseLink = card.href !== "/#download";
              return (
                <Link
                  className={`${styles.platform} ${card.className}`}
                  data-release-ready={hasReleaseLink}
                  href={card.href}
                  key={card.label}
                  rel={hasReleaseLink ? "noreferrer" : undefined}
                  target={hasReleaseLink ? "_blank" : undefined}
                >
                  <span className={styles.platformIcon}>
                    <Icon />
                  </span>
                  <span className={styles.platformCopy}>
                    <strong>{card.label}</strong>
                    <small>{card.os} · {card.text}</small>
                  </span>
                  <span className={styles.downloadIcon} aria-hidden="true">
                    <DownloadIcon />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
