import Link from "next/link";

import { siteConfig } from "@/config/site";
import { PublicOrbitPreview } from "@/features/public-site/components/public-orbit-preview";

export function PublicHero() {
  const [taglineLead, taglineRest] = siteConfig.tagline.split(", ");
  const headline = taglineRest ? (
    <>
      <span>{taglineLead},</span>
      <span>{taglineRest}</span>
    </>
  ) : (
    siteConfig.tagline
  );

  return (
    <section className="public-hero" aria-label="Bubli 소개">
      <div className="public-hero__copy">
        <div className="public-hero__eyebrow" aria-label="서비스 요약">
          <b>프리랜서 업무를 자료에서 실행까지</b>
        </div>
        <h1>{headline}</h1>
        <p>
          계약서, 요구사항, 회의록을 업무 구조로 바꾸고
          <br />
          오늘 필요한 일을 한 화면에 정리해주는 프리랜서 업무 비서
        </p>
        <div className="public-hero__actions">
          <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/#download">
            앱 다운로드
          </Link>
          <Link className="bubli-button bubli-button--lg" href="/login">
            로그인
          </Link>
        </div>
      </div>

      <PublicOrbitPreview />
    </section>
  );
}
