"use client";

// 루트 레이아웃까지 실패한 최상위 에러(Internal Server Error) 바운더리.
// 레이아웃을 대체하므로 자체 <html><body>와 globals.css를 직접 포함한다.
import Link from "next/link";
import { useEffect } from "react";

import "@/styles/globals.css";
import styles from "./error-page.module.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("App global error", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className={styles.wrap}>
          <div className={styles.card} role="alert" aria-live="assertive">
            <img className={styles.bubble} src="/brand/bubble-sky.png" alt="" aria-hidden="true" />
            <p className={styles.code}>Internal Server Error</p>
            <h1 className={styles.title}>서버에 문제가 생겼어요</h1>
            <p className={styles.desc}>
              접속 중 문제가 발생했어요. 새로고침하거나 잠시 후 다시 열어 주세요.
              계속되면 잠시 뒤에 다시 시도해 주세요.
            </p>
            {error.digest ? <p className={styles.detail}>오류 코드: {error.digest}</p> : null}
            <div className={styles.actions}>
              <button className={[styles.btn, styles.primary].join(" ")} onClick={() => reset()} type="button">
                새로고침
              </button>
              <Link className={[styles.btn, styles.ghost].join(" ")} href="/">
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
