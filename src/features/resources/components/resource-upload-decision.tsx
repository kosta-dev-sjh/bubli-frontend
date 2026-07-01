import type { ReactNode } from "react";

import {
  ArrowRight,
  Bot,
  Database,
  FileText,
  FolderInput,
  HardDrive,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./resource-upload-decision.module.css";

type DecisionStep = {
  description: string;
  label: string;
};

type DecisionCard = {
  description: string;
  icon: ReactNode;
  meta: string;
  steps: DecisionStep[];
  title: string;
};

const decisionCards: DecisionCard[] = [
  {
    description:
      "사용자가 확인한 뒤 자료 원본과 버전을 서버 자료보드에 기록하고 에이전트 정리 작업을 시작합니다.",
    icon: <Database size={18} strokeWidth={2.1} />,
    meta: "자료 원본 · 버전 · 에이전트 정리 작업 기록",
    steps: [
      { label: "용량 확인", description: "개인 자료함 용량과 파일 크기를 확인" },
      { label: "권한 확인", description: "개인 자료 또는 프로젝트룸 자료 범위 선택" },
      { label: "후보 생성", description: "요약, 확인 항목, WBS/TODO 후보 요청" },
    ],
    title: "자료보드 저장",
  },
  {
    description:
      "원본을 자료보드에 등록하지 않고 현재 대화에서만 요약과 확인 항목을 살펴봅니다.",
    icon: <MessageSquareText size={18} strokeWidth={2.1} />,
    meta: "현재 대화 안에서만 확인",
    steps: [
      { label: "현재 대화", description: "대화 안에서만 결과 확인" },
      { label: "원본 미등록", description: "resources 레코드를 만들지 않음" },
      { label: "저장 전 검토", description: "필요할 때 사용자가 다시 저장 선택" },
    ],
    title: "잠깐 분석",
  },
];

const boundaries = [
  {
    icon: <HardDrive size={16} strokeWidth={2.1} />,
    label: "기기 안 파일",
    text: "개인 관리 폴더 파일은 먼저 기기 안에서 감지하고 변경 기록을 남깁니다.",
  },
  {
    icon: <FolderInput size={16} strokeWidth={2.1} />,
    label: "개인 자료함",
    text: "사용자가 저장을 선택한 항목만 용량 기준 안에서 서버 자료보드에 반영됩니다.",
  },
  {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    label: "프로젝트룸 공유",
    text: "자료보드에 저장한 뒤에도 프로젝트룸 공유는 별도 승인으로 처리합니다.",
  },
  {
    icon: <Bot size={16} strokeWidth={2.1} />,
    label: "에이전트 후보",
    text: "에이전트 결과는 확정 데이터가 아니라 사용자가 검토할 후보로 남습니다.",
  },
];

function DecisionCardView({ card }: { card: DecisionCard }) {
  return (
    <article className={styles.decisionCard}>
      <div className={styles.cardHeader}>
        <span className="bubli-icon-tile" aria-hidden="true">
          {card.icon}
        </span>
        <div>
          <h3>{card.title}</h3>
          <p>{card.description}</p>
        </div>
      </div>
          <p className={styles.metaText}>{card.meta}</p>
      <ol className={styles.stepList}>
        {card.steps.map((step) => (
          <li key={step.label}>
            <strong>{step.label}</strong>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function ResourceUploadDecision() {
  return (
    <section className={styles.panel} aria-label="자료 업로드 저장 방식 선택">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<UploadCloud size={14} />} selected>
            자료 업로드 판단
          </Chip>
          <h2>파일을 올린 뒤 저장 방식부터 고릅니다</h2>
          <p>
            Bubli는 자료보드에 저장할지, 현재 대화에서만 잠깐 분석할지 사용자가 먼저 선택하게 합니다.
            이 선택이 개인 자료, 프로젝트룸 자료, 에이전트 후보의 경계를 지킵니다.
          </p>
        </div>

        <div className={styles.filePreview} aria-label="선택된 파일">
          <div className={styles.fileTop}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <FileText size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>요구사항정리_v2.pdf</h3>
              <p>PDF · 2.4MB · 개인 관리 폴더에서 선택</p>
            </div>
          </div>
          <div className={styles.fileMeta}>
            <StatusBadge tone="personal">개인 자료 후보</StatusBadge>
            <StatusBadge tone="neutral">저장 방식 대기</StatusBadge>
          </div>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label="자료 업로드 판단 흐름">
        <span>파일 선택</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>저장 방식 선택</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>자료보드 저장 또는 잠깐 분석</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>에이전트 후보 확인</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.decisions}>
          {decisionCards.map((card) => (
            <DecisionCardView card={card} key={card.title} />
          ))}
        </div>

        <GlassPanel className={styles.boundaryPanel}>
          <h3>저장 경계</h3>
          <p>
            같은 파일이라도 기기 안 색인, 개인 자료함 저장, 프로젝트룸 공유는 서로 다른 단계입니다.
          </p>
          <div className={styles.boundaryList}>
            {boundaries.map((item) => (
              <article className={styles.boundaryItem} key={item.label}>
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.notice}>
            <strong>기획 기준</strong>
            <span>
              서버에 남는 자료는 사용자가 저장을 선택한 항목입니다. 프로젝트룸 멤버에게 보이게 하려면
              공유 승인 단계를 한 번 더 거칩니다.
            </span>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
