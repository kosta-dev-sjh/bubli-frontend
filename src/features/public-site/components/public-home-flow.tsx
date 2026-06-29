"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const flowSteps = [
  {
    body: "계약서, 요구사항, 회의록을 프로젝트룸 기준으로 모읍니다.",
    label: "들어온 자료",
    meta: "들어온 자료",
    signal: "계약서와 회의록",
    title: "자료 업로드",
  },
  {
    body: "작업 범위, 확인 질문, WBS/TODO 후보를 제안합니다.",
    label: "에이전트 후보",
    meta: "정리 후보",
    signal: "확인할 일만 제안",
    title: "후보 생성",
  },
  {
    body: "사용자가 확인한 항목만 실제 작업으로 이어집니다.",
    label: "사용자 승인",
    meta: "사용자 확인",
    signal: "내가 확정",
    title: "사용자 승인",
  },
  {
    body: "같은 TODO를 작업판, 대시보드, 일정에서 같은 기준으로 확인합니다.",
    label: "실행 화면",
    meta: "실행 화면",
    signal: "대시보드와 버블",
    title: "작업 연결",
  },
];

type StickyMode = "before" | "fixed" | "after" | "static";

export function PublicHomeFlow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stickyMode, setStickyMode] = useState<StickyMode>("before");
  const [stickyFrame, setStickyFrame] = useState<CSSProperties>({});
  const activeStep = flowSteps[activeIndex] ?? flowSteps[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    let frame = 0;
    const syncActiveStep = () => {
      const rect = section.getBoundingClientRect();
      const stickyHeight = Math.min(window.innerHeight - 120, 980);
      const scrollable = Math.max(rect.height - stickyHeight, 1);
      const progress = Math.min(1, Math.max(0, (92 - rect.top) / scrollable));
      const next = Math.min(flowSteps.length - 1, Math.floor(progress * flowSteps.length));
      setActiveIndex(next);

      if (window.matchMedia("(max-width: 960px)").matches) {
        setStickyMode("static");
        setStickyFrame({});
        return;
      }

      if (rect.top > 92) {
        setStickyMode("before");
        setStickyFrame({});
        return;
      }

      if (rect.bottom - stickyHeight < 92) {
        setStickyMode("after");
        setStickyFrame({});
        return;
      }

      setStickyMode("fixed");
      setStickyFrame({
        left: rect.left,
        width: rect.width,
      });
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

  return (
    <section className="public-home-flow public-home-flow--story" aria-label="Bubli 핵심 업무 흐름" ref={sectionRef}>
      <div className={cn("public-home-flow__sticky", `is-${stickyMode}`)} style={stickyFrame}>
        <div className="public-home-flow__copy">
          <Chip selected>핵심 흐름</Chip>
          <h2>
            {activeStep.title}
            <br />
            <span>{activeStep.signal}</span>
          </h2>
          <p>{activeStep.body}</p>
          <div className="public-home-flow__story-status" aria-label="현재 단계">
            {flowSteps.map((step, index) => (
              <span className={cn(index === activeIndex && "is-active")} key={step.title}>
                {step.meta}
              </span>
            ))}
          </div>
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
            <b>{activeIndex < 2 ? "후보" : "확정"}</b>
            <span>{activeIndex < 2 ? "아직 작업으로 만들지 않음" : "작업판과 버블에 표시"}</span>
          </div>
          <div className="public-home-flow__story-trace" aria-hidden="true">
            {flowSteps.map((step, index) => (
              <span className={cn(index <= activeIndex && "is-on")} key={step.meta} />
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
                  <span className="public-home-flow__step-meta">{step.meta}</span>
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
