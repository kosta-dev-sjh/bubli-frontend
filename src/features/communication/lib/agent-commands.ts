import type { MessageKey } from "@/lib/i18n";
import type { RoomAgentCommandMode } from "@/types/api/chat";

// /bubli 에이전트 명령 문법의 단일 출처.
// - 웹 소통창 컴포저(src/app/(workspace)/app/chat/page.tsx)와
//   위젯 chat 버블 컴포저(src/features/widget/components/desktop-widget-bubble.tsx)가 함께 쓴다.
// - mode 매핑은 백엔드 계약(POST /api/project-rooms/{roomId}/agent/commands,
//   AgentCommandMode = ANSWER | SUMMARIZE | SUGGEST)과 백엔드 inferSuggestionType 키워드
//   (TODO/TASK/REQUIREMENT/QUESTION/REVIEW_ITEM)를 따른다.
export const AGENT_COMMAND_PREFIX = "/bubli";

export type AgentCommandDefinition = {
  /** 첫 키워드의 동의어(소문자 비교). */
  aliases: string[];
  /** 완성될 명령 텍스트(예: "/bubli 정리"). */
  command: string;
  /** 자동완성 목록에 보여줄 1줄 설명. */
  descriptionKey: MessageKey;
  id: string;
  /** 대표 키워드. 빈 문자열이면 자유 질문(ANSWER) 항목. */
  keyword: string;
  mode: RoomAgentCommandMode;
};

export const agentCommandDefinitions: AgentCommandDefinition[] = [
  {
    aliases: ["요약", "summary", "summarize"],
    command: `${AGENT_COMMAND_PREFIX} 정리`,
    descriptionKey: "chat.agentCommands.summarizeDesc",
    id: "summarize",
    keyword: "정리",
    mode: "SUMMARIZE",
  },
  {
    aliases: ["할일", "to-do"],
    command: `${AGENT_COMMAND_PREFIX} todo`,
    descriptionKey: "chat.agentCommands.todoDesc",
    id: "todo",
    keyword: "todo",
    mode: "SUGGEST",
  },
  {
    aliases: ["태스크", "task"],
    command: `${AGENT_COMMAND_PREFIX} 작업`,
    descriptionKey: "chat.agentCommands.taskDesc",
    id: "task",
    keyword: "작업",
    mode: "SUGGEST",
  },
  {
    aliases: ["question"],
    command: `${AGENT_COMMAND_PREFIX} 질문`,
    descriptionKey: "chat.agentCommands.questionDesc",
    id: "question",
    keyword: "질문",
    mode: "SUGGEST",
  },
  {
    aliases: ["requirement"],
    command: `${AGENT_COMMAND_PREFIX} 요구사항`,
    descriptionKey: "chat.agentCommands.requirementDesc",
    id: "requirement",
    keyword: "요구사항",
    mode: "SUGGEST",
  },
  {
    aliases: ["리뷰", "review"],
    command: `${AGENT_COMMAND_PREFIX} 검토`,
    descriptionKey: "chat.agentCommands.reviewDesc",
    id: "review",
    keyword: "검토",
    mode: "SUGGEST",
  },
  {
    aliases: ["suggest", "proposal"],
    command: `${AGENT_COMMAND_PREFIX} 제안`,
    descriptionKey: "chat.agentCommands.suggestDesc",
    id: "suggest",
    keyword: "제안",
    mode: "SUGGEST",
  },
  {
    aliases: [],
    command: AGENT_COMMAND_PREFIX,
    descriptionKey: "chat.agentCommands.answerDesc",
    id: "answer",
    keyword: "",
    mode: "ANSWER",
  },
];

// 첫 토큰으로 mode를 정한다. 기존 정규식의 \b는 한글 키워드 뒤에서 단어 경계가
// 성립하지 않아("정리 …"가 ANSWER로 빠짐) 토큰 비교로 대체했다.
export function inferAgentCommandMode(message: string): RoomAgentCommandMode {
  const token = message.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!token) return "ANSWER";

  const matched = agentCommandDefinitions.find(
    (definition) => definition.keyword !== "" && (definition.keyword === token || definition.aliases.includes(token)),
  );
  return matched?.mode ?? "ANSWER";
}

const COMMAND_TEXT_PATTERN = /^\/bubli(?:\s+([\s\S]+))?$/i;

/** "/bubli …" 전체 텍스트를 {message, mode}로 파싱한다. 명령이 아니면 null. */
export function parseAgentCommandText(text: string): { message: string; mode: RoomAgentCommandMode } | null {
  const match = text.trim().match(COMMAND_TEXT_PATTERN);
  if (!match) return null;

  const message = match[1]?.trim() ?? "";
  return { message, mode: message ? inferAgentCommandMode(message) : "ANSWER" };
}

/** 위젯 에이전트 버블처럼 접두어가 불필요한 표면에서 "/bubli "를 제거한다. */
export function stripAgentCommandPrefix(text: string) {
  const trimmed = text.trim();
  if (!/^\/bubli(\s|$)/i.test(trimmed)) return trimmed;
  return trimmed.replace(/^\/bubli\s*/i, "").trim();
}

/** 자동완성 선택 시 컴포저에 넣을 완성 텍스트. */
export function completeAgentCommand(definition: AgentCommandDefinition) {
  return `${definition.command} `;
}

// 컴포저 입력값 기준 자동완성 후보. 열지 않아야 하면 null.
// - 줄 시작의 "/"부터 "/bubli"까지: 전체 목록
// - "/bubli 정" 같은 키워드 입력 중: 키워드/동의어 prefix 필터
// - 키워드 뒤에 본문을 쓰기 시작하면 닫는다.
export function getAgentCommandSuggestions(draft: string): AgentCommandDefinition[] | null {
  if (draft.includes("\n")) return null;

  const value = draft.trimStart();
  if (!value.startsWith("/")) return null;

  const lower = value.toLowerCase();
  if (AGENT_COMMAND_PREFIX.startsWith(lower)) return [...agentCommandDefinitions];
  if (!lower.startsWith(AGENT_COMMAND_PREFIX)) return null;

  const rest = value.slice(AGENT_COMMAND_PREFIX.length);
  if (rest !== "" && !rest.startsWith(" ")) return null;

  const keywordPart = rest.trimStart();
  if (keywordPart.includes(" ")) return null;

  const token = keywordPart.toLowerCase();
  if (token === "") return [...agentCommandDefinitions];

  const filtered = agentCommandDefinitions.filter(
    (definition) =>
      definition.keyword !== "" &&
      [definition.keyword, ...definition.aliases].some((candidate) => candidate.toLowerCase().startsWith(token)),
  );
  return filtered.length > 0 ? filtered : null;
}
