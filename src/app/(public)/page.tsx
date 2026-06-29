import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PublicHero } from "@/features/public-site/components/public-hero";
import { PublicHomeFlow } from "@/features/public-site/components/public-home-flow";
import { Reveal } from "@/features/public-site/components/reveal";

const featureCards = [
  { kicker: "문제", title: "자료가 흩어지지 않게", body: "계약서·요구사항·회의록을 프로젝트룸 기준으로 묶어 업무 기준을 잃지 않습니다." },
  { kicker: "판단", title: "에이전트는 후보만", body: "확인 질문과 TODO 후보를 제안하고, 사용자가 승인한 항목만 실제 작업이 됩니다." },
  { kicker: "결과", title: "결정은 맥락 옆에", body: "자료 옆에서 대화를 이어가 결정, 근거, 할 일이 따로 흩어지지 않습니다." },
];

const faqItems = [
  { q: "회원가입은 어떻게 하나요?", a: "구글 로그인으로 바로 시작합니다. 별도의 이메일 회원가입은 없습니다." },
  { q: "내 PC 파일을 다 읽나요?", a: "아니요. 사용자가 직접 지정한 폴더만 감지하고, 전체 PC 자동 색인은 하지 않습니다." },
  { q: "데스크탑 앱은 무엇이 다른가요?", a: "회원 웹 앱을 그대로 띄우고, 바탕화면 위 버블 위젯·로컬 폴더 연동·빠른 캐시를 더합니다." },
  { q: "에이전트가 임의로 작업을 바꾸나요?", a: "아니요. 에이전트는 후보만 만들고, 사용자가 확인한 항목만 실제 작업이 됩니다." },
];

export default function HomePage() {
  return (
    <>
      <section className="landing-hero" id="hero">
        <video
          aria-hidden="true"
          autoPlay
          className="landing-hero__video"
          loop
          muted
          playsInline
          poster="/landing/hero-bg.png"
        >
          <source src="/landing/ambient-loop.mp4" type="video/mp4" />
        </video>
        <span aria-hidden="true" className="landing-hero__veil" />
        <div className="landing-hero__content">
          <PublicHero />
        </div>
      </section>

      <Reveal>
        <section className="landing-section" id="features">
          <header className="landing-section__head">
            <Chip selected>핵심 흐름</Chip>
            <h2>받은 자료가 오늘 할 일이 되기까지</h2>
            <p>업로드한 자료를 에이전트가 정리하고, 사용자가 확인하면 같은 할 일이 작업판·대시보드·버블로 이어집니다.</p>
          </header>
          <PublicHomeFlow />
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section" id="why">
          <header className="landing-section__head landing-section__head--left">
            <Chip>왜 필요한가</Chip>
            <h2>프리랜서의 일은 자료에서 흔들립니다</h2>
            <p>파일, 대화, 일정이 따로 움직이면 오늘 무엇을 해야 하는지 다시 찾는 데 시간이 빠집니다.</p>
          </header>
          <div className="landing-feature-grid">
            {featureCards.map((card) => {
              return (
                <GlassPanel className="landing-feature-card" key={card.title}>
                  <span className="landing-feature-card__kicker">{card.kicker}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </GlassPanel>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section landing-desktop" id="desktop">
          <div className="landing-desktop__copy">
            <Chip>데스크탑 앱</Chip>
            <h2>작업 중에도, 화면 위에 가볍게</h2>
            <p>
              Bubli 데스크탑 앱은 회원 웹 앱을 그대로 띄우고, 바탕화면 위에 오늘 할 일, 일정, 타이머, 자료 제안을 버블로
              남깁니다. 화면을 전환하지 않아도 필요한 정보만 맑게 떠 있습니다.
            </p>
            <ul className="landing-desktop__list">
              <li>
                <span className="landing-desktop__list-mark" aria-hidden="true">01</span>
                바탕화면 버블 위젯 (기본·반투명·고스트·최소화)
              </li>
              <li>
                <span className="landing-desktop__list-mark" aria-hidden="true">02</span>
                개인 관리 폴더 감지와 빠른 로컬 캐시
              </li>
              <li>
                <span className="landing-desktop__list-mark" aria-hidden="true">03</span>
                개인 데이터는 로컬에, 원본은 서버 기준
              </li>
            </ul>
            <Link className="bubli-button bubli-button--primary bubli-button--lg" href="/#download">
              데스크탑 앱 받기
            </Link>
          </div>
          <GlassPanel className="landing-desktop__visual" padded={false}>
            <div className="landing-app-preview" aria-label="Bubli 앱 버전 미리보기">
              <div className="landing-app-preview__tabs">
                <button className="is-active" type="button">macOS 앱</button>
                <button type="button">Windows 앱</button>
                <button type="button">회원 웹 앱</button>
              </div>
              <div className="landing-app-preview__stage">
                <div className="landing-app-preview__chrome" aria-hidden="true">
                  <div className="landing-app-preview__bar">
                    <span />
                    <span />
                    <span />
                    <b>Bubli 회원 앱</b>
                  </div>
                  <div className="landing-app-preview__body">
                    <aside>
                      <span />
                      <span className="is-on" />
                      <span />
                      <span />
                    </aside>
                    <main>
                      <div className="landing-app-preview__summary">
                        <span>오늘 할 일 5</span>
                        <span>확인 필요 3</span>
                        <span>프로젝트룸 2</span>
                      </div>
                      <div className="landing-app-preview__lane">
                        <b>계약서 검토 질문 정리</b>
                        <small>자료 후보 승인에서 연결됨</small>
                      </div>
                      <div className="landing-app-preview__lane">
                        <b>회의록 결정사항 반영</b>
                        <small>오늘 대시보드와 버블에 표시</small>
                      </div>
                    </main>
                  </div>
                </div>
                <div className="landing-app-preview__widget" aria-hidden="true">
                  <div>
                    <b>버블 위젯</b>
                    <small>TODO 5 · 일정 2 · 자료 제안 3</small>
                  </div>
                </div>
                <div className="landing-app-preview__dock" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <b>Bubli</b>
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section landing-download" id="download">
          <GlassPanel className="landing-download__card" padded={false}>
            <header className="landing-download__head">
              <Chip selected>다운로드</Chip>
              <h2>최신 버전 받기</h2>
              <p>항상 최신 버전만 제공합니다. 설치 후 구글 로그인으로 바로 시작하세요.</p>
            </header>
            <div className="landing-download__rows">
              <div className="landing-download__row">
                <span className="landing-download__mark" aria-hidden="true">mac</span>
                <div className="landing-download__os">
                  <strong>macOS</strong>
                  <span>Apple Silicon · Intel</span>
                </div>
                <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/download">
                  최신 버전
                </Link>
              </div>
              <div className="landing-download__row">
                <span className="landing-download__mark" aria-hidden="true">win</span>
                <div className="landing-download__os">
                  <strong>Windows</strong>
                  <span>Windows 10 이상</span>
                </div>
                <Link className="bubli-button bubli-button--primary bubli-button--sm" href="/download">
                  최신 버전
                </Link>
              </div>
            </div>
          </GlassPanel>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section landing-faq" id="faq">
          <header className="landing-section__head">
            <Chip>자주 묻는 질문</Chip>
            <h2>Bubli, 이런 게 궁금해요</h2>
          </header>
          <div className="landing-faq__list">
            {faqItems.map((item) => (
              <GlassPanel className="landing-faq__item" key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </GlassPanel>
            ))}
          </div>
        </section>
      </Reveal>

      <footer className="landing-footer">
        <span className="landing-footer__brand bubli-wordmark">Bubli</span>
        <span className="landing-footer__copy">받은 자료를, 오늘 할 일로.</span>
        <nav aria-label="푸터" className="landing-footer__links">
          <Link href="/#features">기능</Link>
          <Link href="/#download">다운로드</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/login">로그인</Link>
        </nav>
      </footer>
    </>
  );
}
