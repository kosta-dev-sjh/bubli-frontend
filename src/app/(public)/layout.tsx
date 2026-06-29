import type { ReactNode } from "react";

import { ForceLightTheme } from "@/features/public-site/components/force-light-theme";
import { LandingNav } from "@/features/public-site/components/landing-nav";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      {/* 공개(비회원) 페이지는 라이트 전용 */}
      <ForceLightTheme />
      <LandingNav />
      <main className="landing-main">{children}</main>
    </>
  );
}
