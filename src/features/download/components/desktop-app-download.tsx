"use client";

// 웹에서 데스크톱 앱을 받을 때: 방문 OS를 감지해 맞는 빌드를 먼저 보여주고,
// 감지 실패 시 Windows/macOS 둘 다 제공한다. macOS 빌드는 미서명(.dmg)이라
// "확인되지 않은 개발자" 경고 우회 설치법을 함께 안내한다.
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

import styles from "./desktop-app-download.module.css";

type DetectedOs = "mac" | "windows" | "other";

const MAC_FALLBACK_HREF = "/downloads/macos/Bubli-macOS-0.1.3-arm64.dmg";
const WINDOWS_FALLBACK_HREF = "/downloads/windows/Bubli-Windows-latest.exe";

function detectOs(): DetectedOs {
  if (typeof navigator === "undefined") return "other";
  const hint = `${navigator.userAgent} ${(navigator as { platform?: string }).platform ?? ""}`.toLowerCase();
  if (/mac|iphone|ipad|ipod/.test(hint)) return "mac";
  if (/win/.test(hint)) return "windows";
  return "other";
}

export function DesktopAppDownload() {
  const { t } = useI18n();
  const [os] = useState<DetectedOs>(() => detectOs());
  const [macHref, setMacHref] = useState(MAC_FALLBACK_HREF);
  const [windowsHref, setWindowsHref] = useState(WINDOWS_FALLBACK_HREF);
  const [macGuideOpen, setMacGuideOpen] = useState(false);

  useEffect(() => {
    // 매니페스트에서 실제 파일명을 읽어 버전 변경에도 링크가 유지되게 한다(실패 시 폴백 사용).
    void fetch("/downloads/macos/manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { file?: string } | null) => {
        if (data?.file) setMacHref(data.file);
      })
      .catch(() => undefined);
    void fetch("/downloads/windows/manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { file?: string } | null) => {
        if (data?.file) setWindowsHref(data.file);
      })
      .catch(() => undefined);
  }, []);

  const macButton = (variant: "primary" | "ghost") => (
    <a
      className={variant === "primary" ? "bubli-button bubli-button--primary" : styles.secondary}
      download
      href={macHref}
      onClick={() => setMacGuideOpen(true)}
    >
      {t("settings.desktop.downloadMac")}
    </a>
  );
  const windowsButton = (variant: "primary" | "ghost") => (
    <a
      className={variant === "primary" ? "bubli-button bubli-button--primary" : styles.secondary}
      download
      href={windowsHref}
    >
      {t("settings.desktop.downloadWindows")}
    </a>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.ctaRow}>
        {os === "mac" ? (
          <>
            {macButton("primary")}
            {windowsButton("ghost")}
          </>
        ) : os === "windows" ? (
          <>
            {windowsButton("primary")}
            {macButton("ghost")}
          </>
        ) : (
          <>
            {windowsButton("primary")}
            {macButton("primary")}
          </>
        )}
      </div>
      {os !== "other" ? <p className={styles.detected}>{t("settings.desktop.detected")}</p> : null}

      <button className={styles.guideToggle} onClick={() => setMacGuideOpen((open) => !open)} type="button">
        {t("settings.desktop.macGuideToggle")}
      </button>
      {macGuideOpen ? (
        <ol className={styles.guide}>
          <li>{t("settings.desktop.macGuide1")}</li>
          <li>{t("settings.desktop.macGuide2")}</li>
          <li>{t("settings.desktop.macGuide3")}</li>
        </ol>
      ) : null}
    </div>
  );
}
