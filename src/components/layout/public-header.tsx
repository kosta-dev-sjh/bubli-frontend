import Link from "next/link";

import { siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="bubli-surface bubli-public-header">
      <nav aria-label="공개 사이트" className="bubli-public-header__nav">
        <Link className="bubli-brand" href="/">
          {siteConfig.name}
        </Link>
        <div className="bubli-public-header__links">
          {siteConfig.publicNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/login">로그인</Link>
        </div>
      </nav>
    </header>
  );
}
