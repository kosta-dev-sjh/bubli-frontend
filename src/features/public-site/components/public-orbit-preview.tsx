"use client";

import type { CSSProperties, PointerEvent } from "react";

const orbitItems = [
  { className: "public-orbit-preview__node--file", label: "자료", title: "계약서와 회의록" },
  { className: "public-orbit-preview__node--agent", label: "후보", title: "확인할 항목" },
  { className: "public-orbit-preview__node--approve", label: "승인", title: "내가 확정" },
  { className: "public-orbit-preview__node--todo", label: "실행", title: "오늘 할 일" },
];

const widgetItems = [
  { label: "할 일", title: "오늘 먼저 볼 일" },
  { label: "일정", title: "다음 약속" },
  { label: "타이머", title: "25:00" },
];

function setPointerVars(element: HTMLElement, x: number, y: number) {
  element.style.setProperty("--orbit-x", x.toFixed(3));
  element.style.setProperty("--orbit-y", y.toFixed(3));
}

function handlePointerMove(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  setPointerVars(event.currentTarget, x, y);
}

function handlePointerLeave(event: PointerEvent<HTMLElement>) {
  setPointerVars(event.currentTarget, 0, 0);
}

export function PublicOrbitPreview() {
  return (
    <section
      className="public-orbit-preview"
      aria-label="자료가 업무와 데스크탑 버블로 이어지는 모습"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={{ "--orbit-x": 0, "--orbit-y": 0 } as CSSProperties}
    >
      <div className="public-orbit-preview__scene">
        <div className="public-orbit-preview__bubble" aria-hidden="true">
          <img src="/assets/bubble-sky.webp" alt="" />
        </div>

        <div className="public-orbit-preview__ring" aria-hidden="true" />

        {orbitItems.map((item) => (
          <div className={`public-orbit-preview__node ${item.className}`} key={item.title}>
            <span>{item.label}</span>
            <b>{item.title}</b>
          </div>
        ))}

        <div className="public-orbit-preview__workspace">
          <div className="public-orbit-preview__bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <b>Bubli 업무 흐름</b>
          </div>
          <div className="public-orbit-preview__flow">
            <article>
              <span>들어온 자료</span>
              <b>프로젝트룸에 모으기</b>
              <small>계약서, 요구사항, 회의록</small>
            </article>
            <article>
              <span>에이전트 후보</span>
              <b>확인할 일만 제안</b>
              <small>질문, WBS, TODO 후보</small>
            </article>
            <article>
              <span>사용자 승인</span>
              <b>확정된 일만 실행</b>
              <small>작업판, 일정, 대시보드</small>
            </article>
          </div>
        </div>

        <div className="public-orbit-preview__widgets" aria-label="데스크탑 버블 위젯 미리보기">
          {widgetItems.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <b>{item.title}</b>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
