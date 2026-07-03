import type { Locale } from "./locale";
import { commonMessages } from "./messages/common";
import { layoutMessages } from "./messages/layout";
import { settingsMessages } from "./messages/settings";
import { chatMessages } from "./messages/chat";
import { agentMessages } from "./messages/agent";
import { roomMessages } from "./messages/room";
import { dashboardMessages } from "./messages/dashboard";
import { calendarMessages } from "./messages/calendar";
import { widgetMessages } from "./messages/widget";
import { publicMessages } from "./messages/public";
import { folderMessages } from "./messages/folder";
import { authMessages } from "./messages/auth";
import { workMessages } from "./messages/work";
import { miscMessages } from "./messages/misc";
import { componentsMessages } from "./messages/components";
import { resourcesCoreMessages } from "./messages/resources-core";
import { resourcesDetailMessages } from "./messages/resources-detail";
import { localMessages } from "./messages/local";

// 앱 전역 번역 사전. 네임스페이스별 파일(src/lib/i18n/messages/*.ts)을 합쳐서 만든다.
// - 각 네임스페이스 파일이 ko/en/ja 키 정합을 Record<Key, string>로 컴파일 단계에서 보장한다.
// - 네임스페이스 간 키 중복은 scripts/check-i18n-messages.mjs가 잡는다.
// - 없는 번역은 t()에서 ko fallback → key 순으로 대체한다.
const ko = {
  ...commonMessages.ko,
  ...layoutMessages.ko,
  ...settingsMessages.ko,
  ...chatMessages.ko,
  ...agentMessages.ko,
  ...roomMessages.ko,
  ...dashboardMessages.ko,
  ...calendarMessages.ko,
  ...widgetMessages.ko,
  ...publicMessages.ko,
  ...folderMessages.ko,
  ...authMessages.ko,
  ...workMessages.ko,
  ...miscMessages.ko,
  ...componentsMessages.ko,
  ...resourcesCoreMessages.ko,
  ...resourcesDetailMessages.ko,
  ...localMessages.ko,
} as const;

export type MessageKey = keyof typeof ko;

const en: Record<MessageKey, string> = {
  ...commonMessages.en,
  ...layoutMessages.en,
  ...settingsMessages.en,
  ...chatMessages.en,
  ...agentMessages.en,
  ...roomMessages.en,
  ...dashboardMessages.en,
  ...calendarMessages.en,
  ...widgetMessages.en,
  ...publicMessages.en,
  ...folderMessages.en,
  ...authMessages.en,
  ...workMessages.en,
  ...miscMessages.en,
  ...componentsMessages.en,
  ...resourcesCoreMessages.en,
  ...resourcesDetailMessages.en,
  ...localMessages.en,
};

const ja: Record<MessageKey, string> = {
  ...commonMessages.ja,
  ...layoutMessages.ja,
  ...settingsMessages.ja,
  ...chatMessages.ja,
  ...agentMessages.ja,
  ...roomMessages.ja,
  ...dashboardMessages.ja,
  ...calendarMessages.ja,
  ...widgetMessages.ja,
  ...publicMessages.ja,
  ...folderMessages.ja,
  ...authMessages.ja,
  ...workMessages.ja,
  ...miscMessages.ja,
  ...componentsMessages.ja,
  ...resourcesCoreMessages.ja,
  ...resourcesDetailMessages.ja,
  ...localMessages.ja,
};

export const messages: Record<Locale, Record<MessageKey, string>> = { ko, en, ja };
