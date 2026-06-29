"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** 스태거용 지연(ms) */
  delay?: number;
};

/**
 * 스크롤 진입 시 부드럽게 나타나는 래퍼(공개 랜딩 전용).
 * - SSR/JS 미동작/스크린샷 시점에는 기본 visible(접근성·no-JS 안전).
 * - 마운트 후 armed로 숨겼다가 뷰포트 진입 시 is-visible로 애니메이션.
 * - prefers-reduced-motion이면 애니메이션 없이 즉시 표시.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // 모션 줄이기: 그대로 표시
    }
    el.classList.add("bubli-reveal--armed");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    <div ref={ref} className={cn("bubli-reveal", className)} style={style}>
      {children}
    </div>
  );
}
