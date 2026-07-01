import { CalendarClock, CheckCircle2, CircleDollarSign, FileCheck2, ShieldAlert } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./project-reference-info.module.css";

const referenceItems = [
  {
    label: "견적 금액",
    value: "8,000,000원",
    note: "견적서_최종.pdf 후보",
    tone: "personal" as const,
  },
  {
    label: "예상 금액",
    value: "8,500,000원",
    note: "사용자 확인 전",
    tone: "warning" as const,
  },
  {
    label: "입금 예정일",
    value: "검수 후 7일",
    note: "일정 후보 연결 가능",
    tone: "pending" as const,
  },
  {
    label: "입금 상태",
    value: "입금 대기",
    note: "단순 상태 기록",
    tone: "room" as const,
  },
];

const checkItems = [
  ["금액/부가세", "견적서와 기준 자료 금액이 다르면 확인 필요 항목으로 표시"],
  ["지급 조건", "검수 완료 후 며칠 이내인지 문서에서 후보 추출"],
  ["납품물", "금액보다 작업 범위와 납품 기준을 함께 확인"],
];

const boundaryItems = ["프로젝트룸 참고 정보로 표시", "문서 조건 확인 중심", "복잡한 금액 계산 제외", "작업 버블과 분리"];

export function ProjectReferenceInfo() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <CircleDollarSign size={16} aria-hidden="true" />
          프로젝트 참고 정보
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>예상 금액은 작업 기준을 확인하는 참고값입니다</h2>
            <p className={styles.summary}>
              Bubli는 기준 자료와 견적서에서 금액, 지급 조건, 입금 예정일 후보를 뽑아 프로젝트룸 참고 정보로 함께 보여줍니다. 이 값은
              작업 범위와 마감 확인을 돕는 보조 정보로 다룹니다.
            </p>
          </div>
          <StatusBadge tone="pending">사용자 확인 전 후보</StatusBadge>
        </div>
      </header>

      <section className={styles.referenceGrid} aria-label="프로젝트 참고값">
        {referenceItems.map((item) => (
          <article className={styles.referenceCard} key={item.label}>
            <div className={styles.cardTop}>
              <span>{item.label}</span>
              <StatusBadge tone={item.tone}>{item.note}</StatusBadge>
            </div>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.contentGrid} aria-label="자료 참고 정보 확인 기준">
        <div className={styles.checkPanel}>
          <div className={styles.panelTitle}>
            <FileCheck2 size={18} aria-hidden="true" />
            <h3>확인 필요 항목으로 보는 값</h3>
          </div>
          <div className={styles.checkList}>
            {checkItems.map(([title, body]) => (
              <article className={styles.checkItem} key={title}>
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {title}
                </span>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.boundaryPanel} aria-label="기능 범위 기준">
          <div className={styles.panelTitle}>
            <ShieldAlert size={18} aria-hidden="true" />
            <h3>표시 범위</h3>
          </div>
          <div className={styles.boundaryList}>
            {boundaryItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p>
            입금 여부는 프로젝트 진행 참고 상태로만 기록합니다. 별도 관리 화면을 만들지 않고 작업 기준 확인 흐름 안에서만
            보여줍니다.
          </p>
        </aside>
      </section>

      <footer className={styles.footer}>
        <Chip selected icon={<CalendarClock size={14} aria-hidden="true" />}>
          프로젝트룸 참고 정보로 표시
        </Chip>
        <Chip icon={<FileCheck2 size={14} aria-hidden="true" />}>사용자 확인 후 저장</Chip>
        <Chip icon={<CircleDollarSign size={14} aria-hidden="true" />}>작업 범위 확인 보조</Chip>
      </footer>
    </GlassPanel>
  );
}
