import type { Locale } from "./locale";
import { commonMessages } from "./messages/common";

// 앱 전역 번역 사전. 네임스페이스별 파일(src/lib/i18n/messages/*.ts)을 합쳐서 만든다.
// - 각 네임스페이스 파일이 ko/en/ja 키 정합을 Record<Key, string>로 컴파일 단계에서 보장한다.
// - 네임스페이스 간 키 중복은 scripts/check-i18n-messages.mjs가 잡는다.
// - 없는 번역은 t()에서 ko fallback → key 순으로 대체한다.
const ko = {
  ...commonMessages.ko,
} as const;

export type MessageKey = keyof typeof ko;

const en: Record<MessageKey, string> = {
  ...commonMessages.en,
};

const ja: Record<MessageKey, string> = {
  ...commonMessages.ja,
};

export const messages: Record<Locale, Record<MessageKey, string>> = { ko, en, ja };
