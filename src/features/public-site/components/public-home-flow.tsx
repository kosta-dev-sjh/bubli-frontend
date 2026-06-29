"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const flowSteps = [
  {
    body: "계약서와 회의록을 프로젝트룸에 넣으면, 자료가 흩어진 파일이 아니라 오늘 일을 만드는 출발점이 됩니다.",
    headline: "자료가 한곳에 모입니다",
    label: "들어온 자료",
    short: "자료",
    title: "받은 자료를 올리면",
  },
  {
    body: "Bubli는 납품일, 확인 질문, 작업 범위처럼 다시 봐야 할 부분만 후보로 꺼냅니다.",
    headline: "확인할 일만 남깁니다",
    label: "정리 후보",
    short: "후보",
    title: "필요한 것만 골라",
  },
  {
    body: "사용자가 승인한 후보만 실제 TODO와 일정으로 이어집니다. 에이전트가 임의로 일을 바꾸지 않습니다.",
    headline: "내가 확인하면 일이 됩니다",
    label: "사용자 확인",
    short: "승인",
    title: "확정하면",
  },
  {
    body: "확정된 일은 작업판, 대시보드, 데스크탑 버블에서 같은 기준으로 다시 보입니다.",
    headline: "오늘 할 일로 이어집니다",
    label: "실행 화면",
    short: "실행",
    title: "작업 중에도",
  },
];

export function PublicHomeFlow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const activeStep = flowSteps[activeIndex] ?? flowSteps[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    let frame = 0;
    const syncActiveStep = () => {
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(rect.height - window.innerHeight, 1);
      const nextProgress = Math.min(1, Math.max(0, (window.innerHeight * 0.42 - rect.top) / scrollable));
      const next = Math.min(flowSteps.length - 1, Math.floor(nextProgress * flowSteps.length));
      setProgress(nextProgress);
      setActiveIndex(next);
    };

    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveStep);
    };

    syncActiveStep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const flowStyle = { "--flow-progress": progress } as CSSProperties;

  return (
    <section className="public-home-flow public-home-flow--story" aria-label="Bubli 핵심 업무 흐름" ref={sectionRef}>
      <div className="public-home-flow__sticky" style={flowStyle}>
        <video aria-hidden="true" autoPlay className="public-home-flow__video" loop muted playsInline poster="/landing/hero-bg.png">
          <source src="/landing/slow-bubble-flow.mp4" type="video/mp4" />
        </video>
        <span aria-hidden="true" className="public-home-flow__veil" />
        <div className="public-home-flow__copy">
          <span className="public-home-flow__eyebrow">받은 자료가 오늘 할 일이 되기까지</span>
          <h2>
            {activeStep.title}
            <br />
            <span>{activeStep.headline}</span>
          </h2>
          <p>{activeStep.body}</p>
        </div>

        <div className="public-home-flow__story-visual" aria-live="polite" data-step={activeIndex}>
          <div className="public-home-flow__story-ring" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <article className="public-home-flow__story-card">
            <span>{activeStep.label}</span>
            <h3>{activeStep.title}</h3>
            <p>{activeStep.body}</p>
          </article>
          <div className="public-home-flow__story-output" aria-hidden="true">
            <b>{activeIndex < 2 ? "정리 중" : "오늘 할 일"}</b>
            <span>{activeIndex < 2 ? "아직 확정하지 않은 후보" : "확정된 일만 표시"}</span>
          </div>
          <div className="public-home-flow__story-trace" aria-hidden="true">
            {flowSteps.map((step, index) => (
              <span className={cn(index <= activeIndex && "is-on")} key={step.short} />
            ))}
          </div>
        </div>
      </div>

      <div className="public-home-flow__scroll-track" aria-label="자료에서 실행 화면까지 이어지는 순서">
        <div className="public-home-flow__steps">
          {flowSteps.map((step, index) => {
            return (
              <article className={cn("public-home-flow__step", index === activeIndex && "is-active")} key={step.title}>
                <span className="public-home-flow__step-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="public-home-flow__step-meta">{step.short}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
