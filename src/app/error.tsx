"use client";

// 라우트 세그먼트 에러 바운더리 — 렌더/데이터 로딩 중 예외(서버 500·초기 접속 실패 등)를 잡아
// 앱 톤에 맞는 안내 화면을 보여준다. reset()으로 재시도, 홈으로 이동 제공.
import Link from "next/link";
import { useEffect } from "react";

import styles from "./error-page.module.css";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 관찰용 로깅(운영에서 digest로 서버 로그와 대조).
    console.error("App route error", error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card} role="alert" aria-live="assertive">
        <img className={styles.bubble} src="/brand/bubble-sky.png" alt="" aria-hidden="true" />
        <p className={styles.code}>일시적인 오류</p>
        <h1 className={styles.title}>잠시 문제가 생겼어요</h1>
        <p className={styles.desc}>
          예상치 못한 오류가 발생했어요. 다시 시도하거나 잠시 후에 열어 주세요.
        </p>
        {error.digest ? <p className={styles.detail}>오류 코드: {error.digest}</p> : null}
        <div className={styles.actions}>
          <button className={[styles.btn, styles.primary].join(" ")} onClick={() => reset()} type="button">
            다시 시도
          </button>
          <Link className={[styles.btn, styles.ghost].join(" ")} href="/">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
