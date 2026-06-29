"use client";

import { useEffect } from "react";

/**
 * 공개(비회원) 페이지는 라이트 모드 전용.
 * 회원앱에서 다크로 둔 사용자가 공개 페이지로 와도 항상 라이트로 강제하고,
 * 공개 페이지를 떠나면 이전 테마로 되돌린다.
 */
export function ForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme");
    const force = () => {
      if (html.getAttribute("data-theme") !== "light") {
        html.setAttribute("data-theme", "light");
      }
    };
    force();
    const observer = new MutationObserver(force);
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      if (prev && prev !== "light") {
        html.setAttribute("data-theme", prev);
      }
    };
  }, []);

  return null;
}
