import Link from "next/link";

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
          <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/download">
            앱 다운로드
          </Link>
          <Link className="bubli-button bubli-button--lg" href="/login">
            로그인
          </Link>
        </div>
      </div>

      <GlassPanel className="public-hero__visual" padded={false}>
        <div className="public-hero__app-switch" aria-label="Bubli 실행 방식">
          <span>공개 사이트</span>
          <span className="is-active">로그인 후 업무 앱</span>
          <span>데스크탑</span>
        </div>
        <div className="public-hero__workspace" aria-hidden="true">
          <div className="public-hero__window">
            <div className="public-hero__window-bar">
              <span />
              <span />
              <span />
              <b>자료보드</b>
            </div>
            <div className="public-hero__window-body">
              <aside>
                <span />
                <span />
                <span className="is-active" />
                <span />
              </aside>
              <main>
                <div className="public-hero__metric-row">
                  <span>자료 12</span>
                  <span>승인 대기 3</span>
                  <span>오늘 할 일 5</span>
                </div>
                <div className="public-hero__resource-row is-selected">
                  <span className="public-hero__row-signal" aria-hidden="true" />
                  <b>요구사항 정의서.pdf</b>
                  <small>확인 필요</small>
                </div>
                <div className="public-hero__resource-row">
                  <b>회의록 06-29.md</b>
                  <small>후보 4개</small>
                </div>
                <div className="public-hero__approval">
                  <span>에이전트 후보</span>
                  <b>결제 흐름 단순화</b>
                  <small>사용자가 승인하면 오늘 할 일로 연결</small>
                </div>
              </main>
            </div>
          </div>
          <div className="public-hero__widget">
            <div>
              <b>오늘 18:00</b>
              <small>메인 배너 시안 1차</small>
            </div>
          </div>
        </div>
      </GlassPanel>
    </section>
  );
}
