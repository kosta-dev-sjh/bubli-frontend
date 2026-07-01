import { Bot, CheckCircle2, Clock3, FilePlus2, Mic, RefreshCcw, Send, Smile, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./chat-message-composer.module.css";

type SendState = "PENDING_SEND" | "SENT" | "FAILED";

type MessageStateItem = {
  detail: string;
  icon: ReactNode;
  label: string;
  state: SendState;
};

const messageStates: MessageStateItem[] = [
  {
    detail: "전송 요청을 보낸 뒤 서버 응답을 기다립니다.",
    icon: <Clock3 size={16} />,
    label: "전송 대기",
    state: "PENDING_SEND",
  },
  {
    detail: "서버에 저장된 뒤 채팅방에 표시됩니다.",
    icon: <CheckCircle2 size={16} />,
    label: "저장 완료",
    state: "SENT",
  },
  {
    detail: "재전송해도 같은 메시지는 중복 저장하지 않습니다.",
    icon: <XCircle size={16} />,
    label: "전송 실패",
    state: "FAILED",
  },
];

const commandHints = [
  { command: "/bubli 정리", label: "최근 대화 결정사항 정리" },
  { command: "/bubli todo", label: "TODO 후보 만들기" },
  { command: "/bubli 질문", label: "클라이언트 확인 질문 제안" },
];

export function ChatMessageComposer() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>메시지 작성</Chip>
          <h2 className={styles.title}>채팅 입력과 전송 상태</h2>
          <p className={styles.description}>
            메시지는 서버에 저장된 뒤 전송 완료로 봅니다. 같은 전송 키로 다시 보내면 중복 저장을 막고 기존 메시지를 반환합니다.
          </p>
        </div>
        <StatusBadge tone="communication">전송 요청</StatusBadge>
      </header>

      <section className={styles.composeCard} aria-labelledby="member-composer-title">
        <div className={styles.composeHeader}>
          <div>
            <h3 id="member-composer-title">채팅 입력창</h3>
            <span>프로젝트룸 멤버와 1:1 친구 채팅에서 사용</span>
          </div>
          <StatusBadge tone="success">회원</StatusBadge>
        </div>

        <div className={styles.commandRail} aria-label="에이전트 명령어 후보">
          {commandHints.map((hint) => (
            <button key={hint.command} type="button">
              <Bot size={14} />
              <strong>{hint.command}</strong>
              <span>{hint.label}</span>
            </button>
          ))}
        </div>

        <ComposerBox />
      </section>

      <section className={styles.stateSection} aria-labelledby="message-state-title">
        <div className={styles.sectionHeader}>
          <h3 id="message-state-title">전송 상태</h3>
          <span>서버 저장 전 메시지는 확정 데이터가 아닙니다.</span>
        </div>
        <div className={styles.stateList}>
          {messageStates.map((item) => (
            <MessageStateCard item={item} key={item.state} />
          ))}
        </div>
      </section>
    </GlassPanel>
  );
}

function ComposerBox() {
  return (
    <div className={styles.composerBox}>
      <div className={styles.textareaWrap}>
        <textarea
          aria-label="메시지 보내기"
          defaultValue="/bubli 질문 업무 범위 문서와 회의록에서 일정이 다른 부분 정리해줘."
          rows={3}
        />
      </div>
      <div className={styles.toolBar}>
        <div className={styles.leftTools}>
          <ToolButton icon={<Smile size={16} />} label="리액션" />
          <ToolButton icon={<FilePlus2 size={16} />} label="자료 연결" />
          <ToolButton icon={<Mic size={16} />} label="보이스" />
        </div>
        <Button icon={<Send size={15} />} size="sm" variant="primary">
          보내기
        </Button>
      </div>
    </div>
  );
}

function ToolButton({ disabled = false, icon, label }: { disabled?: boolean; icon: ReactNode; label: string }) {
  return (
    <button className={styles.toolButton} disabled={disabled} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MessageStateCard({ item }: { item: MessageStateItem }) {
  const tone = item.state === "SENT" ? "success" : item.state === "FAILED" ? "warning" : "pending";
  const label = item.state === "SENT" ? "완료" : item.state === "FAILED" ? "재시도" : "대기";

  return (
    <article className={styles.stateCard}>
      <span className={styles.stateIcon} aria-hidden="true">
        {item.state === "FAILED" ? <RefreshCcw size={16} /> : item.icon}
      </span>
      <div>
        <strong>{item.label}</strong>
        <p>{item.detail}</p>
      </div>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </article>
  );
}
