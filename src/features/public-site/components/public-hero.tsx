import Link from "next/link";
import { Download, LogIn } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { siteConfig } from "@/config/site";

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
        <Chip selected>프리랜서를 위한 업무 구조화와 버블 위젯</Chip>
        <h1>{headline}</h1>
        <p>{siteConfig.description}</p>
        <div className="public-hero__actions">
          <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/download">
            <Download aria-hidden="true" size={17} />
            데스크탑 앱 다운로드
          </Link>
          <Link className="bubli-button bubli-button--lg" href="/login">
            <LogIn aria-hidden="true" size={17} />
            웹에서 로그인
          </Link>
        </div>
        <div className="public-hero__checks">
          <Chip>공개 사이트</Chip>
          <Chip>회원 웹 앱</Chip>
          <Chip>데스크탑 앱</Chip>
          <Chip>버블 위젯</Chip>
        </div>
      </div>

      <GlassPanel className="public-hero__visual" padded={false}>
        <div className="public-hero__bubble">
          <b>Bubli</b>
        </div>
        <span className="public-hero__mini one" aria-hidden="true" />
        <span className="public-hero__mini two" aria-hidden="true" />
        <div className="public-hero__preview">
          <GlassPanel className="bubli-domain-card">
            <h3 className="bubli-domain-card__title">프로젝트룸</h3>
            <p className="bubli-domain-card__body">자료, WBS, TODO를 한 맥락으로 정리합니다.</p>
          </GlassPanel>
          <GlassPanel className="bubli-domain-card">
            <h3 className="bubli-domain-card__title">후보 승인</h3>
            <p className="bubli-domain-card__body">에이전트 결과는 사용자가 확인한 뒤 반영됩니다.</p>
          </GlassPanel>
          <GlassPanel className="bubli-domain-card">
            <h3 className="bubli-domain-card__title">버블</h3>
            <p className="bubli-domain-card__body">작업 중 필요한 정보만 데스크탑 위에 남깁니다.</p>
          </GlassPanel>
        </div>
      </GlassPanel>
    </section>
  );
}
