import type { MessageKey } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n";
import { messages } from "@/lib/i18n/messages";
import type { RoomAgentCommandMode } from "@/types/api/chat";

// Single source for the /bubli command grammar shared by the web chat composer
// and the desktop widget chat bubble.
export const AGENT_COMMAND_PREFIX = "/bubli";

export type TranslateCommandFn = (key: MessageKey) => string;

export type AgentCommandDefinition = {
  aliases: string[];
  commandKey: MessageKey;
  descriptionKey: MessageKey;
  id: string;
  mode: RoomAgentCommandMode;
};

export type LocalizedAgentCommandDefinition = AgentCommandDefinition & {
  command: string;
  keyword: string;
};

export const agentCommandDefinitions: AgentCommandDefinition[] = [
  {
    aliases: ["요약", "要約", "summary", "summarize"],
    commandKey: "chat.agentCommands.summarizeCommand",
    descriptionKey: "chat.agentCommands.summarizeDesc",
    id: "summarize",
    mode: "SUMMARIZE",
  },
  {
    aliases: ["할일", "todo", "to-do"],
    commandKey: "chat.agentCommands.todoCommand",
    descriptionKey: "chat.agentCommands.todoDesc",
    id: "todo",
    mode: "SUGGEST",
  },
  {
    aliases: ["태스크", "タスク", "task"],
    commandKey: "chat.agentCommands.taskCommand",
    descriptionKey: "chat.agentCommands.taskDesc",
    id: "task",
    mode: "SUGGEST",
  },
  {
    aliases: ["question"],
    commandKey: "chat.agentCommands.questionCommand",
    descriptionKey: "chat.agentCommands.questionDesc",
    id: "question",
    mode: "SUGGEST",
  },
  {
    aliases: ["requirement"],
    commandKey: "chat.agentCommands.requirementCommand",
    descriptionKey: "chat.agentCommands.requirementDesc",
    id: "requirement",
    mode: "SUGGEST",
  },
  {
    aliases: ["리뷰", "レビュー", "review"],
    commandKey: "chat.agentCommands.reviewCommand",
    descriptionKey: "chat.agentCommands.reviewDesc",
    id: "review",
    mode: "SUGGEST",
  },
  {
    aliases: ["suggest", "proposal"],
    commandKey: "chat.agentCommands.suggestCommand",
    descriptionKey: "chat.agentCommands.suggestDesc",
    id: "suggest",
    mode: "SUGGEST",
  },
  {
    aliases: [],
    commandKey: "chat.agentCommands.answerCommand",
    descriptionKey: "chat.agentCommands.answerDesc",
    id: "answer",
    mode: "ANSWER",
  },
];

function normalizeCommandToken(value: string) {
  return value.trim().toLowerCase();
}

function commandKeyword(command: string) {
  const trimmed = command.trim();
  if (!trimmed.toLowerCase().startsWith(AGENT_COMMAND_PREFIX)) return "";
  return trimmed.slice(AGENT_COMMAND_PREFIX.length).trim();
}

export function localizeAgentCommandDefinitions(t: TranslateCommandFn): LocalizedAgentCommandDefinition[] {
  return agentCommandDefinitions.map((definition) => {
    const command = t(definition.commandKey);
    return {
      ...definition,
      command,
      keyword: commandKeyword(command),
    };
  });
}

function allLocalizedKeywords(definition: AgentCommandDefinition) {
  return LOCALES.flatMap((locale) => {
    const command = messages[locale][definition.commandKey];
    const keyword = commandKeyword(command);
    return keyword ? [keyword] : [];
  });
}

// Infer mode from the first token. The parser accepts command keywords from all
// supported locales so persisted settings and widget surfaces can submit any
// localized command form.
export function inferAgentCommandMode(message: string): RoomAgentCommandMode {
  const token = normalizeCommandToken(message.split(/\s+/)[0] ?? "");
  if (!token) return "ANSWER";

  const matched = agentCommandDefinitions.find((definition) => {
    if (definition.id === "answer") return false;
    const candidates = [...allLocalizedKeywords(definition), ...definition.aliases].map(normalizeCommandToken);
    return candidates.includes(token);
  });

  return matched?.mode ?? "ANSWER";
}

const COMMAND_TEXT_PATTERN = /^\/bubli(?:\s+([\s\S]+))?$/i;

export function parseAgentCommandText(text: string): { message: string; mode: RoomAgentCommandMode } | null {
  const match = text.trim().match(COMMAND_TEXT_PATTERN);
  if (!match) return null;

  const message = match[1]?.trim() ?? "";
  return { message, mode: message ? inferAgentCommandMode(message) : "ANSWER" };
}

export function stripAgentCommandPrefix(text: string) {
  const trimmed = text.trim();
  if (!/^\/bubli(\s|$)/i.test(trimmed)) return trimmed;
  return trimmed.replace(/^\/bubli\s*/i, "").trim();
}

export function completeAgentCommand(definition: LocalizedAgentCommandDefinition) {
  return `${definition.command} `;
}

export function getAgentCommandSuggestions(
  draft: string,
  t: TranslateCommandFn,
): LocalizedAgentCommandDefinition[] | null {
  if (draft.includes("\n")) return null;

  const value = draft.trimStart();
  if (!value.startsWith("/")) return null;

  const lower = value.toLowerCase();
  if (AGENT_COMMAND_PREFIX.startsWith(lower)) return localizeAgentCommandDefinitions(t);
  if (!lower.startsWith(AGENT_COMMAND_PREFIX)) return null;

  const rest = value.slice(AGENT_COMMAND_PREFIX.length);
  if (rest !== "" && !rest.startsWith(" ")) return null;

  const keywordPart = rest.trimStart();
  if (keywordPart.includes(" ")) return null;

  const token = normalizeCommandToken(keywordPart);
  const definitions = localizeAgentCommandDefinitions(t);
  if (token === "") return definitions;

  const filtered = definitions.filter((definition) => {
    if (definition.id === "answer") return false;
    const candidates = [definition.keyword, ...definition.aliases].filter(Boolean).map(normalizeCommandToken);
    return candidates.some((candidate) => candidate.startsWith(token));
  });

  return filtered.length > 0 ? filtered : null;
}
