import "@/styles/globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";
import { Providers } from "@/app/providers";
import { TauriRuntimeGates } from "@/lib/tauri/tauri-runtime-gates";

const apiPreconnectOrigin = process.env.NEXT_PUBLIC_API_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin
  : "https://bubli.n-e.kr";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // 공개(비회원)·로그인 기본 파비콘 = 라이트 유리 버블 마크.
  // 회원 앱(/app)은 (workspace) 레이아웃에서 다크 앱 타일로 덮어쓴다(분리 호스팅 시 탭에서 구분).
  icons: {
    icon: [
      { url: "/brand/icon-public.svg", type: "image/svg+xml" },
      { url: "/brand/icon-public-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/brand/icon-public-180.png",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <head>
        {/* LINE Seed 웹폰트가 CDN에서 오므로 연결을 미리 열어 첫 글꼴 표시를 앞당긴다. */}
        <link crossOrigin="anonymous" href="https://cdn.jsdelivr.net" rel="preconnect" />
        <link href={apiPreconnectOrigin} rel="dns-prefetch" />
        <link crossOrigin="anonymous" href={apiPreconnectOrigin} rel="preconnect" />
      </head>
      <body>
        <Providers>
          <TauriRuntimeGates />
          {children}
        </Providers>
      </body>
    </html>
  );
}
