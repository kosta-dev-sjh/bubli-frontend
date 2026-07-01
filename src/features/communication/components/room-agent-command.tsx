import { Bot, Database, FileText, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./room-agent-command.module.css";

const commands = [
  {
    command: "/bubli 정리",
    title: "대화 맥락 정리",
    body: "결정사항, 남은 질문, 관련 자료를 프로젝트룸 기준으로 묶습니다.",
    selected: true,
  },
  {
    command: "/bubli todo",
    title: "TODO 후보",
    body: "채팅과 프로젝트룸 자료에서 담당자와 마감 후보를 찾습니다.",
    selected: false,
  },
  {
    command: "/bubli 질문",
    title: "확인 질문",
    body: "클라이언트에게 다시 확인할 문장을 후보로 제안합니다.",
    selected: false,
  },
];

const flowRows = [
  ["명령 입력", "프로젝트룸 채팅에서 /bubli 명령어 실행"],
  ["맥락 조회", "프로젝트룸 채팅과 장기요약 기준"],
  ["응답 저장", "에이전트 응답을 프로젝트룸 채팅에 저장"],
  ["장기요약", "필요한 범위만 프로젝트룸 장기요약에 저장"],
];

const chatPreview = [
  ["나", "오후 공유 전까지 검수 기준 문구를 다시 정리해야 해."],
  ["미", "요구사항정리_v2.pdf 7조랑 회의록_0618 기준으로 보면 될 것 같아요."],
  ["에", "결정사항 2개, 남은 질문 3개, TODO 후보 2개를 찾았어요. 승인 전에는 작업판에 반영하지 않습니다."],
];

export function RoomAgentCommand() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <MessageCircle size={16} aria-hidden="true" />
          프로젝트룸 채팅
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>프로젝트룸 안에서는 명령어로 에이전트를 부릅니다</h2>
            <p className={styles.summary}>
              프로젝트룸 에이전트는 프로젝트룸 자료와 프로젝트룸 채팅만 기준으로 답합니다. 응답은 협업 기록으로 남고, 개인
              에이전트의 로컬 대화와는 저장 위치가 다릅니다.
            </p>
          </div>
          <StatusBadge tone="room">프로젝트룸 멤버 권한</StatusBadge>
        </div>
      </header>

      <section className={styles.commandComposer} aria-label="프로젝트룸 에이전트 명령어 입력">
        <div className={styles.composerTop}>
          <Chip selected icon={<Bot size={14} aria-hidden="true" />}>
            프로젝트룸 에이전트
          </Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>공유 전 개인 자료 제외</Chip>
        </div>
        <div className={styles.inputLine}>
          <span>/bubli 정리</span>
          <small>이 대화와 요구사항정리_v2 기준으로 결정사항 정리해줘</small>
          <button type="button" aria-label="명령어 보내기">
            <Send size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className={styles.contentGrid} aria-label="명령어와 프로젝트룸 채팅 미리보기">
        <div className={styles.commandList}>
          {commands.map((item) => (
            <article className={item.selected ? styles.commandSelected : styles.commandCard} key={item.command}>
              <strong>{item.command}</strong>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.chatPanel} aria-label="프로젝트룸 채팅 응답 미리보기">
          <div className={styles.chatHeader}>
            <div>
              <h3>K-Stay 프로젝트룸 채팅</h3>
              <p>서버 채팅 원본 · 앱은 최근 대화만 기기 안에 임시 보관</p>
            </div>
            <StatusBadge tone="agent">에이전트 응답</StatusBadge>
          </div>
          <div className={styles.chatList}>
            {chatPreview.map(([sender, body]) => (
              <div className={sender === "에" ? styles.agentMessage : styles.chatMessage} key={`${sender}-${body}`}>
                <span>{sender}</span>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.flowGrid} aria-label="프로젝트룸 에이전트 저장 흐름">
        {flowRows.map(([label, value]) => (
          <article className={styles.flowCard} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <span>
          <Database size={14} aria-hidden="true" />
          프로젝트룸 응답은 서버 채팅 원본에 남습니다.
        </span>
        <span>
          <FileText size={14} aria-hidden="true" />
          개인 에이전트 원문은 기기 안 저장소에만 둡니다.
        </span>
        <span>
          <Sparkles size={14} aria-hidden="true" />
          WBS/TODO는 후보로 만들고 사용자 승인 뒤 반영합니다.
        </span>
      </footer>
    </GlassPanel>
  );
}
