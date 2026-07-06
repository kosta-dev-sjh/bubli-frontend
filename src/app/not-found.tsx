// 404 — 존재하지 않는 경로 접근 시 앱 톤에 맞는 안내 화면.
import Link from "next/link";

import styles from "./error-page.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <img className={styles.bubble} src="/brand/bubble-sky.png" alt="" aria-hidden="true" />
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>페이지를 찾을 수 없어요</h1>
        <p className={styles.desc}>주소가 바뀌었거나 사라진 페이지예요. 홈에서 다시 시작해 주세요.</p>
        <div className={styles.actions}>
          <Link className={[styles.btn, styles.primary].join(" ")} href="/">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
